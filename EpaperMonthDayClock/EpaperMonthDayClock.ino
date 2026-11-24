// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 MANTIS — MANTIS e-Paper Calendar

/*
 * ESP32-C3 SuperMini + Waveshare 7.5" e-Paper HAT (B) (검정/흰색/빨강)
 * "월침 · 일침" 아날로그 캘린더
 *
 *  - 시침 → 월침 (12칸)   분침 → 일침 (31칸), 바늘은 모두 검정
 *  - 다이얼: 바깥 트랙 = 일 눈금, 그 안쪽 = 월 숫자
 *  - 토·일·공휴일(음력·대체공휴일 포함, holidays_kr.h) 빨강
 *  - 평소에는 deep sleep
 *  - 매일 00:00:30 에 깨어나 화면 갱신 후 다시 deep sleep
 *  - 1주일에 한 번 Wi-Fi + NTP 로 시간을 받아 내부 RTC 보정
 *    + RTC 오차율(ppm)을 학습해서 다음 1주일 동안 수면 시간/시각을 자동 보정
 *
 * 필요 라이브러리: GxEPD2 (ZinggJM), Adafruit GFX Library
 * 보드: ESP32C3 Dev Module (Arduino-ESP32 2.x / 3.x), USB CDC On Boot: Enabled
 */
#include <Arduino.h>
#include <WiFi.h>
#include <SPI.h>
#include <time.h>
#include <sys/time.h>
#include "esp_sleep.h"
#include "esp_sntp.h"
#include "esp_timer.h"
#include "driver/gpio.h"

#include <GxEPD2_3C.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>

#include "config.h"
#include "holidays_kr.h"
#include "logo_mantis.h"
#include "FreeSans14pt_digits.h"   // 월 숫자용 (18pt 의 80%)

#if DEBUG_SERIAL
  #define LOG(...)  Serial.printf(__VA_ARGS__)
#else
  #define LOG(...)
#endif

#include "wifi_config.h"      // Wi-Fi/API 키 저장값 (NVS)
#include "holiday_server.h"   // 서버 공휴일 (LOG 매크로 이후에 포함)
#include <WiFiManager.h>
#include <qrcode.h>

// ------------------------------------------------------------
// 디스플레이 (전체 프레임 버퍼: 800x480 → 흑/적 각 48KB)
// ------------------------------------------------------------
#if EPD_PANEL_V2
GxEPD2_3C<GxEPD2_750c_Z08, GxEPD2_750c_Z08::HEIGHT> display(
    GxEPD2_750c_Z08(PIN_EPD_CS, PIN_EPD_DC, PIN_EPD_RST, PIN_EPD_BUSY));
#else
GxEPD2_3C<GxEPD2_750c, GxEPD2_750c::HEIGHT> display(
    GxEPD2_750c(PIN_EPD_CS, PIN_EPD_DC, PIN_EPD_RST, PIN_EPD_BUSY));
#endif

static const uint16_t C_BLACK = GxEPD_BLACK;
static const uint16_t C_WHITE = GxEPD_WHITE;
static const uint16_t C_RED   = GxEPD_RED;

// ------------------------------------------------------------
// deep sleep 중에도 유지되는 RTC 메모리 변수
// ------------------------------------------------------------
#define RTC_MAGIC 0xCA1E0D05u
RTC_DATA_ATTR uint32_t rtcMagic       = 0;
RTC_DATA_ATTR time_t   lastSyncEpoch  = 0;    // 마지막 NTP 성공 시각 (실시간)
RTC_DATA_ATTR double   clockRatio     = 1.0;  // 실제경과 / RTC경과 (학습값)
RTC_DATA_ATTR int64_t  plannedSleepUs = 0;    // 직전 deep sleep 타이머 값
RTC_DATA_ATTR int64_t  sleepStartUs   = 0;    // 잠들기 직전 시스템 시각 (버튼 기상 보정용)
RTC_DATA_ATTR int32_t  lastDrawnYmd   = 0;    // 마지막으로 그린 날짜 YYYYMMDD
RTC_DATA_ATTR uint16_t syncFailCount  = 0;
RTC_DATA_ATTR bool     errorShown     = false;
RTC_DATA_ATTR bool     lastDrawnSyncOk = true;  // 화면에 표시된 동기화 상태

// SNTP 콜백에서 채우는 값
static volatile bool    ntpDone = false;
static volatile int64_t ntpTvUs = 0;      // NTP가 설정한 시각(us)
static volatile int64_t ntpAtTimerUs = 0; // 그때의 esp_timer 값

static const char* MONTH_NAMES[12] = {
  "JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
  "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"};
static const char* WEEKDAY_NAMES[7] = {
  "SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"};

