// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 MANTIS — MANTIS e-Paper Calendar

#pragma once
// ============================================================
//  서버(한국천문연구원 특일 정보 API)에서 공휴일을 받아 NVS에 저장
//
//  - 매주 NTP 동기화로 Wi-Fi가 켜져 있을 때, 달이 바뀌었으면 1회 실행
//  - 올해 + 내년 공휴일(isHoliday=Y)을 받아 Flash(NVS)에 저장 → 배터리를 빼도 유지
//  - 서버 데이터가 있는 연도는 서버가 우선, 없는 연도는 내장 표(holidays_kr.h) 사용
//  - 임시공휴일·선거일처럼 미리 알 수 없는 날을 반영하기 위한 기능
//
//  필요: 공공데이터포털(data.go.kr) "한국천문연구원_특일 정보" 활용신청 → 인증키
//        Wi-Fi 설정 화면에서 입력하거나 config.h 의 HOLIDAY_API_KEY 에 "인코딩(Encoding)" 키. 비워 두면 기능 꺼짐.
// ============================================================
#include <algorithm>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>

#define HSRV_MAX_DATES 64
#define HSRV_ENDPOINT  "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"

static uint32_t hsrvDates[HSRV_MAX_DATES];   // YYYYMMDD, 정렬됨
static uint8_t  hsrvCount = 0;
static uint16_t hsrvYears[2] = {0, 0};       // 서버 데이터가 있는 연도 (0 = 없음)
static uint32_t hsrvFetchedYm = 0;           // 마지막으로 받아온 YYYYMM

// NVS → RAM (매 기상 시 호출, 수 ms)
static void holidaySrvLoad() {
  Preferences p;
  if (!p.begin("holiday", true)) return;
  hsrvYears[0]  = p.getUShort("y0", 0);
  hsrvYears[1]  = p.getUShort("y1", 0);
  hsrvFetchedYm = p.getUInt("ym", 0);
  size_t n = p.getBytesLength("dates");
  if (n % 4 == 0 && n / 4 <= HSRV_MAX_DATES) {
    p.getBytes("dates", hsrvDates, n);
    hsrvCount = n / 4;
  }
  p.end();
}

// 반환: -1 = 서버 데이터 없는 연도, 0 = 평일, 1 = 공휴일
static int holidaySrvLookup(int y, int m, int d) {
  if (y != hsrvYears[0] && y != hsrvYears[1]) return -1;
  uint32_t ymd = (uint32_t)(y * 10000 + m * 100 + d);
  for (uint8_t i = 0; i < hsrvCount; i++)
    if (hsrvDates[i] == ymd) return 1;
  return 0;
}

// 한 해치 요청. 성공하면 true 와 함께 out[] 에 날짜 추가
static bool holidaySrvFetchYear(int year, uint32_t* out, uint8_t& count, int& itemsFound) {
  itemsFound = 0;
  String url = String(HSRV_ENDPOINT) + "?serviceKey=" + g_apiKey +
               "&solYear=" + year + "&numOfRows=100&_type=json";
  HTTPClient http;
  http.setTimeout(8000);
  if (!http.begin(url)) return false;
  int code = http.GET();
  if (code != 200) { LOG("[HOL] %d HTTP %d\n", year, code); http.end(); return false; }
  String body = http.getString();
  http.end();

  JsonDocument doc;
  if (deserializeJson(doc, body)) { LOG("[HOL] %d JSON parse error\n", year); return false; }
  const char* rc = doc["response"]["header"]["resultCode"] | "";
  if (strcmp(rc, "00") != 0) { LOG("[HOL] %d resultCode %s\n", year, rc); return false; }

  // items 는 없으면 "", 1건이면 객체, 여러 건이면 배열로 온다
  JsonVariant item = doc["response"]["body"]["items"]["item"];
  auto take = [&](JsonVariant it) {
    const char* hol = it["isHoliday"] | "N";
    uint32_t ymd = it["locdate"] | 0;
    if (strcmp(hol, "Y") == 0 && ymd && count < HSRV_MAX_DATES) { out[count++] = ymd; itemsFound++; }
  };
  if (item.is<JsonArray>()) for (JsonVariant it : item.as<JsonArray>()) take(it);
  else if (item.is<JsonObject>()) take(item);
  LOG("[HOL] %d: %d holidays\n", year, itemsFound);
  return true;
}

// Wi-Fi 연결된 상태에서 호출. 이번 달에 이미 받았으면 아무것도 안 함
static void holidaySrvFetchIfDue(const struct tm& now) {
  if (g_apiKey.isEmpty()) return;
  const int year = now.tm_year + 1900;
  const uint32_t ym = year * 100 + now.tm_mon + 1;
  if (ym == hsrvFetchedYm) return;

  uint32_t dates[HSRV_MAX_DATES];
  uint8_t count = 0;
  uint16_t years[2] = {0, 0};
  int found;
  // 올해: 실패하면 기존 저장값 유지
  if (!holidaySrvFetchYear(year, dates, count, found) || found == 0) return;
  years[0] = year;
  // 내년: 보통 연중에 발표되므로 0건이면 내장 표로 대체
  if (holidaySrvFetchYear(year + 1, dates, count, found) && found > 0) years[1] = year + 1;

  std::sort(dates, dates + count);
  Preferences p;
  if (!p.begin("holiday", false)) return;
  p.putBytes("dates", dates, count * 4);
  p.putUShort("y0", years[0]);
  p.putUShort("y1", years[1]);
  p.putUInt("ym", ym);
  p.end();

  memcpy(hsrvDates, dates, count * 4);
  hsrvCount = count;
  hsrvYears[0] = years[0]; hsrvYears[1] = years[1];
  hsrvFetchedYm = ym;
  LOG("[HOL] saved %u dates (%u, %u)\n", count, years[0], years[1]);
}
