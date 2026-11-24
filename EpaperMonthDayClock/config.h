// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 MANTIS — MANTIS e-Paper Calendar

#pragma once
// ============================================================
//  사용자 설정
// ============================================================

// ---- Wi-Fi (2.4 GHz 전용, ESP32-C3는 5 GHz 미지원) ----
// 비워 두면 처음 켤 때 화면에 QR 코드가 뜨고 스마트폰으로 설정한다 (권장).
// 여기에 적으면 스마트폰 설정값이 없을 때의 기본값으로 쓰인다.
#define WIFI_SSID      ""
#define WIFI_PASS      ""

// ---- Wi-Fi 설정 모드 ----
#define SETUP_PORTAL_TIMEOUT_SEC  600   // 10분 동안 설정 없으면 절전
#define PIN_USER_BTN   5                // 사용자 버튼 (GPIO5 ─ 스위치 ─ GND, 1MΩ 풀업). -1 = 없음
                                        //   짧게: 시간 동기화 + 화면 갱신 / 3초: Wi-Fi 설정
#define USER_BTN_LONG_MS 3000
#define PIN_BOOT_BTN   9                // 예비: RESET 후 3초 안에 BOOT 1초 → Wi-Fi 설정
#define PIN_LED        8                // SuperMini 온보드 LED (-1 = 사용 안 함)
#define LED_ACTIVE_LOW 1

// ---- 시간대 / NTP ----
#define TZ_INFO        "KST-9"            // 한국 표준시 (UTC+9, 서머타임 없음)
// 상용 제품: pool.ntp.org 계열은 기본값으로 쓰지 말 것 (NTP Pool 벤더 정책)
#define NTP_SERVER_1   "time.google.com"
#define NTP_SERVER_2   "time.cloudflare.com"
#define NTP_SERVER_3   "time.windows.com"

// ---- 서버 공휴일 (선택) ----
// 공공데이터포털 "한국천문연구원_특일 정보" 활용신청 후 받은 "인코딩(Encoding)" 인증키.
// Wi-Fi 설정 화면에서도 입력할 수 있다. 둘 다 비면 내장 공휴일 표(holidays_kr.h)만 사용.
#define HOLIDAY_API_KEY ""

// ---- 동작 주기 ----
#define SYNC_INTERVAL_SEC   (7UL * 24UL * 3600UL)  // NTP 동기화 주기: 1주일
#define WAKE_MARGIN_SEC     30                     // 00:00:30 에 깨어남 (자정 직전 조기 기상 방지 여유)
#define FIRST_SYNC_RETRY_SEC (30UL * 60UL)         // 최초 시간 확보 실패 시 재시도 간격
#define WIFI_TIMEOUT_MS     15000
#define NTP_TIMEOUT_MS      15000

// ---- 패널 선택 ----
// 1 : 7.5inch e-Paper HAT (B) V2/V3  800x480  (현재 판매품, GxEPD2_750c_Z08)
// 0 : 7.5inch e-Paper HAT (B) V1     640x384  (구형, GxEPD2_750c)
#define EPD_PANEL_V2   1

// ---- 배선 (ESP32-C3 SuperMini → Waveshare HAT) ----
//  HAT 핀   SuperMini
//  VCC   -> 3V3
//  GND   -> GND
//  DIN   -> GPIO6   (MOSI)
//  CLK   -> GPIO4   (SCK)
//  CS    -> GPIO7
//  DC    -> GPIO1
//  RST   -> GPIO10
//  BUSY  -> GPIO3
//  PWR   -> GPIO0   (HAT Rev2.2 이상에만 있는 핀. 없으면 -1 로)
//  [버튼] GPIO5 ─ 스위치 ─ GND,  GPIO5 ─ 1MΩ ─ 3V3 (deep sleep 기상은 GPIO0~5만 가능)
// 피한 핀: GPIO2/8/9 (부트 스트래핑), GPIO8(온보드 LED), GPIO20/21(UART)
#define PIN_EPD_SCK    4
#define PIN_EPD_MOSI   6
#define PIN_EPD_CS     7
#define PIN_EPD_DC     1
#define PIN_EPD_RST    10
#define PIN_EPD_BUSY   3
#define PIN_EPD_PWR    0      // -1 = 사용 안 함

// ---- 시계면 옵션 ----
// 다이얼: 바깥 트랙 = 일 눈금(31칸), 안쪽 = 월 숫자(12칸). 일 각도 day*360/31 → 31일이 맨 위.
// 월침 각도: 해당 월 숫자에 고정 (12월이 맨 위).
#define MONTH_INVERT_CURRENT 0   // 1: 이번 달 숫자를 검정 원으로 반전 표시
#define MONTH_HAND_SMOOTH 0   // 0: 월침을 해당 월 숫자에 고정 (1이면 날짜 진행에 따라 다음 달 쪽으로 이동)

// 시리얼 로그
#define DEBUG_SERIAL   1