// ============================================================
// 시간 유틸
// ============================================================
static int64_t nowUs() {
  struct timeval tv; gettimeofday(&tv, nullptr);
  return (int64_t)tv.tv_sec * 1000000LL + tv.tv_usec;
}
static void setNowUs(int64_t us) {
  struct timeval tv;
  tv.tv_sec  = (time_t)(us / 1000000LL);
  tv.tv_usec = (suseconds_t)(us % 1000000LL);
  settimeofday(&tv, nullptr);
}
static bool timeLooksValid(time_t t) { return t > 1704067200; } // 2024-01-01 이후

static int daysInMonth(int year, int month /*1..12*/) {
  static const uint8_t d[12] = {31,28,31,30,31,30,31,31,30,31,30,31};
  if (month == 2) {
    bool leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    return leap ? 29 : 28;
  }
  return d[month - 1];
}

// deep sleep 동안 RTC 저속클럭 오차를 학습된 비율로 보정
static void applySleepDriftCorrection() {
  // 타이머든 버튼이든, 잠들어 있던 시간(RTC 기준)에 학습된 오차율을 적용
  if (sleepStartUs <= 0) return;
  esp_sleep_wakeup_cause_t cause = esp_sleep_get_wakeup_cause();
  if (cause == ESP_SLEEP_WAKEUP_TIMER || cause == ESP_SLEEP_WAKEUP_GPIO) {
    int64_t slept = nowUs() - sleepStartUs;
    if (slept > 0) {
      int64_t corr = (int64_t)((clockRatio - 1.0) * (double)slept);
      if (corr != 0) setNowUs(nowUs() + corr);
      LOG("[RTC] slept %lld s, drift correction %+lld ms (ratio %.6f)\n",
          (long long)(slept / 1000000LL), (long long)(corr / 1000), clockRatio);
    }
  }
  sleepStartUs = 0;
  plannedSleepUs = 0;
}

// ============================================================
// Wi-Fi + NTP 동기화 (RTC 오차율 학습 포함)
// ============================================================
static void onNtpSync(struct timeval* tv) {
  ntpTvUs      = (int64_t)tv->tv_sec * 1000000LL + tv->tv_usec;
  ntpAtTimerUs = esp_timer_get_time();
  ntpDone      = true;
}

static bool syncTimeWithNtp() {
  // 동기화 직전의 "RTC가 믿고 있는 시각"과 고정밀 타이머 기준점
  const int64_t sysBeforeUs = nowUs();
  const int64_t t0          = esp_timer_get_time();

  LOG("[WiFi] connecting to %s\n", g_wifiSsid.c_str());
  WiFi.persistent(false);              // 매번 Flash에 쓰지 않도록
  WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);   // C3 SuperMini 안테나 이슈 완화 + 피크전류 감소
  WiFi.begin(g_wifiSsid.c_str(), g_wifiPass.c_str());
  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) delay(100);

  bool ok = false;
  if (WiFi.status() == WL_CONNECTED) {
    LOG("[WiFi] connected, IP %s\n", WiFi.localIP().toString().c_str());
    ntpDone = false;
    sntp_set_time_sync_notification_cb(onNtpSync);
    configTzTime(TZ_INFO, NTP_SERVER_1, NTP_SERVER_2, NTP_SERVER_3);
    start = millis();
    while (!ntpDone && millis() - start < NTP_TIMEOUT_MS) delay(50);
    ok = ntpDone;
#if ESP_ARDUINO_VERSION_MAJOR >= 3
    esp_sntp_stop();
#else
    sntp_stop();
#endif
  } else {
    LOG("[WiFi] connect failed\n");
  }
  // 시간 동기화 성공 + Wi-Fi 연결 중 → 한 달에 한 번 서버 공휴일 갱신
  if (ok) {
    time_t nowT = time(nullptr);
    struct tm nt; localtime_r(&nowT, &nt);
    holidaySrvFetchIfDue(nt);
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);

  if (!ok) { LOG("[NTP] failed\n"); return false; }

  // t0 시점의 실제 시각 = NTP시각 - (NTP 수신까지 흐른 시간)
  const int64_t realAtT0Us = ntpTvUs - (ntpAtTimerUs - t0);
  const double  errSec     = (double)(realAtT0Us - sysBeforeUs) / 1e6;   // +면 RTC가 늦었음

  // 이전 동기화 이후 경과로 오차율 학습
  if (lastSyncEpoch > 0 && timeLooksValid((time_t)(sysBeforeUs / 1000000LL))) {
    const double L = (double)realAtT0Us / 1e6 - (double)lastSyncEpoch; // 실제 경과
    const double S = L - errSec;                                          // 시스템이 센 경과
    if (L > 20 * 3600 && S > 0 && fabs(errSec) < 0.1 * L) {
      double r = clockRatio * (L / S);
      if (r < 0.90) r = 0.90;
      if (r > 1.10) r = 1.10;
      LOG("[RTC] err %.1f s over %.1f h → ratio %.6f → %.6f (%.0f ppm)\n",
          errSec, L / 3600.0, clockRatio, r, (r - 1.0) * 1e6);
      clockRatio = r;
    }
  }
  lastSyncEpoch = time(nullptr);
  LOG("[NTP] synced, corrected by %.2f s\n", errSec);
  return true;
}

