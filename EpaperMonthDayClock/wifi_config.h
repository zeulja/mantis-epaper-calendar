// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2026 MANTIS — MANTIS e-Paper Calendar

#pragma once
// ============================================================
//  Wi-Fi / API 키 설정값 보관 (Flash NVS, 배터리를 빼도 유지)
//
//  - 스마트폰 설정 화면(WiFiManager)에서 입력한 값을 "cfg" 네임스페이스에 저장
//  - config.h 의 WIFI_SSID / HOLIDAY_API_KEY 는 NVS 값이 없을 때만 쓰는 기본값
// ============================================================
#include <Preferences.h>

static String g_wifiSsid, g_wifiPass, g_apiKey;

static void cfgLoad() {
  Preferences p;
  if (p.begin("cfg", true)) {
    g_wifiSsid = p.getString("ssid", "");
    g_wifiPass = p.getString("pass", "");
    g_apiKey   = p.getString("apikey", "");
    p.end();
  }
  if (g_wifiSsid.isEmpty() && strlen(WIFI_SSID) > 0) { g_wifiSsid = WIFI_SSID; g_wifiPass = WIFI_PASS; }
  if (g_apiKey.isEmpty()) g_apiKey = HOLIDAY_API_KEY;
}

static void cfgSave(const String& ssid, const String& pass, const String& apiKey) {
  Preferences p;
  if (!p.begin("cfg", false)) return;
  p.putString("ssid", ssid);
  p.putString("pass", pass);
  p.putString("apikey", apiKey);
  p.end();
  g_wifiSsid = ssid; g_wifiPass = pass; g_apiKey = apiKey;
}

static bool cfgHaveWifi() { return g_wifiSsid.length() > 0; }

// 기기마다 다른 설정용 AP 이름/비밀번호 (MAC 주소 기반, 항상 같은 값)
static String setupApName() {
  uint64_t mac = ESP.getEfuseMac();
  char buf[24];
  snprintf(buf, sizeof buf, "MANTIS-CAL-%02X%02X",
           (uint8_t)(mac >> 32), (uint8_t)(mac >> 40));
  return String(buf);
}

static String setupApPass() {
  // 헷갈리는 글자(0/O, 1/l/I) 제외
  static const char CH[] = "abcdefghjkmnpqrstuvwxyz23456789";
  uint64_t x = ESP.getEfuseMac() * 0x9E3779B97F4A7C15ULL;
  String s;
  for (int i = 0; i < 8; i++) { x ^= x >> 29; x *= 0xBF58476D1CE4E5B9ULL; s += CH[(x >> 33) % (sizeof(CH) - 1)]; }
  return s;
}