// ============================================================
// 공휴일 / 빨간 날
// ============================================================
// 반환: 공휴일 이름 인덱스, 공휴일 아니면 -1
static int holidayIndexBuiltin(int y, int m, int d) {
  uint32_t ymd = (uint32_t)(y * 10000 + m * 100 + d);
  if (y >= HOLIDAY_TABLE_FIRST_YEAR && y <= HOLIDAY_TABLE_LAST_YEAR) {
    size_t lo = 0, hi = HOLIDAY_COUNT;
    while (lo < hi) {
      size_t mid = (lo + hi) / 2;
      if (HOLIDAYS[mid].ymd < ymd) lo = mid + 1; else hi = mid;
    }
    return (lo < HOLIDAY_COUNT && HOLIDAYS[lo].ymd == ymd) ? HOLIDAYS[lo].name : -1;
  }
  // 표 범위 밖: 양력 고정 공휴일만
  static const uint16_t FIXED[] = {101, 301, 505, 606, 815, 1003, 1009, 1225};
  static const uint8_t  NAME[]  = {0, 2, 3, 5, 6, 8, 9, 10};
  for (size_t i = 0; i < sizeof(FIXED) / sizeof(FIXED[0]); i++)
    if (FIXED[i] == m * 100 + d) return NAME[i];
  return -1;
}

#define HOLIDAY_GENERIC 100   // 서버에만 있는 공휴일(임시공휴일 등)

// 서버 데이터가 있는 연도는 서버 우선, 없으면 내장 표
static int holidayIndex(int y, int m, int d) {
  int srv = holidaySrvLookup(y, m, d);
  if (srv < 0) return holidayIndexBuiltin(y, m, d);
  if (srv == 0) return -1;
  int b = holidayIndexBuiltin(y, m, d);
  return b >= 0 ? b : HOLIDAY_GENERIC;
}

static const char* holidayName(int idx) {
  return idx == HOLIDAY_GENERIC ? "PUBLIC HOLIDAY" : HOLIDAY_NAMES[idx];
}

// 토요일·일요일·공휴일이면 빨강
static bool isRedDay(int y, int m, int d, int wday) {
  return wday == 0 || wday == 6 || holidayIndex(y, m, d) >= 0;
}

// ============================================================
// 그리기 유틸
// ============================================================
static inline float deg2rad(float d) { return d * (float)M_PI / 180.0f; }

static void polar(int cx, int cy, float r, float deg, int& x, int& y) {
  float a = deg2rad(deg);
  x = cx + (int)lroundf(r * sinf(a));
  y = cy - (int)lroundf(r * cosf(a));
}

static void drawCentered(const char* s, int x, int yCenter, const GFXfont* f,
                         uint16_t color, uint8_t size = 1) {
  display.setFont(f);
  display.setTextSize(size);
  display.setTextColor(color);
  int16_t x1, y1; uint16_t w, h;
  display.getTextBounds(s, 0, 0, &x1, &y1, &w, &h);
  display.setCursor(x - (int)w / 2 - x1, yCenter - (int)h / 2 - y1);
  display.print(s);
  display.setTextSize(1);
}

static void thickLine(int x0, int y0, int x1, int y1, int t, uint16_t c) {
  // 짧은 눈금용: 선분 양옆으로 평행선 겹쳐 그리기
  float dx = x1 - x0, dy = y1 - y0, len = sqrtf(dx * dx + dy * dy);
  if (len < 1) return;
  float nx = -dy / len, ny = dx / len;
  for (int i = 0; i < t; i++) {
    float o = i - (t - 1) / 2.0f;
    display.drawLine(x0 + lroundf(nx * o), y0 + lroundf(ny * o),
                     x1 + lroundf(nx * o), y1 + lroundf(ny * o), c);
  }
}

// 고리 모양 부채꼴(rIn~rOut, deg0~deg1) 채우기
static void fillArcSegment(int cx, int cy, int rIn, int rOut, float deg0, float deg1, uint16_t c) {
  const float step = 0.5f;
  for (float a = deg0; a < deg1; a += step) {
    float a2 = fminf(a + step, deg1);
    int x0, y0, x1, y1, x2, y2, x3, y3;
    polar(cx, cy, rIn,  a,  x0, y0);
    polar(cx, cy, rOut, a,  x1, y1);
    polar(cx, cy, rOut, a2, x2, y2);
    polar(cx, cy, rIn,  a2, x3, y3);
    display.fillTriangle(x0, y0, x1, y1, x2, y2, c);
    display.fillTriangle(x0, y0, x2, y2, x3, y3, c);
  }
}

// 가운데에서 tip 방향으로 뾰족해지는 바늘 (꼬리 포함)
static void drawHand(int cx, int cy, float deg, int len, int tail, int halfW, uint16_t c) {
  int tx, ty, bx, by, lx, ly, rx, ry;
  polar(cx, cy, len,  deg, tx, ty);           // 끝
  polar(cx, cy, tail, deg + 180, bx, by);     // 꼬리
  polar(cx, cy, halfW, deg - 90, lx, ly);     // 왼쪽 어깨
  polar(cx, cy, halfW, deg + 90, rx, ry);     // 오른쪽 어깨
  display.fillTriangle(tx, ty, lx, ly, rx, ry, c);
  display.fillTriangle(bx, by, lx, ly, rx, ry, c);
}

// ============================================================
// 캘린더 화면
// ============================================================
static void drawFace(const struct tm& t) {
  // 다이얼 (바깥 → 안쪽): 일 칸 링(31칸, 숫자 포함) → 큰 월 숫자(12칸)
  // 오늘 날짜 칸은 월 숫자처럼 반전: 검정 바탕 + 흰 숫자 (토·일·공휴일이면 빨강 바탕)
  const int CX = 240, CY = 240, R = 230;
  const int R_TRACK = R - 28;              // 일 칸 링 안쪽 경계
  const int R_DAYN  = (R + R_TRACK) / 2;   // 일 숫자 중심 반지름
  const int R_MONTH = R - 64;              // 월 숫자 중심 반지름
  const float STEP  = 360.0f / 31.0f;
  const int year  = t.tm_year + 1900;
  const int month = t.tm_mon + 1;
  const int mday  = t.tm_mday;
  const int dim   = daysInMonth(year, month);

  // ---- 일 칸 링 ----
  for (int d = 1; d <= 31; d++) {
    float a = d * STEP;
    int nx, ny;
    polar(CX, CY, R_DAYN, a, nx, ny);
    if (d > dim) {
      if (d == 31) {   // 12시 위(31일) 칸이 비는 달: MANTIS 원형 심볼
        display.drawBitmap(nx - LOGO_ICON_W / 2, ny - LOGO_ICON_H / 2, LOGO_ICON,
                           LOGO_ICON_W, LOGO_ICON_H, C_BLACK);
      } else {         // 그 밖의 빈 날짜(2월 29·30일 등): 작은 빈 점
        display.drawCircle(nx, ny, 3, C_BLACK);
      }
      continue;
    }
    int wd = ((t.tm_wday - (mday - d)) % 7 + 7) % 7;
    bool red = isRedDay(year, month, d, wd);
    char buf[3]; snprintf(buf, sizeof buf, "%d", d);
    if (d == mday) {
      fillArcSegment(CX, CY, R_TRACK, R, a - STEP / 2, a + STEP / 2, red ? C_RED : C_BLACK);
      drawCentered(buf, nx, ny, &FreeSansBold9pt7b, C_WHITE);
    } else {
      drawCentered(buf, nx, ny, &FreeSans9pt7b, red ? C_RED : C_BLACK);
    }
  }
  // 칸 구분선 + 테두리 (모두 검정)
  for (int d = 0; d < 31; d++) {
    int x0, y0, x1, y1;
    float a = (d + 0.5f) * STEP;
    polar(CX, CY, R_TRACK, a, x0, y0);
    polar(CX, CY, R,       a, x1, y1);
    display.drawLine(x0, y0, x1, y1, C_BLACK);
  }
  for (int i = 0; i < 2; i++) display.drawCircle(CX, CY, R - i, C_BLACK);
  display.drawCircle(CX, CY, R_TRACK, C_BLACK);

  // ---- 월 숫자 (12칸) ----
  for (int m = 1; m <= 12; m++) {
    int px, py;
    polar(CX, CY, R_MONTH, m * 30.0f, px, py);
    char buf[3]; snprintf(buf, sizeof buf, "%d", m);
#if MONTH_INVERT_CURRENT
    if (m == month) {   // 이번 달 반전 (검정 원 + 흰 숫자)
      display.fillCircle(px, py, 20, C_BLACK);
      drawCentered(buf, px, py, &FreeSans14pt_digits, C_WHITE);
      continue;
    }
#endif
    drawCentered(buf, px, py, &FreeSans14pt_digits, C_BLACK);
  }

  // ---- 바늘 (모두 검정) ----
#if MONTH_HAND_SMOOTH
  float monthDeg = (month + (mday - 1) / (float)dim) * 30.0f;
#else
  float monthDeg = month * 30.0f;
#endif
  float dayDeg = mday * STEP;

  drawHand(CX, CY, monthDeg, R_MONTH - 25, 20, 8, C_BLACK);  // 월침: 짧고 굵게 → 월 숫자
  drawHand(CX, CY, dayDeg,   R_TRACK - 3,  20, 8, C_BLACK);  // 일침: 월침과 같은 폭, 길게 → 일 칸 링 바로 앞
  display.fillCircle(CX, CY, 9, C_BLACK);
  display.fillCircle(CX, CY, 3, C_WHITE);
}

static void drawSidePanel(const struct tm& t, bool lastSyncOk) {
  const int X0 = 505, X1 = 790, XC = (X0 + X1) / 2;
  const int year  = t.tm_year + 1900;
  const int month = t.tm_mon + 1;
  const int mday  = t.tm_mday;
  const int hol   = holidayIndex(year, month, mday);
  const bool red  = isRedDay(year, month, mday, t.tm_wday);
  char buf[48];

  snprintf(buf, sizeof buf, "%d", year);
  drawCentered(buf, XC, 70, &FreeSansBold18pt7b, C_BLACK);
  drawCentered(MONTH_NAMES[month - 1], XC, 120, &FreeSansBold12pt7b, C_BLACK);
  display.fillRect(X0 + 40, 148, X1 - X0 - 80, 2, C_BLACK);

  snprintf(buf, sizeof buf, "%d", mday);
  drawCentered(buf, XC, 235, &FreeSansBold24pt7b, red ? C_RED : C_BLACK, 3);

  display.fillRect(X0 + 40, 318, X1 - X0 - 80, 2, C_BLACK);
  drawCentered(WEEKDAY_NAMES[t.tm_wday], XC, 352, &FreeSansBold12pt7b, red ? C_RED : C_BLACK);
  if (hol >= 0) drawCentered(holidayName(hol), XC, 388, &FreeSansBold9pt7b, C_RED);

  // ---- 브랜드: 요일 아래 작게 ----
  // 한 줄: "Designed by" (기본 5x7 폰트) + 로고
  const char* cap = "Designed by";
  const int capW = 6 * (int)strlen(cap) - 1, gap = 5;
  const int brandX0 = XC - (capW + gap + LOGO_MANTIS_W) / 2;   // 아래 SYNC 줄도 이 x에서 시작
  {
    const int x0 = brandX0, yMid = 430;
    display.setFont(nullptr);
    display.setTextSize(1);
    display.setTextColor(C_BLACK);
    display.setCursor(x0, yMid - 4);
    display.print(cap);
    display.drawBitmap(x0 + capW + gap, yMid - LOGO_MANTIS_H / 2, LOGO_MANTIS,
                       LOGO_MANTIS_W, LOGO_MANTIS_H, C_BLACK);
  }

  // ---- 동기화 상태: "Designed by" 아래, 같은 시작점 ----
  display.setFont(nullptr);
  display.setTextSize(1);
  display.setTextColor(lastSyncOk ? C_BLACK : C_RED);
  struct tm ls; time_t lse = lastSyncEpoch; localtime_r(&lse, &ls);
  if (lastSyncOk)
    snprintf(buf, sizeof buf, "SYNC on %02d/%02d  rtc %+.0fppm",
             ls.tm_mon + 1, ls.tm_mday, (clockRatio - 1.0) * 1e6);
  else
    snprintf(buf, sizeof buf, "SYNC FAILED x%u (last %02d/%02d)",
             syncFailCount, ls.tm_mon + 1, ls.tm_mday);
  display.setCursor(brandX0, 446);   // "Designed by" 와 같은 시작점
  display.print(buf);
  if (!lastSyncOk) {                  // 재설정 방법 안내
    display.setCursor(brandX0, 458);
    display.print("Hold button 3 s: Wi-Fi setup");
  }
}

// ============================================================
// 디스플레이 전원 / 초기화
// ============================================================
static void epdPower(bool on) {
#if PIN_EPD_PWR >= 0
  gpio_hold_dis((gpio_num_t)PIN_EPD_PWR);
  pinMode(PIN_EPD_PWR, OUTPUT);
  digitalWrite(PIN_EPD_PWR, on ? HIGH : LOW);
  if (on) delay(10);
#endif
}

static void epdBegin() {
  epdPower(true);
  SPI.begin(PIN_EPD_SCK, -1, PIN_EPD_MOSI, PIN_EPD_CS);
  display.epd2.selectSPI(SPI, SPISettings(4000000, MSBFIRST, SPI_MODE0));
  // Waveshare HAT은 리셋 펄스를 짧게(2ms) 주는 것이 권장됨
  display.init(DEBUG_SERIAL ? 115200 : 0, true, 2, false);
  display.setRotation(0);
}

static void epdEnd() {
  display.hibernate();   // 패널 deep sleep
  SPI.end();
  // HAT 전원을 끄기 전에 신호선을 high-Z(입력)로 풀어 둔다.
  // CS·RST 등이 HIGH로 남아 있으면 신호선을 통해 꺼진 HAT으로 전류가 새어 들어간다.
  const int sig[] = {PIN_EPD_SCK, PIN_EPD_MOSI, PIN_EPD_CS, PIN_EPD_DC, PIN_EPD_RST, PIN_EPD_BUSY};
  for (int p : sig) pinMode(p, INPUT);
  epdPower(false);
}

static void renderCalendar(const struct tm& t, bool lastSyncOk) {
  epdBegin();
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(C_WHITE);
    drawFace(t);
    drawSidePanel(t, lastSyncOk);
  } while (display.nextPage());
  epdEnd();
}

// 제목 + 안내 2줄 + 로고만 있는 단순 안내 화면
static void renderNotice(const char* title, const char* l1, const char* l2) {
  epdBegin();
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(C_WHITE);
    const int XC = display.width() / 2;
    drawCentered(title, XC, 180, &FreeSansBold18pt7b, C_RED);
    drawCentered(l1, XC, 240, &FreeSansBold12pt7b, C_BLACK);
    drawCentered(l2, XC, 275, &FreeSansBold12pt7b, C_BLACK);
    display.drawBitmap(XC - LOGO_MANTIS_W / 2, display.height() - 40, LOGO_MANTIS,
                       LOGO_MANTIS_W, LOGO_MANTIS_H, C_BLACK);
  } while (display.nextPage());
  epdEnd();
}

// ============================================================
// Wi-Fi 설정 모드 (스마트폰 + QR 코드)
// ============================================================
static void drawQr(const char* text, int cx, int cy, int scale) {
  QRCode qr;
  uint8_t buf[qrcode_getBufferSize(4)];
  qrcode_initText(&qr, buf, 4, ECC_MEDIUM, text);     // 버전 4 = 33x33 모듈
  const int sz = qr.size * scale, x0 = cx - sz / 2, y0 = cy - sz / 2;
  display.fillRect(x0 - 4 * scale, y0 - 4 * scale, sz + 8 * scale, sz + 8 * scale, C_WHITE); // quiet zone
  for (uint8_t y = 0; y < qr.size; y++)
    for (uint8_t x = 0; x < qr.size; x++)
      if (qrcode_getModule(&qr, x, y)) display.fillRect(x0 + x * scale, y0 + y * scale, scale, scale, C_BLACK);
}

static void renderSetupScreen(const String& ap, const String& pw) {
  String qrText = "WIFI:T:WPA;S:" + ap + ";P:" + pw + ";;";   // 휴대폰 카메라용 Wi-Fi QR 형식
  epdBegin();
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(C_WHITE);
    // 왼쪽: QR + 접속 정보
    drawQr(qrText.c_str(), 200, 205, 9);
    display.drawRect(32, 37, 336, 336, C_BLACK);
    drawCentered(ap.c_str(), 200, 410, &FreeSansBold12pt7b, C_BLACK);
    String pwLine = "PW  " + pw;
    drawCentered(pwLine.c_str(), 200, 444, &FreeSansBold12pt7b, C_BLACK);
    // 오른쪽: 안내문
    const int X = 410;
    display.setFont(&FreeSansBold18pt7b);
    display.setTextColor(C_RED);
    display.setCursor(X, 62);
    display.print("Wi-Fi Setup");

    static const char* const STEPS[4][2] = {
      {"Scan the QR code with your phone",   "camera to join the setup Wi-Fi."},
      {"The setup page opens automatically.", "If not, open 192.168.4.1 in a browser."},
      {"Tap [Configure WiFi], pick your Wi-Fi,", "enter the password and tap [Save]."},
      {"The calendar appears once connected.", ""},
    };
    int y = 112;
    for (int i = 0; i < 4; i++) {
      char num[4]; snprintf(num, sizeof num, "%d.", i + 1);
      display.setFont(&FreeSansBold12pt7b);
      display.setTextColor(C_BLACK);
      display.setCursor(X, y);
      display.print(num);
      display.setFont(&FreeSans9pt7b);
      display.setCursor(X + 28, y - 2);
      display.print(STEPS[i][0]);
      if (STEPS[i][1][0]) {
        display.setCursor(X + 28, y + 20);
        display.print(STEPS[i][1]);
      }
      y += 62;
    }

    display.fillRect(X, 372, 370, 1, C_BLACK);
    display.setFont(nullptr);
    display.setTextSize(1);
    display.setTextColor(C_BLACK);
    display.setCursor(X, 384); display.print("No input for 10 minutes -> power saving mode.");
    display.setCursor(X, 398); display.print("To set up again: hold the side button");
    display.setCursor(X, 412); display.print("for 3 seconds.");
    display.drawBitmap(800 - 20 - LOGO_MANTIS_W, 458, LOGO_MANTIS, LOGO_MANTIS_W, LOGO_MANTIS_H, C_BLACK);
  } while (display.nextPage());
  epdEnd();
}

// 설정 포털 실행. 성공(공유기 접속 + 저장)하면 true
static bool runSetupPortal() {
  const String ap = setupApName(), pw = setupApPass();
  LOG("[SETUP] portal %s / %s\n", ap.c_str(), pw.c_str());
  renderSetupScreen(ap, pw);

  WiFiManager wm;
  wm.setDebugOutput(DEBUG_SERIAL);
  wm.setTitle("MANTIS Calendar");
  wm.setConfigPortalTimeout(SETUP_PORTAL_TIMEOUT_SEC);
  wm.setConnectTimeout(20);
  wm.setCaptivePortalEnable(true);
  std::vector<const char*> menu = {"wifi", "exit"};
  wm.setMenu(menu);
  WiFiManagerParameter pKey("apikey", "Holiday API key (optional, data.go.kr encoding key)",
                            g_apiKey.c_str(), 200);
  wm.addParameter(&pKey);

  bool ok = wm.startConfigPortal(ap.c_str(), pw.c_str());
  if (ok && WiFi.status() == WL_CONNECTED) {
    cfgSave(WiFi.SSID(), WiFi.psk(), String(pKey.getValue()));
    LOG("[SETUP] saved SSID %s\n", WiFi.SSID().c_str());
  } else {
    ok = false;
    LOG("[SETUP] timeout / cancelled\n");
  }
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  return ok;
}

// RESET 직후 3초 안에 BOOT 버튼을 1초간 누르면 true (온보드 LED가 켜진 동안 대기)
static bool bootButtonRequested() {
  pinMode(PIN_BOOT_BTN, INPUT_PULLUP);
#if PIN_LED >= 0
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LED_ACTIVE_LOW ? LOW : HIGH);
#endif
  bool req = false;
  uint32_t start = millis(), pressedAt = 0;
  while (millis() - start < 3000 || pressedAt) {
    if (digitalRead(PIN_BOOT_BTN) == LOW) {
      if (!pressedAt) pressedAt = millis();
      if (millis() - pressedAt >= 1000) { req = true; break; }
    } else {
      pressedAt = 0;
    }
    delay(20);
  }
#if PIN_LED >= 0
  digitalWrite(PIN_LED, LED_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_LED, INPUT);
#endif
  return req;
}

// 사용자 버튼(GPIO5)으로 깨어났을 때: 3초 이상 누르고 있으면 true (= Wi-Fi 설정)
static bool userButtonLongPress() {
  pinMode(PIN_USER_BTN, INPUT_PULLUP);
  uint32_t start = millis();
  while (digitalRead(PIN_USER_BTN) == LOW) {
    if (millis() - start >= USER_BTN_LONG_MS) return true;
    delay(20);
  }
  return false;
}

// 잠들기 전 공통 처리: 버튼에서 손을 뗄 때까지 기다리고, 버튼 기상 + 패널 전원 OFF 유지 설정
static void prepareDeepSleep() {
#if PIN_USER_BTN >= 0
  pinMode(PIN_USER_BTN, INPUT_PULLUP);
  uint32_t t0 = millis();
  while (digitalRead(PIN_USER_BTN) == LOW && millis() - t0 < 10000) delay(20);
  esp_deep_sleep_enable_gpio_wakeup(1ULL << PIN_USER_BTN, ESP_GPIO_WAKEUP_GPIO_LOW);
#endif
#if DEBUG_SERIAL
  Serial.flush();
#endif
#if PIN_EPD_PWR >= 0
  gpio_hold_en((gpio_num_t)PIN_EPD_PWR);   // sleep 중 패널 전원 OFF 유지
  gpio_deep_sleep_hold_en();
#endif
  sleepStartUs = nowUs();
}

// ============================================================
// Deep sleep
// ============================================================
static void deepSleepRealSeconds(double realSec) {
  if (realSec < 5) realSec = 5;
  // RTC가 느리면(ratio>1) 타이머를 덜 걸어야 실제로 realSec 만큼 잔다
  plannedSleepUs = (int64_t)(realSec * 1e6 / clockRatio);
  LOG("[SLEEP] %.0f s real (timer %lld s)\n", realSec, (long long)(plannedSleepUs / 1000000LL));
  prepareDeepSleep();
  esp_sleep_enable_timer_wakeup((uint64_t)plannedSleepUs);
  esp_deep_sleep_start();
}

// 타이머 없이 잠듦 → 사용자 버튼 또는 RESET 으로만 깨어남
static void deepSleepForever() {
  plannedSleepUs = 0;
  LOG("[SLEEP] forever (button / RESET to wake)\n");
  prepareDeepSleep();
  esp_deep_sleep_start();
}

static void sleepUntilNextMidnight(const struct tm& today) {
  struct tm n = today;
  n.tm_mday += 1;
  n.tm_hour = 0; n.tm_min = 0; n.tm_sec = WAKE_MARGIN_SEC;
  n.tm_isdst = -1;
  time_t target = mktime(&n);
  double sec = (double)target - (double)nowUs() / 1e6;
  deepSleepRealSeconds(sec);
}

// ============================================================
// main
// ============================================================
void setup() {
#if DEBUG_SERIAL
  Serial.begin(115200);
  delay(200);
#endif
  const bool coldBoot = (esp_reset_reason() != ESP_RST_DEEPSLEEP) || (rtcMagic != RTC_MAGIC);
  if (coldBoot) {
    rtcMagic = RTC_MAGIC;
    lastSyncEpoch = 0; clockRatio = 1.0; plannedSleepUs = 0; sleepStartUs = 0;
    lastDrawnYmd = 0; syncFailCount = 0; errorShown = false; lastDrawnSyncOk = true;
    LOG("\n[BOOT] cold boot\n");
  } else {
    LOG("\n[BOOT] wake from deep sleep\n");
    applySleepDriftCorrection();
  }

  // ---- 0) Wi-Fi 설정 확인 ----
  cfgLoad();
  const bool buttonWake = (esp_sleep_get_wakeup_cause() == ESP_SLEEP_WAKEUP_GPIO);
  bool wantSetup = !cfgHaveWifi();                       // 저장된 Wi-Fi 없음 → 설정 모드
  bool manualRefresh = false;
  if (!wantSetup && buttonWake) {                        // 사용자 버튼: 3초 = 설정, 짧게 = 새로고침
    wantSetup = userButtonLongPress();
    manualRefresh = !wantSetup;
    LOG("[BTN] %s\n", wantSetup ? "long press -> Wi-Fi setup" : "short press -> sync + refresh");
  }
  if (!wantSetup && esp_reset_reason() != ESP_RST_DEEPSLEEP)
    wantSetup = bootButtonRequested();                   // 예비: RESET 후 BOOT 버튼 → 재설정
  if (wantSetup) {
    if (!runSetupPortal()) {
      renderNotice("Setup timed out", "Sleeping to save power.",
                   "Hold the side button for 3 s to set up Wi-Fi again.");
      deepSleepForever();
    }
    lastSyncEpoch = 0;                                   // 바로 시간 동기화
    lastDrawnYmd = 0;
  }

  holidaySrvLoad();   // NVS에 저장된 서버 공휴일 불러오기
  setenv("TZ", TZ_INFO, 1);
  tzset();

  // ---- 1) 필요하면 NTP 동기화 (최초 / 7일 경과 / 지난번 실패) ----
  time_t now = time(nullptr);
  bool haveTime = timeLooksValid(now) && lastSyncEpoch > 0;
  bool syncDue  = !haveTime || manualRefresh || (now - lastSyncEpoch >= (time_t)SYNC_INTERVAL_SEC);
  bool lastSyncOk = (syncFailCount == 0);

  if (syncDue) {
    if (syncTimeWithNtp()) { syncFailCount = 0; lastSyncOk = true; }
    else                   { syncFailCount++;   lastSyncOk = false; }
    now = time(nullptr);
    haveTime = timeLooksValid(now) && lastSyncEpoch > 0;
  }

  // ---- 2) 시간을 한 번도 못 얻었으면 안내 화면 후 재시도 ----
  if (!haveTime) {
    if (!errorShown) {
      renderNotice("Wi-Fi / time sync failed", "Retrying every 30 minutes.",
                   "To change Wi-Fi: hold the side button for 3 s.");
      errorShown = true;
    }
    deepSleepRealSeconds(FIRST_SYNC_RETRY_SEC);
  }
  errorShown = false;

  // ---- 3) 날짜가 바뀌었으면 화면 갱신 ----
  struct tm t;
  localtime_r(&now, &t);
  int32_t ymd = (t.tm_year + 1900) * 10000 + (t.tm_mon + 1) * 100 + t.tm_mday;
  LOG("[TIME] %04d-%02d-%02d %02d:%02d:%02d\n",
      t.tm_year + 1900, t.tm_mon + 1, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec);

  // 날짜가 바뀌었거나, 동기화 성공/실패 표시가 바뀌었을 때만 갱신 (3색 패널 1회 ≈ 20초)
  if (ymd != lastDrawnYmd || lastSyncOk != lastDrawnSyncOk || manualRefresh) {
    renderCalendar(t, lastSyncOk);
    lastDrawnYmd = ymd;
    lastDrawnSyncOk = lastSyncOk;
  } else {
    LOG("[EPD] same date (early wake) - skip refresh\n");
  }

  // ---- 4) 다음 자정까지 deep sleep ----
  // 자정 직전(23:59:xx)에 일찍 깼다면 남은 수십 초만 더 잔다.
  sleepUntilNextMidnight(t);
}

void loop() {
  // 도달하지 않음
}
