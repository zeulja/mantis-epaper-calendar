// 제작 가이드 PPT 생성. 사용: npm install pptxgenjs && node tools/make_deck.js  (프로젝트 루트에서)
const pptxgen = require("pptxgenjs");
const path = require("path");
// 테마 색을 PPT 테마에 기록하는 보조 스크립트(선택). 없으면 기본 테마 색으로 저장됩니다.
let applyTheme = async () => {};
try { if (process.env.PPTX_SKILL) ({ applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js")); } catch (e) {}

const ROOT = path.resolve(__dirname, "..");
const P = (f) => path.join(ROOT, f);
const OUT = P("docs/MANTIS_ePaper_Calendar_Guide.pptx");

const THEME = {
  name: "MANTIS ePaper",
  headFontFace: "Malgun Gothic",
  bodyFontFace: "Malgun Gothic",
  colors: {
    dk1: "1E2530", lt1: "FFFFFF", dk2: "003060", lt2: "F2F4F7",
    accent1: "C8102E", accent2: "003060", accent3: "6B7785",
    accent4: "2E8B57", accent5: "E08A1E", accent6: "7A4FB5",
    hlink: "003060", folHlink: "6B7785",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "MANTIS 월침·일침 e-Paper 캘린더 제작 가이드";
pres.author = "MANTIS";
const C = pres.SchemeColor;

// ---------------- Layouts ----------------
pres.defineSlideMaster({
  title: "TITLE",
  background: { color: C.text2 },
  objects: [],
  placeholders: [],
});
pres.defineSlideMaster({
  title: "SECTION",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.9, w: 11.7, h: 1.1, fontSize: 40, bold: true, color: C.background1, align: "left", valign: "middle" }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.0, w: 11.7, h: 0.8, fontSize: 18, color: C.background2, align: "left", valign: "top" }, text: "" } },
  ],
});
// title placeholder re-declared via objects (pptxgenjs needs it in objects)
pres.defineSlideMaster({
  title: "CONTENT_T",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.6, 0.5],
  objects: [
    { text: { text: "MANTIS · 월침·일침 e-Paper 캘린더 제작 가이드", options: { x: 0.5, y: 7.02, w: 8, h: 0.3, fontSize: 10, color: C.accent3, margin: 0 } } },
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.35, w: 12.3, h: 0.8, fontSize: 32, bold: true, color: C.text2, align: "left", valign: "middle", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 12.33, y: 7.02, w: 0.5, h: 0.3, fontSize: 10, color: C.accent3, align: "right" },
});

// ---------------- helpers ----------------
let shapeId = 0;
const nm = (s) => `${s}_${++shapeId}`;
function content(title, section) {
  const s = pres.addSlide({ masterName: "CONTENT_T", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}
function txt(s, text, o) {
  s.addText(text, Object.assign({ isTextBox: true, fontSize: 14, color: C.text1, margin: 0, valign: "top", objectName: nm("text") }, o));
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || C.background2 }, line: { color: fill || C.background2 }, objectName: nm("card") });
}
function badge(s, x, y, label, color) {
  s.addShape(pres.shapes.OVAL, { x, y, w: 0.46, h: 0.46, fill: { color: color || C.accent2 }, line: { color: color || C.accent2 }, objectName: nm("badge") });
  s.addText(label, { isTextBox: true, x, y, w: 0.46, h: 0.46, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, objectName: nm("badgeText") });
}
function table(s, rows, o) {
  const head = rows[0].map((t) => ({ text: t, options: { bold: true, color: C.background1, fill: { color: C.text2 } } }));
  const body = rows.slice(1).map((r, i) => r.map((t) => ({ text: t, options: { fill: { color: i % 2 ? C.background1 : C.background2 } } })));
  s.addTable([head, ...body], Object.assign({ fontSize: 12, color: C.text1, border: { type: "solid", pt: 0.5, color: "D5DAE1" }, margin: [0.05, 0.1, 0.05, 0.1], valign: "middle", objectName: nm("table") }, o));
}
function imgFit(s, file, x, y, maxW, maxH, pw, ph, alt) {
  const r = Math.min(maxW / pw, maxH / ph);
  const w = pw * r, h = ph * r;
  s.addImage({ path: P(file), x: x + (maxW - w) / 2, y: y + (maxH - h) / 2, w, h, altText: alt, objectName: nm("image") });
}

// ---------------- flowchart helpers (PowerPoint 도형으로 그려서 직접 편집 가능) ----------------
const FC = {
  term: { shape: "FLOWCHART_TERMINATOR", fill: "003060", line: "003060", color: "FFFFFF" },
  proc: { shape: "ROUNDED_RECTANGLE", fill: "F2F4F7", line: "6B7785", color: "1E2530" },
  dec:  { shape: "FLOWCHART_DECISION", fill: "FFFFFF", line: "003060", color: "003060" },
  alert:{ shape: "ROUNDED_RECTANGLE", fill: "FDECEC", line: "C8102E", color: "C8102E" },
  ok:   { shape: "ROUNDED_RECTANGLE", fill: "E8F4EC", line: "2E8B57", color: "1E2530" },
  conn: { shape: "OVAL", fill: "6B7785", line: "6B7785", color: "FFFFFF" },
};
function fnode(s, kind, x, y, w, h, text, fs) {
  const k = FC[kind];
  const o = { shape: pres.shapes[k.shape], x, y, w, h, fill: { color: k.fill }, line: { color: k.line, width: kind === "dec" ? 1.5 : 1 },
    fontSize: fs || 11, color: k.color, bold: kind === "term" || kind === "dec" || kind === "conn", align: "center", valign: "middle", margin: 2, objectName: nm("fc_" + kind) };
  if (k.shape === "ROUNDED_RECTANGLE") o.rectRadius = 0.08;
  s.addText(text, o);
}
function seg(s, x1, y1, x2, y2, arrow) {
  const line = { color: "6B7785", width: 1.25 };
  if (arrow) line.endArrowType = "triangle";
  s.addShape(pres.shapes.LINE, { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1, line, objectName: nm("edge") });
}
function fpath(s, pts, arrow = true) {
  for (let i = 0; i < pts.length - 1; i++) seg(s, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], arrow && i === pts.length - 2);
}
function elabel(s, x, y, text, w) {
  s.addText(text, { isTextBox: true, x, y, w: w || 0.7, h: 0.25, fontSize: 10, color: C.accent3, margin: 0, align: "left", valign: "middle", objectName: nm("edgeLabel") });
}

// =========================================================
// 1. 표지
// =========================================================
pres.addSection({ title: "개요" });
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "개요" });
  s.addImage({ path: P("docs/images/mantis_logo_white.png"), x: 0.8, y: 0.7, w: 2.0, h: 0.4, altText: "MANTIS 로고", objectName: nm("logo") });
  txt(s, "월침·일침", { x: 0.8, y: 2.0, w: 6.0, h: 0.9, fontSize: 44, bold: true, color: C.background1, fontFace: THEME.headFontFace });
  txt(s, "e-Paper 캘린더", { x: 0.8, y: 2.85, w: 6.0, h: 0.9, fontSize: 44, bold: true, color: C.background1, fontFace: THEME.headFontFace });
  txt(s, "제작 가이드 · 기술 자료", { x: 0.8, y: 3.95, w: 6.0, h: 0.5, fontSize: 22, color: C.background2 });
  txt(s, "ESP32-C3 SuperMini + Waveshare 7.5\" e-Paper HAT (B)\n펌웨어 v1.0 · 2026-11-21", { x: 0.8, y: 5.6, w: 6.0, h: 0.8, fontSize: 14, color: C.background2 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.95, y: 1.55, w: 5.75, h: 3.65, rectRadius: 0.06, fill: { color: C.background1 }, line: { color: C.background1 }, objectName: nm("frame") });
  s.addImage({ path: P("docs/images/preview_2026-11-21.png"), x: 7.05, y: 1.65, w: 5.55, h: 3.33, altText: "캘린더 화면 미리보기 (2026-11-21)", objectName: nm("preview") });
  txt(s, "화면 미리보기 (PC 근사 렌더링)", { x: 6.95, y: 5.35, w: 5.75, h: 0.3, fontSize: 11, color: C.background2, align: "right" });
}

// =========================================================
// 2. 개요 · 화면 구성
// =========================================================
{
  const s = content("시계처럼 읽는 달력", "개요");
  imgFit(s, "docs/images/preview_2026-11-21.png", 0.5, 1.45, 7.2, 4.4, 800, 480, "캘린더 화면 구성");
  const items = [
    ["1", "일 칸 링 (바깥)", "31칸에 일 숫자. 오늘 칸은 반전, 빨간 날이면 빨강 바탕"],
    ["2", "월 숫자 + 월침", "시침 자리에 1~12월. 월침은 해당 월에 고정"],
    ["3", "일침", "분침 자리. 31칸 중 오늘 날짜를 가리킴"],
    ["4", "빨간 날", "토·일·공휴일(음력·대체공휴일 포함)은 빨간 숫자"],
    ["5", "오른쪽 패널", "연도·월·큰 날짜·요일·공휴일 이름·동기화 상태"],
  ];
  items.forEach((it, i) => {
    const y = 1.5 + i * 0.9;
    badge(s, 8.1, y, it[0], i === 3 ? C.accent1 : C.accent2);
    txt(s, it[1], { x: 8.75, y: y - 0.02, w: 4.1, h: 0.35, fontSize: 15, bold: true });
    txt(s, it[2], { x: 8.75, y: y + 0.33, w: 4.1, h: 0.5, fontSize: 12, color: C.accent3 });
  });
  txt(s, "12시 위 31일 칸이 비는 달(30일 달·2월)에는 MANTIS 원형 심볼이 표시됩니다.", { x: 0.5, y: 6.1, w: 7.2, h: 0.4, fontSize: 12, color: C.accent3 });
}

// =========================================================
// 3. 장치 스펙
// =========================================================
{
  const s = content("장치 스펙", "개요");
  table(s, [
    ["항목", "사양"],
    ["MCU", "ESP32-C3 (RISC-V 160 MHz, Wi-Fi 4 / BLE 5), 4 MB Flash — SuperMini 22.5 × 18 mm"],
    ["디스플레이", "Waveshare 7.5\" e-Paper HAT (B) V2/V3 · 800 × 480 · 검정/흰색/빨강"],
    ["표시 영역 / 패널 외형", "163.2 × 97.92 mm / 170.2 × 111.2 × 1.2 mm"],
    ["화면 갱신", "하루 1회 전체 갱신 (공식 26 s, 라이브러리 설정 약 18 s)"],
    ["시간 유지", "deep sleep + 내부 RTC, 주 1회 NTP 동기화 + RTC 오차율 학습 보정"],
    ["공휴일", "내장 표 2026~2040 + 월 1회 한국천문연구원 특일 API 갱신(선택)"],
    ["입력", "사이드 버튼 1개 (GPIO5): 짧게 = 동기화·갱신, 3초 = Wi-Fi 설정"],
    ["전원", "18650 Li-ion 1셀 + TP4056 충전/보호 모듈 (USB-C 충전)"],
    ["예상 배터리 수명", "약 2년 내외 (3000 mAh, 대기 전류 50 µA 이하 기준)"],
    ["외형 (개념 설계)", "196 × 136 × 30 mm, 3D 프린팅 (PETG/PLA)"],
  ], { x: 0.5, y: 1.45, w: 12.3, colW: [2.6, 9.7], rowH: 0.42, fontSize: 13 });
}

// =========================================================
// 4. 동작 방식
// =========================================================
{
  const s = content("하루 대부분은 잠들어 있습니다", "개요");
  const steps = [
    ["00:00:30", "타이머 기상", "RTC 오차 보정 후\n날짜 확인"],
    ["+1 s", "필요 시 동기화", "7일 경과 시 Wi-Fi\nNTP + 공휴일(월 1회)"],
    ["+2~27 s", "화면 갱신", "날짜가 바뀌었을 때만\n3색 전체 갱신"],
    ["~24 h", "deep sleep", "다음 자정까지\n패널 전원도 차단"],
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i * 3.15;
    card(s, x, 1.55, 2.85, 2.6);
    txt(s, st[0], { x: x + 0.25, y: 1.75, w: 2.4, h: 0.45, fontSize: 20, bold: true, color: i === 3 ? C.accent3 : C.accent1 });
    txt(s, st[1], { x: x + 0.25, y: 2.3, w: 2.4, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    txt(s, st[2], { x: x + 0.25, y: 2.8, w: 2.4, h: 1.1, fontSize: 13, color: C.text1 });
    if (i < 3) s.addShape(pres.shapes.RIGHT_ARROW, { x: x + 2.88, y: 2.7, w: 0.24, h: 0.3, fill: { color: C.accent3 }, line: { color: C.accent3 }, objectName: nm("arrow") });
  });
  txt(s, "깨어나는 다른 경우", { x: 0.5, y: 4.55, w: 6, h: 0.4, fontSize: 18, bold: true, color: C.text2 });
  const other = [
    ["버튼 짧게", "즉시 시간 동기화 + 화면 갱신 (수동 새로고침)"],
    ["버튼 3초", "Wi-Fi 설정 모드 — 화면에 QR 코드 표시, 10분 후 자동 절전"],
    ["자정 직전 조기 기상", "23:59:xx에 깨면 화면은 그대로, 남은 몇십 초만 더 잠"],
    ["첫 시간 확보 실패", "안내 화면 표시 후 30분마다 재시도"],
  ];
  other.forEach((o, i) => {
    txt(s, o[0], { x: 0.5, y: 5.05 + i * 0.42, w: 2.6, h: 0.38, fontSize: 13, bold: true });
    txt(s, o[1], { x: 3.1, y: 5.05 + i * 0.42, w: 9.7, h: 0.38, fontSize: 13 });
  });
}

// =========================================================
// 하드웨어
// =========================================================
pres.addSection({ title: "하드웨어" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "하드웨어" });
  s.addText("하드웨어", { placeholder: "title" });
  s.addText("부품 · 배선 · 전원 · 배터리 수명", { placeholder: "body" });
}
{
  const s = content("부품 목록 (BOM)", "하드웨어");
  table(s, [
    ["#", "부품", "규격 / 비고", "수량"],
    ["1", "ESP32-C3 SuperMini", "USB-C, 22.5 × 18 mm · 빨간 전원 LED 제거", "1"],
    ["2", "Waveshare 7.5\" e-Paper HAT (B)", "800×480 3색, 드라이버 HAT 65 × 30.2 mm, 9핀 케이블(PWR 포함)", "1"],
    ["3", "18650 Li-ion 셀", "보호회로 없는 셀이면 4번 모듈의 보호 기능 필수", "1"],
    ["4", "TP4056 충전 모듈", "USB-C, DW01 보호회로 포함형 (B+/B−/OUT+/OUT−)", "1"],
    ["5", "18650 배터리 홀더", "1셀, 약 77 × 21 × 19 mm", "1"],
    ["6", "슬라이드 스위치", "SS12D00 등 소형 SPDT (전원 ON/OFF)", "1"],
    ["7", "택트 스위치", "측면 버튼, 6×6 mm 또는 12×12 mm", "1"],
    ["8", "저항 1 MΩ", "버튼 풀업 (GPIO5 → 3V3)", "1"],
    ["9", "전해 커패시터 470 µF / 6.3 V 이상", "5V–GND, Wi-Fi 순간 전류 대비", "1"],
    ["10", "세라믹 커패시터 100 nF", "버튼 디바운스 (선택)", "1"],
    ["11", "케이스 / M2.5 나사·인서트", "3D 프린팅, M2.5 × 6 나사 4개 + 열압입 인서트 4개", "1식"],
  ], { x: 0.5, y: 1.45, w: 12.3, colW: [0.5, 3.6, 7.3, 0.9], rowH: 0.4, fontSize: 12 });
}
{
  const s = content("배선도", "하드웨어");
  imgFit(s, "docs/images/wiring.png", 0.5, 1.3, 12.3, 5.6, 1800, 980, "ESP32-C3 SuperMini, e-Paper HAT, 버튼, 전원부 배선도");
}
{
  const s = content("핀 연결표", "하드웨어");
  table(s, [
    ["SuperMini", "연결 대상", "용도"],
    ["3V3", "HAT VCC · 1 MΩ 풀업", "패널 전원 (3.3 V)"],
    ["GND", "HAT GND · 버튼 · 충전 모듈 OUT−", "공통 접지"],
    ["5V", "전원 스위치 → 충전 모듈 OUT+", "배터리 입력 (보드 LDO)"],
    ["GPIO6", "HAT DIN", "SPI MOSI"],
    ["GPIO4", "HAT CLK", "SPI SCK"],
    ["GPIO7", "HAT CS", "칩 선택"],
    ["GPIO1", "HAT DC", "데이터/명령"],
    ["GPIO10", "HAT RST", "리셋"],
    ["GPIO3", "HAT BUSY", "갱신 중 신호"],
    ["GPIO0", "HAT PWR", "패널 전원 ON/OFF"],
    ["GPIO5", "버튼 → GND", "기상 · 새로고침 · Wi-Fi 설정"],
  ], { x: 0.5, y: 1.45, w: 7.6, colW: [1.5, 3.5, 2.6], rowH: 0.4, fontSize: 12 });
  card(s, 8.5, 1.45, 4.3, 4.8);
  txt(s, "핀을 이렇게 고른 이유", { x: 8.8, y: 1.7, w: 3.8, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
  txt(s, [
    { text: "GPIO2·8·9는 부팅 스트래핑 핀이라 사용하지 않음", options: { bullet: true, breakLine: true } },
    { text: "GPIO8은 온보드 LED, GPIO20·21은 UART", options: { bullet: true, breakLine: true } },
    { text: "deep sleep 기상은 GPIO0~5만 가능 → 버튼은 GPIO5", options: { bullet: true, breakLine: true } },
    { text: "HAT 뒷면 Interface Config 스위치 = 0 (4-line SPI)", options: { bullet: true } },
  ], { x: 8.8, y: 2.25, w: 3.8, h: 3.6, fontSize: 13, paraSpaceAfter: 10 });
}
{
  const s = content("전원 설계와 주의 사항", "하드웨어");
  const cards = [
    ["전원 경로", "18650 → TP4056(충전·보호) → 슬라이드 스위치 → SuperMini 5V 핀 → 보드 LDO 3.3 V → ESP32 · HAT", C.accent2],
    ["3V3 직결 금지", "만충 4.2 V는 ESP32-C3 최대 3.6 V를 넘습니다. 배터리는 반드시 5V 핀(LDO 입력)으로", C.accent1],
    ["USB 업로드 시", "SuperMini USB와 배터리가 동시에 5V에 물리지 않도록 전원 스위치 OFF 후 연결", C.accent1],
    ["대기 전류 줄이기", "SuperMini 빨간 전원 LED 제거, HAT PWR 핀으로 패널 전원 차단, 신호선은 잠들기 전 입력 상태로", C.accent4],
    ["순간 전류 대비", "Wi-Fi 접속 시 수백 mA → 5V–GND에 470 µF. 배터리 3.4 V 근처에서 리셋 방지", C.accent5],
    ["저온", "3색 패널은 0 ℃ 이하에서 갱신 불량, 배터리 용량도 감소 — 실내 사용 권장", C.accent3],
  ];
  cards.forEach((c, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.5 + col * 4.15, y = 1.5 + row * 2.6;
    card(s, x, y, 3.85, 2.3);
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: y + 0.28, w: 0.3, h: 0.3, fill: { color: c[2] }, line: { color: c[2] }, objectName: nm("dot") });
    txt(s, c[0], { x: x + 0.7, y: y + 0.22, w: 3.0, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    txt(s, c[1], { x: x + 0.25, y: y + 0.8, w: 3.4, h: 1.4, fontSize: 13 });
  });
}
{
  const s = content("배터리 수명은 대기 전류가 결정합니다", "하드웨어");
  s.addChart(pres.charts.BAR, [{ name: "예상 수명(년)", labels: ["30 µA", "50 µA", "100 µA", "300 µA"], values: [2.6, 2.2, 1.6, 0.7] }], {
    x: 0.5, y: 1.45, w: 7.4, h: 4.9, barDir: "col",
    chartColors: [HEX.dk2], showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"년\"",
    dataLabelFontFace: "+mn-lt", dataLabelFontSize: 14, dataLabelColor: HEX.dk1,
    showTitle: true, title: "deep sleep 대기 전류별 예상 사용 기간 (18650 3000 mAh)", titleFontFace: "+mn-lt", titleFontSize: 14, titleColor: HEX.dk1,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", catAxisLabelColor: HEX.accent3, valAxisLabelColor: HEX.accent3,
    catAxisLabelFontSize: 13, valAxisLabelFontSize: 11, valAxisMinVal: 0, valAxisMaxVal: 3,
    valGridLine: { color: "E3E7EC", size: 0.5 }, catGridLine: { style: "none" }, showLegend: false,
    objectName: nm("chart"), altText: "대기 전류 30/50/100/300 µA에서 각각 약 2.6/2.2/1.6/0.7년",
  });
  txt(s, "하루 소모 (추정)", { x: 8.4, y: 1.5, w: 4.4, h: 0.4, fontSize: 18, bold: true, color: C.text2 });
  table(s, [
    ["항목", "mAh/일"],
    ["화면 갱신 (40 mA × 25 s)", "0.28"],
    ["주 1회 Wi-Fi (100 mA × 5 s)", "0.02"],
    ["배터리 자연방전 (월 1~2%)", "약 1.5"],
    ["deep sleep 50 µA × 24 h", "1.2"],
  ], { x: 8.4, y: 2.0, w: 4.4, colW: [3.2, 1.2], rowH: 0.4, fontSize: 12 });
  txt(s, "실사용 용량 2400 mAh(80%) 기준 계산입니다. 전원 LED를 그대로 두면 대기 1~3 mA로 1~3개월에 그칩니다. 멀티미터 µA 레인지로 deep sleep 전류를 꼭 측정하세요.", { x: 8.4, y: 4.3, w: 4.4, h: 1.6, fontSize: 12, color: C.accent3 });
}

// =========================================================
// 기구
// =========================================================
pres.addSection({ title: "기구 설계" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "기구 설계" });
  s.addText("외곽 기구 설계", { placeholder: "title" });
  s.addText("배터리 홀더 배치 · 정면 · 단면 (개념 설계, 실측 후 확정)", { placeholder: "body" });
}
{
  const s = content("정면과 내부 배치", "기구 설계");
  imgFit(s, "docs/images/enclosure_views.png", 0.5, 1.3, 12.3, 5.2, 1800, 900, "케이스 정면도와 뒤판을 뗀 내부 부품 배치도");
  txt(s, "18650 홀더는 패널 뒤 위쪽에 가로로, USB 포트 두 개(충전·업로드)와 전원 스위치는 아래쪽 벽에 모읍니다.", { x: 0.5, y: 6.45, w: 12.3, h: 0.4, fontSize: 13, color: C.accent3 });
}
{
  const s = content("단면 구조와 설계 메모", "기구 설계");
  imgFit(s, "docs/images/enclosure_section.png", 0.5, 1.3, 12.3, 5.5, 1800, 760, "케이스 측면 단면도와 설계 메모");
}

// =========================================================
// 소프트웨어
// =========================================================
pres.addSection({ title: "소프트웨어" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "소프트웨어" });
  s.addText("소프트웨어", { placeholder: "title" });
  s.addText("파일 구성 · 설정 · Wi-Fi 설정 화면", { placeholder: "body" });
}
{
  const s = content("프로젝트 파일 트리", "소프트웨어");
  card(s, 0.5, 1.4, 5.9, 5.4, C.text1);
  const tree = [
    "moonclock/",
    "├─ EpaperMonthDayClock/   펌웨어",
    "│  ├─ EpaperMonthDayClock.ino",
    "│  ├─ config.h",
    "│  ├─ wifi_config.h",
    "│  ├─ holiday_server.h",
    "│  ├─ holidays_kr.h",
    "│  ├─ logo_mantis.h",
    "│  └─ FreeSans14pt_digits.h",
    "├─ tools/                 PC용 스크립트",
    "│  ├─ gen_holidays.py",
    "│  ├─ make_gfx_font.py",
    "│  ├─ preview.py / preview_setup.py",
    "│  ├─ make_diagrams.py",
    "│  └─ make_deck.js",
    "├─ assets/   로고 원본·변환본",
    "├─ docs/     도면·이 문서",
    "├─ LICENSE · THIRD_PARTY_NOTICES.md",
    "├─ platformio.ini",
    "└─ README.md",
  ].join("\n");
  txt(s, tree, { x: 0.75, y: 1.6, w: 5.5, h: 5.0, fontSize: 12, fontFace: "Courier New", color: C.background1 });
  table(s, [
    ["파일", "역할"],
    ["EpaperMonthDayClock.ino", "메인: 기상·보정, NTP, 공휴일 판정, 화면, 버튼, 절전"],
    ["config.h", "사용자 설정 (핀, 주기, 패널, 옵션). 직접 고치는 유일한 파일"],
    ["wifi_config.h", "Wi-Fi·API 키를 Flash(NVS)에 저장, 설정용 AP 이름·비밀번호"],
    ["holiday_server.h", "특일 API에서 올해·내년 공휴일 받아 NVS 저장"],
    ["holidays_kr.h", "내장 공휴일 표 2026~2040 (자동 생성)"],
    ["logo_mantis.h", "로고 56×10, 원형 심볼 20×20 비트맵"],
    ["FreeSans14pt_digits.h", "월 숫자 글꼴 (18pt의 80%, 자동 생성)"],
    ["tools/*", "공휴일 표·글꼴·미리보기·도면·이 PPT 생성"],
  ], { x: 6.7, y: 1.4, w: 6.1, colW: [2.3, 3.8], rowH: 0.5, fontSize: 11 });
}
{
  const s = content("주요 설정 (config.h)", "소프트웨어");
  table(s, [
    ["설정", "기본값", "설명"],
    ["WIFI_SSID / WIFI_PASS", "\"\"", "비워 두면 첫 실행 때 스마트폰으로 설정 (권장)"],
    ["HOLIDAY_API_KEY", "\"\"", "공휴일 API 키 기본값. 설정 화면에서도 입력 가능"],
    ["SYNC_INTERVAL_SEC", "7일", "NTP 동기화 주기"],
    ["WAKE_MARGIN_SEC", "30", "매일 00:00:30에 기상"],
    ["SETUP_PORTAL_TIMEOUT_SEC", "600", "설정 모드 대기 10분 후 절전"],
    ["PIN_USER_BTN / USER_BTN_LONG_MS", "5 / 3000", "사이드 버튼 핀, 길게 누름 기준 (ms)"],
    ["PIN_EPD_*", "4,6,7,1,10,3,0", "SCK, MOSI, CS, DC, RST, BUSY, PWR"],
    ["EPD_PANEL_V2", "1", "1 = 800×480 (V2/V3), 0 = 구형 640×384"],
    ["MONTH_HAND_SMOOTH", "0", "0 = 월침을 해당 월에 고정"],
    ["MONTH_INVERT_CURRENT", "0", "1 = 이번 달 숫자 반전 표시"],
    ["DEBUG_SERIAL", "1", "시리얼 로그. 실제 사용 시 0 권장"],
  ], { x: 0.5, y: 1.45, w: 12.3, colW: [3.9, 1.9, 6.5], rowH: 0.42, fontSize: 12 });
}
{
  const s = content("Wi-Fi 설정은 스마트폰으로", "소프트웨어");
  s.addShape(pres.shapes.RECTANGLE, { x: 0.5, y: 1.45, w: 6.9, h: 4.14, fill: { color: C.background1 }, line: { color: "D5DAE1", width: 1 }, objectName: nm("frame") });
  s.addImage({ path: P("docs/images/preview_setup.png"), x: 0.55, y: 1.5, w: 6.8, h: 4.08, altText: "Wi-Fi 설정 화면: QR 코드와 영문 안내", objectName: nm("setup") });
  txt(s, "설정 화면 (영문 안내)", { x: 0.5, y: 5.7, w: 6.9, h: 0.3, fontSize: 11, color: C.accent3 });
  const st = [
    "처음 켜거나 버튼을 3초 누르면 QR 코드 화면이 뜹니다",
    "휴대폰 카메라로 QR을 찍으면 설정용 Wi-Fi(MANTIS-CAL-xxxx)에 바로 접속",
    "설정 페이지에서 [Configure WiFi] → 집 Wi-Fi 선택·비밀번호 → [Save]",
    "성공하면 Flash에 저장, 바로 시간 동기화 후 캘린더 표시",
  ];
  st.forEach((t, i) => {
    badge(s, 7.8, 1.5 + i * 1.0, String(i + 1));
    txt(s, t, { x: 8.45, y: 1.5 + i * 1.0, w: 4.4, h: 0.85, fontSize: 14, valign: "top" });
  });
  txt(s, "설정용 Wi-Fi 이름·비밀번호는 기기 MAC 주소로 만들어 기기마다 다릅니다. 브라우저에서 192.168.4.1로도 접속할 수 있습니다.", { x: 7.8, y: 5.55, w: 5.0, h: 0.9, fontSize: 12, color: C.accent3 });
}

// =========================================================
// 제작·업로드
// =========================================================
// =========================================================
// 소스 코드 구조
// =========================================================
pres.addSection({ title: "소스 코드 구조" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "소스 코드 구조" });
  s.addText("소스 코드 구조", { placeholder: "title" });
  s.addText("모듈 구성 · 동작 흐름도 · 주요 함수 · 수정 가이드", { placeholder: "body" });
}
// ---- 모듈 구성 ----
{
  const s = content("소스 모듈 구성", "소스 코드 구조");
  // config.h
  fnode(s, "ok", 4.6, 1.45, 4.1, 0.75, "config.h\n사용자 설정 (핀 · 주기 · 옵션)", 12);
  seg(s, 6.65, 2.2, 6.65, 2.45, false);
  // main
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.6, y: 2.45, w: 4.1, h: 2.7, rectRadius: 0.08, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: nm("main") });
  txt(s, "EpaperMonthDayClock.ino", { x: 4.8, y: 2.6, w: 3.7, h: 0.4, fontSize: 15, bold: true, color: C.background1, align: "center" });
  txt(s, [
    { text: "setup(): 깨어날 때마다 전체 흐름", options: { bullet: true, breakLine: true } },
    { text: "시간: RTC 보정 · NTP 동기화", options: { bullet: true, breakLine: true } },
    { text: "화면: 시계면 · 오른쪽 패널 · 설정 화면", options: { bullet: true, breakLine: true } },
    { text: "전원: 버튼 · deep sleep", options: { bullet: true } },
  ], { x: 4.85, y: 3.1, w: 3.7, h: 1.9, fontSize: 12, color: C.background1, paraSpaceAfter: 4 });
  // left: own modules
  txt(s, "직접 만든 모듈", { x: 0.6, y: 2.05, w: 3.4, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
  const mods = [
    ["wifi_config.h", "Wi-Fi · API 키 NVS 저장, 설정용 AP 이름"],
    ["holiday_server.h", "공휴일 API 받기 (월 1회) → NVS"],
    ["holidays_kr.h", "내장 공휴일 표 2026~2040 (자동 생성)"],
  ];
  mods.forEach((m, i) => {
    const y = 2.45 + i * 0.95;
    card(s, 0.6, y, 3.4, 0.8);
    txt(s, m[0], { x: 0.75, y: y + 0.08, w: 3.1, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
    txt(s, m[1], { x: 0.75, y: y + 0.4, w: 3.1, h: 0.32, fontSize: 11 });
    seg(s, 4.0, y + 0.4, 4.6, y + 0.4, false);
  });
  // bottom: resources
  fnode(s, "proc", 4.6, 5.4, 4.1, 0.5, "logo_mantis.h · FreeSans14pt_digits.h  (그림 · 글꼴)", 11);
  seg(s, 6.65, 5.15, 6.65, 5.4, false);
  // right: external libraries
  txt(s, "외부 라이브러리", { x: 9.1, y: 2.05, w: 3.7, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
  const libs = [
    ["GxEPD2 + Adafruit GFX", "e-Paper 그리기"],
    ["WiFiManager + QRCode", "스마트폰 Wi-Fi 설정"],
    ["HTTPClient + ArduinoJson", "공휴일 API"],
    ["ESP-IDF (esp32 코어)", "deep sleep · SNTP · NVS"],
  ];
  libs.forEach((l, i) => {
    const y = 2.45 + i * 0.7;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 9.1, y, w: 3.7, h: 0.6, rectRadius: 0.08, fill: { color: C.background1 }, line: { color: C.accent3, width: 1, dashType: "dash" }, objectName: nm("lib") });
    txt(s, l[0], { x: 9.25, y: y + 0.05, w: 3.4, h: 0.27, fontSize: 12, bold: true });
    txt(s, l[1], { x: 9.25, y: y + 0.31, w: 3.4, h: 0.25, fontSize: 11, color: C.accent3 });
    seg(s, 8.7, y + 0.3, 9.1, y + 0.3, false);
  });
  card(s, 0.6, 6.1, 12.2, 0.55);
  txt(s, "tools/ (PC에서 실행): gen_holidays.py → holidays_kr.h  ·  make_gfx_font.py → FreeSans14pt_digits.h  ·  preview.py / preview_setup.py → 화면 미리보기", { x: 0.8, y: 6.15, w: 11.8, h: 0.45, fontSize: 12, valign: "middle" });
}
// ---- setup() 전체 흐름 ----
{
  const s = content("전체 흐름: setup()은 깨어날 때마다 처음부터 실행", "소스 코드 구조");
  // 왼쪽 열
  fnode(s, "term", 0.6, 1.4, 2.8, 0.6, "깨어남\n타이머 · 버튼 · RESET", 11);
  seg(s, 2.0, 2.0, 2.0, 2.25, true);
  fnode(s, "proc", 0.6, 2.25, 2.8, 0.8, "부팅 처리\n콜드 부트면 RTC 변수 초기화\n아니면 잠든 시간 오차 보정", 11);
  seg(s, 2.0, 3.05, 2.0, 3.3, true);
  fnode(s, "dec", 0.6, 3.3, 2.8, 1.0, "Wi-Fi 설정\n필요?", 12);
  seg(s, 3.4, 3.8, 3.95, 3.8, true); elabel(s, 3.45, 3.5, "예");
  fnode(s, "proc", 3.95, 3.4, 2.35, 0.8, "설정 포털 (QR)\nrunSetupPortal()\n10분 초과 시 무기한 절전", 10);
  fpath(s, [[5.125, 4.2], [5.125, 5.1], [3.4, 5.1]]);
  seg(s, 2.0, 4.3, 2.0, 4.75, true); elabel(s, 2.1, 4.4, "아니오");
  fnode(s, "proc", 0.6, 4.75, 2.8, 0.7, "저장된 공휴일 불러오기\n시간대(KST) 설정", 11);
  seg(s, 2.0, 5.45, 2.0, 5.8, true);
  fnode(s, "conn", 1.775, 5.8, 0.45, 0.45, "A", 12);
  txt(s, "오른쪽 A로 이어짐", { x: 2.35, y: 5.9, w: 2.0, h: 0.25, fontSize: 10, color: C.accent3 });
  // 오른쪽 열
  fnode(s, "conn", 8.075, 1.35, 0.45, 0.45, "A", 12);
  seg(s, 8.3, 1.8, 8.3, 2.0, true);
  fnode(s, "dec", 6.9, 2.0, 2.8, 1.0, "동기화\n필요?", 12);
  seg(s, 9.7, 2.5, 10.25, 2.5, true); elabel(s, 9.75, 2.2, "예");
  fnode(s, "proc", 10.25, 2.0, 2.55, 1.0, "Wi-Fi + NTP 동기화\n조건: 처음 · 7일 경과 · 버튼\nsyncTimeWithNtp()", 10);
  fpath(s, [[11.525, 3.0], [11.525, 3.22], [8.3, 3.22]], false);
  s.addShape(pres.shapes.OVAL, { x: 8.25, y: 3.17, w: 0.1, h: 0.1, fill: { color: C.accent3 }, line: { color: C.accent3 }, objectName: nm("junction") });
  seg(s, 8.3, 3.0, 8.3, 3.45, true); elabel(s, 8.4, 3.0, "아니오");
  fnode(s, "dec", 6.9, 3.45, 2.8, 1.0, "시간\n확보됨?", 12);
  seg(s, 9.7, 3.95, 10.25, 3.95, true); elabel(s, 9.75, 3.65, "아니오");
  fnode(s, "alert", 10.25, 3.6, 2.55, 0.7, "안내 화면 표시\n30분 후 재시도 (절전)", 10);
  seg(s, 8.3, 4.45, 8.3, 4.75, true); elabel(s, 8.4, 4.45, "예");
  fnode(s, "dec", 6.9, 4.75, 2.8, 1.0, "다시 그릴\n필요?", 12);
  seg(s, 9.7, 5.25, 10.25, 5.25, true); elabel(s, 9.75, 4.95, "예");
  fnode(s, "proc", 10.25, 4.8, 2.55, 0.9, "화면 갱신 (~20초)\n조건: 날짜·상태 변경, 버튼\nrenderCalendar()", 10);
  fpath(s, [[11.525, 5.7], [11.525, 6.325], [9.7, 6.325]]);
  seg(s, 8.3, 5.75, 8.3, 6.1, true); elabel(s, 8.4, 5.78, "아니오");
  fnode(s, "term", 6.9, 6.1, 2.8, 0.45, "다음 00:00:30까지 deep sleep", 11);
  s.addNotes("setup() 한 번이 곧 하루 동작 한 번입니다. loop()는 쓰지 않으며, 매번 deep sleep에서 깨어나 처음부터 다시 실행됩니다. 깨어나는 이유(타이머/버튼/RESET)는 esp_sleep_get_wakeup_cause()와 esp_reset_reason()으로 구분합니다.");
}
// ---- Wi-Fi 설정 진입 ----
{
  const s = content("Wi-Fi 설정 모드로 들어가는 경로", "소스 코드 구조");
  fnode(s, "dec", 0.6, 1.4, 3.0, 0.9, "저장된 Wi-Fi\n없음?", 12);
  fpath(s, [[3.6, 1.85], [7.4, 1.85], [7.9, 1.85]]); elabel(s, 3.7, 1.55, "예 (처음 켬)", 1.4);
  seg(s, 2.1, 2.3, 2.1, 2.6, true); elabel(s, 2.2, 2.3, "아니오");
  fnode(s, "dec", 0.6, 2.6, 3.0, 0.9, "RESET 직후\nBOOT 1초?", 12);
  seg(s, 3.6, 3.05, 7.4, 3.05, false); elabel(s, 3.7, 2.75, "예 (예비 방법)", 1.6);
  seg(s, 2.1, 3.5, 2.1, 3.8, true); elabel(s, 2.2, 3.5, "아니오");
  fnode(s, "dec", 0.6, 3.8, 3.0, 0.9, "버튼(GPIO5)으로\n깨어남?", 11);
  seg(s, 3.6, 4.25, 3.9, 4.25, true);
  elabel(s, 3.62, 3.95, "예", 0.3);
  fnode(s, "dec", 3.9, 3.8, 2.6, 0.9, "3초 이상\n누름?", 12);
  seg(s, 6.5, 4.25, 7.4, 4.25, false); elabel(s, 6.6, 3.95, "예");
  seg(s, 7.4, 4.25, 7.4, 1.85, false);
  seg(s, 5.2, 4.7, 5.2, 5.0, true); elabel(s, 5.3, 4.7, "아니오");
  fnode(s, "proc", 3.9, 5.0, 2.6, 0.6, "수동 새로고침\n(바로 동기화 + 갱신)", 11);
  seg(s, 5.2, 5.6, 5.2, 5.95, true);
  seg(s, 2.1, 4.7, 2.1, 5.95, true); elabel(s, 2.2, 5.1, "아니오 (자정 타이머)", 1.8);
  fnode(s, "term", 0.6, 5.95, 5.9, 0.55, "평소 흐름 계속: 동기화 → 화면 갱신 → deep sleep", 12);
  // 포털
  fnode(s, "proc", 7.9, 1.55, 2.9, 0.6, "설정 화면 표시\n(QR 코드 + 안내)", 11);
  seg(s, 9.35, 2.15, 9.35, 2.4, true);
  fnode(s, "proc", 7.9, 2.4, 2.9, 0.6, "WiFiManager 포털\n(최대 10분)", 11);
  seg(s, 9.35, 3.0, 9.35, 3.25, true);
  fnode(s, "dec", 7.9, 3.25, 2.9, 0.95, "공유기\n접속 성공?", 12);
  seg(s, 10.8, 3.725, 11.35, 3.725, true); elabel(s, 10.84, 3.45, "아니오", 0.5);
  fnode(s, "alert", 11.35, 3.2, 1.5, 1.05, "시간 초과 안내\n→ 무기한 절전\n(버튼으로 깨움)", 10);
  seg(s, 9.35, 4.2, 9.35, 4.5, true); elabel(s, 9.45, 4.2, "예");
  fnode(s, "ok", 7.9, 4.5, 2.9, 0.75, "SSID · 비밀번호 · API 키\nNVS에 저장", 11);
  fpath(s, [[9.35, 5.25], [9.35, 6.225], [6.5, 6.225]]);
  txt(s, "관련 함수\nrunSetupPortal()\nrenderSetupScreen()\ncfgSave()", { x: 11.0, y: 4.55, w: 1.85, h: 1.1, fontSize: 10, color: C.accent3 });
}
// ---- NTP 동기화 + RTC 보정 ----
{
  const s = content("시간 동기화와 RTC 보정", "소스 코드 구조");
  fnode(s, "dec", 0.6, 1.4, 3.2, 0.9, "Wi-Fi 연결\n(15초 이내)?", 12);
  seg(s, 3.8, 1.85, 4.3, 1.85, true); elabel(s, 3.85, 1.55, "아니오");
  fnode(s, "alert", 4.3, 1.5, 2.3, 0.7, "실패 반환\n→ SYNC FAILED 표시", 10);
  seg(s, 2.2, 2.3, 2.2, 2.5, true);
  fnode(s, "dec", 0.6, 2.5, 3.2, 0.9, "NTP 응답\n(15초 이내)?", 12);
  seg(s, 3.8, 2.95, 4.3, 2.95, true); elabel(s, 3.85, 2.65, "아니오");
  fnode(s, "alert", 4.3, 2.6, 2.3, 0.7, "Wi-Fi 끄고\n실패 반환", 10);
  seg(s, 2.2, 3.4, 2.2, 3.6, true); elabel(s, 2.3, 3.38, "예");
  fnode(s, "proc", 0.6, 3.6, 3.2, 0.75, "이번 달 첫 동기화면\n공휴일 API → NVS 저장\nholidaySrvFetchIfDue()", 10);
  seg(s, 2.2, 4.35, 2.2, 4.55, true);
  fnode(s, "proc", 0.6, 4.55, 3.2, 0.45, "Wi-Fi 끄기", 11);
  seg(s, 2.2, 5.0, 2.2, 5.2, true);
  fnode(s, "proc", 0.6, 5.2, 3.2, 0.65, "RTC 오차율 학습\nclockRatio 갱신", 11);
  seg(s, 2.2, 5.85, 2.2, 6.05, true);
  fnode(s, "term", 0.6, 6.05, 3.2, 0.45, "성공 반환", 11);
  card(s, 7.0, 1.4, 5.8, 5.1);
  txt(s, "RTC 보정 원리", { x: 7.3, y: 1.6, w: 5.2, h: 0.4, fontSize: 18, bold: true, color: C.text2 });
  txt(s, [
    { text: "문제", options: { bold: true, breakLine: true } },
    { text: "SuperMini에는 32 kHz 크리스털이 없어 deep sleep 중 내부 RC 클럭으로 시간을 셉니다. 오차가 하루 수십 초~수 분까지 납니다.", options: { breakLine: true } },
    { text: " ", options: { breakLine: true, fontSize: 6 } },
    { text: "학습 (주 1회 NTP 때)", options: { bold: true, breakLine: true } },
    { text: "clockRatio = 실제 경과 시간 ÷ RTC가 센 시간", options: { fontFace: "Courier New", breakLine: true } },
    { text: "20시간 이상 경과 · 오차 10% 미만일 때만, 0.9~1.1로 제한", options: { color: C.accent3, breakLine: true } },
    { text: " ", options: { breakLine: true, fontSize: 6 } },
    { text: "적용", options: { bold: true, breakLine: true } },
    { text: "잠들 때: 타이머 = 원하는 시간 ÷ clockRatio", options: { fontFace: "Courier New", breakLine: true } },
    { text: "깰 때:   시계 += (clockRatio − 1) × 잔 시간", options: { fontFace: "Courier New", breakLine: true } },
    { text: " ", options: { breakLine: true, fontSize: 6 } },
    { text: "예) clockRatio 1.002 (+2000 ppm) → 하루 약 173초를 자동 보정. 학습값은 화면 하단 rtc ±ppm으로 표시됩니다.", options: { color: C.accent3 } },
  ], { x: 7.3, y: 2.1, w: 5.2, h: 4.2, fontSize: 13 });
}
// ---- 화면 그리기 구조 ----
{
  const s = content("화면 그리기 구조: renderCalendar()", "소스 코드 구조");
  fnode(s, "term", 0.6, 1.45, 3.6, 0.5, "renderCalendar(t, syncOk)", 12);
  seg(s, 0.9, 1.95, 0.9, 6.0, false);
  const items = [
    [2.2, 0.5, "epdBegin()", "패널 전원 ON · SPI 시작 · 초기화"],
    [2.85, 1.5, "drawFace(t)  — 왼쪽 시계면", "일 칸 링 31칸: 오늘 칸 반전(fillArcSegment), 빨간 날은 isRedDay()\n월 숫자 12개 (FreeSans14pt_digits) · 빈 31일 칸에 LOGO_ICON\n바늘 2개 drawHand(): 월침 짧게, 일침 길게"],
    [4.5, 1.1, "drawSidePanel(t, syncOk)  — 오른쪽", "연도 · 월 · 큰 날짜 · 요일 · 공휴일 이름\nDesigned by + LOGO_MANTIS · SYNC 상태 줄"],
    [5.75, 0.65, "epdEnd()", "패널 hibernate → 신호선 입력으로 → PWR OFF"],
  ];
  items.forEach(([y, h, t1, t2]) => {
    seg(s, 0.9, y + 0.25, 1.25, y + 0.25, true);
    card(s, 1.25, y, 5.6, h);
    txt(s, t1, { x: 1.45, y: y + 0.08, w: 5.2, h: 0.3, fontSize: 13, bold: true, color: C.text2 });
    txt(s, t2, { x: 1.45, y: y + 0.4, w: 5.2, h: h - 0.45, fontSize: 11 });
  });
  imgFit(s, "docs/images/preview_2026-11-21.png", 7.2, 1.45, 5.6, 3.4, 800, 480, "캘린더 화면");
  txt(s, [
    { text: "좌표 기준 (픽셀)", options: { bold: true, breakLine: true } },
    { text: "화면 800 × 480 · 시계 중심 (240, 240) · 반지름 R = 230", options: { bullet: true, breakLine: true } },
    { text: "R_TRACK = R − 28 (일 칸 안쪽), R_MONTH = R − 64 (월 숫자)", options: { bullet: true, breakLine: true } },
    { text: "오른쪽 패널 x 505 ~ 790", options: { bullet: true, breakLine: true } },
    { text: "각도: 12시 = 0°, 시계 방향. 일 = d × 360/31, 월 = m × 30", options: { bullet: true } },
  ], { x: 7.2, y: 5.0, w: 5.6, h: 1.6, fontSize: 12, paraSpaceAfter: 3 });
}
// ---- 공휴일 판정 ----
{
  const s = content("빨간 날 판정: isRedDay()", "소스 코드 구조");
  fnode(s, "dec", 0.6, 1.4, 3.0, 0.9, "토요일 또는\n일요일?", 12);
  seg(s, 3.6, 1.85, 7.2, 1.85, false); elabel(s, 3.7, 1.55, "예");
  seg(s, 2.1, 2.3, 2.1, 2.55, true); elabel(s, 2.2, 2.3, "아니오");
  fnode(s, "dec", 0.6, 2.55, 3.0, 0.9, "서버 데이터가\n있는 연도?", 12);
  seg(s, 3.6, 3.0, 3.9, 3.0, true); elabel(s, 3.6, 2.7, "예", 0.3);
  fnode(s, "dec", 3.9, 2.55, 2.6, 0.9, "서버 목록에\n있음?", 12);
  seg(s, 6.5, 3.0, 7.2, 3.0, false); elabel(s, 6.6, 2.7, "예");
  seg(s, 5.2, 3.45, 5.2, 3.65, false);
  fpath(s, [[5.2, 3.65], [6.8, 3.65], [6.8, 5.6], [6.5, 5.6]]); elabel(s, 5.3, 3.4, "아니오");
  seg(s, 2.1, 3.45, 2.1, 3.95, true); elabel(s, 2.2, 3.55, "아니오");
  fnode(s, "dec", 0.6, 3.95, 3.0, 0.9, "내장 표 범위\n(2026~2040)?", 11);
  seg(s, 3.6, 4.4, 3.9, 4.4, true); elabel(s, 3.6, 4.1, "예", 0.3);
  fnode(s, "dec", 3.9, 3.95, 2.6, 0.9, "내장 표에\n있음?", 12);
  seg(s, 6.5, 4.4, 7.2, 4.4, false); elabel(s, 6.6, 4.1, "예");
  seg(s, 5.2, 4.85, 5.2, 5.2, true); elabel(s, 5.3, 4.85, "아니오");
  seg(s, 2.1, 4.85, 2.1, 5.15, true); elabel(s, 2.2, 4.85, "아니오");
  fnode(s, "dec", 0.6, 5.15, 3.0, 0.9, "양력 고정\n공휴일?", 12);
  seg(s, 3.6, 5.6, 4.15, 5.6, true); elabel(s, 3.65, 5.32, "아니오", 0.5);
  fnode(s, "proc", 4.15, 5.2, 2.35, 0.8, "평일 → 검정", 13);
  fpath(s, [[2.1, 6.05], [2.1, 6.4], [7.2, 6.4]], false); elabel(s, 2.2, 6.08, "예");
  seg(s, 7.2, 6.4, 7.2, 1.85, false);
  seg(s, 7.2, 4.15, 7.6, 4.15, true);
  fnode(s, "alert", 7.6, 3.75, 2.6, 0.8, "빨간 날 → 빨강", 14);
  card(s, 7.6, 1.4, 5.2, 2.15);
  txt(s, [
    { text: "함수 연결", options: { bold: true, breakLine: true } },
    { text: "isRedDay() → holidayIndex()", options: { fontFace: "Courier New", breakLine: true } },
    { text: "  ├ holidaySrvLookup()  서버 저장값 (NVS)", options: { fontFace: "Courier New", breakLine: true } },
    { text: "  └ holidayIndexBuiltin()  내장 표", options: { fontFace: "Courier New", breakLine: true } },
    { text: "서버 데이터가 있으면 서버가 우선입니다 (임시공휴일 반영).", options: { color: C.accent3 } },
  ], { x: 7.8, y: 1.55, w: 4.9, h: 1.9, fontSize: 12 });
  card(s, 7.6, 4.8, 5.2, 1.8);
  txt(s, [
    { text: "양력 고정 공휴일 (표 범위 밖 연도용)", options: { bold: true, breakLine: true } },
    { text: "1/1 · 3/1 · 5/5 · 6/6 · 8/15 · 10/3 · 10/9 · 12/25", options: { breakLine: true } },
    { text: "음력 공휴일·대체공휴일은 표 범위 안에서만 정확합니다. 2041년 이후는 tools/gen_holidays.py로 표를 늘리세요.", options: { color: C.accent3 } },
  ], { x: 7.8, y: 4.95, w: 4.9, h: 1.55, fontSize: 12 });
}
// ---- 주요 함수 ----
{
  const s = content("주요 함수 한눈에 보기", "소스 코드 구조");
  txt(s, "시간 · 전원 · 설정", { x: 0.5, y: 1.4, w: 6, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
  table(s, [
    ["함수", "하는 일"],
    ["setup()", "깨어날 때마다 전체 흐름 (loop는 미사용)"],
    ["applySleepDriftCorrection()", "잠든 시간만큼 RTC 오차 보정"],
    ["syncTimeWithNtp()", "Wi-Fi + NTP, 오차율 학습, 공휴일 갱신"],
    ["sleepUntilNextMidnight()", "다음 00:00:30까지 잠들기"],
    ["deepSleepRealSeconds()", "오차율을 반영한 타이머로 잠들기"],
    ["deepSleepForever()", "버튼·RESET으로만 깨는 절전"],
    ["prepareDeepSleep()", "버튼 기상 설정, 패널 전원 OFF 유지"],
    ["userButtonLongPress()", "버튼 3초 누름 판정"],
    ["bootButtonRequested()", "RESET 후 BOOT 1초 판정 (예비)"],
    ["runSetupPortal()", "QR 화면 + WiFiManager 설정 포털"],
  ], { x: 0.5, y: 1.8, w: 6.0, colW: [2.65, 3.35], rowH: 0.42, fontSize: 11 });
  txt(s, "화면 · 데이터", { x: 6.8, y: 1.4, w: 6, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
  table(s, [
    ["함수", "하는 일"],
    ["renderCalendar()", "캘린더 한 장 그리기 (전체 갱신)"],
    ["drawFace() / drawSidePanel()", "시계면 / 오른쪽 패널"],
    ["drawHand() / fillArcSegment()", "바늘 / 오늘 칸 반전"],
    ["renderSetupScreen() / drawQr()", "Wi-Fi 설정 화면 / QR 코드"],
    ["renderNotice()", "제목 + 2줄 안내 화면"],
    ["epdBegin() / epdEnd()", "패널 켜기·초기화 / 끄기"],
    ["isRedDay() / holidayIndex()", "빨간 날 판정 / 공휴일 찾기"],
    ["holidaySrvFetchIfDue()", "월 1회 서버 공휴일 (holiday_server.h)"],
    ["holidaySrvLoad()", "저장된 서버 공휴일 읽기"],
    ["cfgLoad() / cfgSave()", "Wi-Fi·키 읽기/저장 (wifi_config.h)"],
  ], { x: 6.8, y: 1.8, w: 6.0, colW: [2.85, 3.15], rowH: 0.42, fontSize: 11 });
}
// ---- 데이터 보관 위치 ----
{
  const s = content("값은 어디에 저장되나", "소스 코드 구조");
  const cols = [
    ["RTC 메모리", "deep sleep 중 유지 · 전원이 끊기면 초기화", C.accent2, [
      "lastSyncEpoch  마지막 동기화 시각", "clockRatio  RTC 오차율 (학습값)", "sleepStartUs / plannedSleepUs  잠든 시점·타이머",
      "lastDrawnYmd  마지막으로 그린 날짜", "syncFailCount  연속 동기화 실패 수", "lastDrawnSyncOk / errorShown  화면 상태"]],
    ["NVS (플래시)", "배터리를 빼도 유지 · 업로드해도 유지", C.accent4, [
      "\"cfg\": ssid · pass · apikey", "   → Wi-Fi 설정 화면에서 저장", "\"holiday\": dates · y0 · y1 · ym", "   → 월 1회 서버 공휴일"]],
    ["코드에 고정", "다시 업로드해야 바뀜", C.accent3, [
      "config.h  핀 · 주기 · 옵션", "holidays_kr.h  내장 공휴일 표", "logo_mantis.h  로고 그림", "FreeSans14pt_digits.h  월 숫자 글꼴"]],
  ];
  cols.forEach((c, i) => {
    const x = 0.5 + i * 4.15;
    card(s, x, 1.45, 3.85, 4.4);
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: 1.7, w: 0.3, h: 0.3, fill: { color: c[2] }, line: { color: c[2] }, objectName: nm("dot") });
    txt(s, c[0], { x: x + 0.7, y: 1.63, w: 3.0, h: 0.4, fontSize: 17, bold: true, color: C.text2 });
    txt(s, c[1], { x: x + 0.25, y: 2.15, w: 3.4, h: 0.5, fontSize: 12, color: C.accent3 });
    txt(s, c[3].join("\n"), { x: x + 0.25, y: 2.75, w: 3.45, h: 3.0, fontSize: 12, paraSpaceAfter: 4 });
  });
  card(s, 0.5, 6.05, 12.3, 0.6, "FDECEC");
  txt(s, "초기화하려면: 배터리를 뺐다 끼우면 RTC 메모리만 지워집니다(시간 재동기화). Wi-Fi를 바꾸려면 버튼 3초. NVS 전체 삭제는 Arduino IDE Tools → Erase All Flash Before Sketch Upload: Enabled 후 업로드.", { x: 0.7, y: 6.1, w: 11.9, h: 0.5, fontSize: 12, valign: "middle" });
}
// ---- 수정 가이드 ----
{
  const s = content("수정 가이드: 무엇을 바꾸려면 어디를", "소스 코드 구조");
  table(s, [
    ["바꾸고 싶은 것", "고칠 곳", "참고"],
    ["깨어나는 시각 (00:00:30)", "config.h  WAKE_MARGIN_SEC", "sleepUntilNextMidnight()"],
    ["동기화 주기 (7일)", "config.h  SYNC_INTERVAL_SEC", "짧을수록 정확, 배터리 소모 약간 증가"],
    ["시간대", "config.h  TZ_INFO", "한국 \"KST-9\""],
    ["배선 핀", "config.h  PIN_EPD_*, PIN_USER_BTN", "버튼은 GPIO0~5만 deep sleep 기상 가능"],
    ["버튼 길게 누름 시간", "config.h  USER_BTN_LONG_MS", "기본 3000 ms"],
    ["시계면 크기·배치", "drawFace() 상단 R, R_TRACK, R_MONTH", "tools/preview.py에도 같은 값 반영 후 미리보기"],
    ["오른쪽 패널 글자·위치", "drawSidePanel()", "y 좌표는 픽셀 단위"],
    ["월 숫자 크기", "tools/make_gfx_font.py로 글꼴 재생성", "FreeSans14pt_digits.h 교체"],
    ["임시공휴일 추가", "tools/gen_holidays.py의 EXTRA → 표 재생성", "또는 API 키 입력 시 자동 반영"],
    ["로고 교체", "assets/ 원본 → logo_mantis.h", "56×10 로고, 20×20 원형 심볼 (1비트)"],
    ["설정 화면 안내 문구", "renderSetupScreen()", "tools/preview_setup.py에도 반영"],
  ], { x: 0.5, y: 1.4, w: 12.3, colW: [3.0, 4.6, 4.7], rowH: 0.37, fontSize: 11 });
  card(s, 0.5, 6.0, 12.3, 0.65, "E8F4EC");
  txt(s, "수정 순서: ① config.h로 해결되는지 먼저 확인  ② tools/preview.py로 화면 미리보기  ③ ✓ 컴파일  ④ DEBUG_SERIAL 1로 업로드해 시리얼 로그 확인 ([BOOT] [NTP] [RTC] [SLEEP])", { x: 0.7, y: 6.05, w: 11.9, h: 0.55, fontSize: 12, valign: "middle" });
}

pres.addSection({ title: "제작과 업로드" });
{
  const s = pres.addSlide({ masterName: "SECTION", sectionTitle: "제작과 업로드" });
  s.addText("제작과 업로드", { placeholder: "title" });
  s.addText("조립 순서 · 펌웨어 업로드 · 첫 실행 점검", { placeholder: "body" });
}
{
  const s = content("조립 순서", "제작과 업로드");
  const steps = [
    ["보드 준비", "SuperMini 빨간 전원 LED를 인두로 제거. 핀 헤더 대신 전선 직접 납땜 권장"],
    ["HAT 연결", "9핀 케이블을 핀 연결표대로 납땜. PWR → GPIO0 포함, HAT 스위치 0 확인"],
    ["버튼 배선", "GPIO5–버튼–GND, GPIO5–1 MΩ–3V3, (선택) GPIO5–100 nF–GND"],
    ["전원부", "홀더 → TP4056 B+/B−, OUT+ → 스위치 → 5V, OUT− → GND, 470 µF 추가"],
    ["펌웨어 업로드", "전원 스위치 OFF 상태에서 USB로 업로드 (다음 장)"],
    ["동작 확인", "QR 설정 → 캘린더 표시 → 버튼 짧게/길게 → deep sleep 전류 측정"],
    ["케이스 조립", "패널을 앞판 포켓에 → 폼 → 지지판·부품 고정 → 뒤판 M2.5 나사"],
  ];
  steps.forEach((st, i) => {
    const col = i < 4 ? 0 : 1, row = i < 4 ? i : i - 4;
    const x = 0.5 + col * 6.3, y = 1.5 + row * 1.25;
    badge(s, x, y + 0.05, String(i + 1), i === 4 ? C.accent1 : C.accent2);
    txt(s, st[0], { x: x + 0.65, y, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: C.text2 });
    txt(s, st[1], { x: x + 0.65, y: y + 0.42, w: 5.3, h: 0.7, fontSize: 13 });
  });
}
{
  const s = content("펌웨어 업로드", "제작과 업로드");
  card(s, 0.5, 1.45, 6.0, 4.9);
  txt(s, "Arduino IDE", { x: 0.8, y: 1.65, w: 5.4, h: 0.45, fontSize: 20, bold: true, color: C.text2 });
  txt(s, [
    { text: "보드 매니저: esp32 (Espressif) 설치", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "보드: ESP32C3 Dev Module", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "USB CDC On Boot: Enabled", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "Partition Scheme: Huge APP (3MB No OTA)", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "라이브러리: GxEPD2, Adafruit GFX, ArduinoJson(v7), WiFiManager(tzapu), QRCode(ricmoo)", options: { bullet: { type: "number" }, breakLine: true } },
    { text: "EpaperMonthDayClock 폴더를 열고 업로드", options: { bullet: { type: "number" } } },
  ], { x: 0.8, y: 2.25, w: 5.4, h: 3.9, fontSize: 14, paraSpaceAfter: 8 });
  card(s, 6.8, 1.45, 6.0, 2.6);
  txt(s, "PlatformIO", { x: 7.1, y: 1.65, w: 5.4, h: 0.45, fontSize: 20, bold: true, color: C.text2 });
  txt(s, "프로젝트 폴더를 열고 실행 (보드·라이브러리·파티션 설정 포함):", { x: 7.1, y: 2.2, w: 5.4, h: 0.6, fontSize: 13 });
  s.addShape(pres.shapes.RECTANGLE, { x: 7.1, y: 2.85, w: 5.4, h: 0.9, fill: { color: C.text1 }, line: { color: C.text1 }, objectName: nm("code") });
  txt(s, "pio run -t upload\npio device monitor", { x: 7.3, y: 2.95, w: 5.0, h: 0.7, fontSize: 13, fontFace: "Courier New", color: C.background1 });
  card(s, 6.8, 4.3, 6.0, 2.05, "FDECEC");
  txt(s, "업로드가 안 될 때", { x: 7.1, y: 4.45, w: 5.4, h: 0.4, fontSize: 16, bold: true, color: C.accent1 });
  txt(s, "deep sleep 중에는 USB 시리얼이 끊겨 있습니다. BOOT 버튼을 누른 채 RESET을 눌렀다 떼면 다운로드 모드로 들어갑니다. 업로드 후 RESET 한 번.", { x: 7.1, y: 4.9, w: 5.4, h: 1.35, fontSize: 13 });
}
{
  const s = content("컴파일 문제 해결 (Windows)", "제작과 업로드");
  table(s, [
    ["증상", "원인", "해결"],
    ["cannot execute 'cc1.exe' / cannot find -lxxx (경로에 깨진 글자)", "Windows 사용자 폴더 이름에 ™·한글 등 비영문 글자", ".arduinoIDE\\arduino-cli.yaml의 data를 C:/Arduino15, user를 C:/Arduino로 바꾸고, TEMP·TMP를 C:\\Temp로. IDE 종료 후 수정"],
    ["GxEPD2_3C.h: No such file", "라이브러리가 스케치북의 libraries 폴더에 없음", "Library Manager로 5개 다시 설치, Preferences의 Sketchbook location 확인"],
    ["사용률 81%, 최대 1,310,720 바이트", "기본 파티션 (OTA 포함)", "Tools → Partition Scheme → Huge APP (3MB No OTA) → 약 33%"],
    ["포트가 안 잡힘", "deep sleep 중 USB 꺼짐, 충전 전용 케이블", "BOOT 누른 채 RESET, 데이터 케이블 사용"],
    ["첫 컴파일이 수 분 걸림", "esp32 코어 전체를 처음 컴파일", "정상. 두 번째부터 수십 초"],
  ], { x: 0.5, y: 1.45, w: 12.3, colW: [3.4, 3.4, 5.5], rowH: 0.75, fontSize: 12 });
}
{
  const s = content("첫 실행 점검표", "제작과 업로드");
  const checks = [
    ["화면", "QR 설정 화면이 뜬다 (Wi-Fi 미설정 상태)"],
    ["Wi-Fi", "휴대폰으로 설정 후 캘린더가 표시된다"],
    ["시리얼", "[NTP] synced, [HOL] 2026: N holidays 로그 (API 키 입력 시)"],
    ["버튼 짧게", "깨어나서 동기화 후 화면을 다시 그린다"],
    ["버튼 3초", "QR 설정 화면으로 들어간다"],
    ["절전", "deep sleep 전류 50 µA 이하 (µA 레인지로 측정)"],
    ["다음 날", "00:00:30에 날짜가 바뀐다"],
    ["1주 후", "SYNC on 날짜와 rtc ppm 값이 갱신된다"],
  ];
  checks.forEach((c, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.5 + col * 6.3, y = 1.5 + row * 1.2;
    card(s, x, y, 6.0, 1.0);
    s.addShape(pres.shapes.RECTANGLE, { x: x + 0.25, y: y + 0.32, w: 0.34, h: 0.34, fill: { color: C.background1 }, line: { color: C.accent2, width: 1.5 }, objectName: nm("check") });
    txt(s, c[0], { x: x + 0.8, y: y + 0.15, w: 5.0, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
    txt(s, c[1], { x: x + 0.8, y: y + 0.52, w: 5.0, h: 0.4, fontSize: 12 });
  });
}
{
  const s = content("라이선스와 상용 판매", "제작과 업로드");
  card(s, 0.5, 1.45, 4.0, 2.2, "E8F4EC");
  txt(s, "구매할 라이선스 없음", { x: 0.75, y: 1.65, w: 3.5, h: 0.4, fontSize: 17, bold: true, color: C.text2 });
  txt(s, "모든 구성요소가 상업적 판매를 허용합니다. 대신 GPL-3.0 의무를 지켜야 합니다.", { x: 0.75, y: 2.15, w: 3.5, h: 1.3, fontSize: 13 });
  card(s, 0.5, 3.85, 4.0, 2.8, "FDECEC");
  txt(s, "판매 전 할 일", { x: 0.75, y: 4.05, w: 3.5, h: 0.4, fontSize: 17, bold: true, color: C.accent1 });
  txt(s, [
    { text: "소스 공개 위치·연락처 기입 (THIRD_PARTY_NOTICES.md)", options: { bullet: true, breakLine: true } },
    { text: "설명서에 오픈소스 고지 동봉", options: { bullet: true, breakLine: true } },
    { text: "Secure Boot·Flash 암호화 사용 안 함", options: { bullet: true, breakLine: true } },
    { text: "KC 전파·안전 인증 확인", options: { bullet: true } },
  ], { x: 0.75, y: 4.5, w: 3.5, h: 2.0, fontSize: 13, paraSpaceAfter: 4 });
  table(s, [
    ["구성요소", "라이선스", "의무"],
    ["GxEPD2", "GPL-3.0", "펌웨어 전체 소스 공개"],
    ["arduino-esp32 코어", "LGPL-2.1+", "재링크 가능하게 (소스 공개로 충족)"],
    ["FreeSans 글꼴", "GPL-3+ 글꼴 예외", "소스 공개로 충족"],
    ["ESP-IDF", "Apache-2.0", "저작권 고지"],
    ["Adafruit GFX", "BSD", "저작권 고지"],
    ["BusIO · ArduinoJson · WiFiManager · QRCode", "MIT", "저작권 고지"],
    ["NTP 서버", "서비스 정책", "pool.ntp.org 금지 → time.google.com 등으로 변경 완료"],
    ["공휴일 API (data.go.kr)", "이용 제한 없음", "개발계정 1만 건, 운영계정 증설 가능"],
  ], { x: 4.8, y: 1.45, w: 8.0, colW: [3.0, 1.8, 3.2], rowH: 0.48, fontSize: 12 });
  txt(s, "LICENSE · THIRD_PARTY_NOTICES.md · licenses/ 폴더에 정리되어 있습니다. 법률 자문이 아니므로 출시 전 전문가 확인을 권장합니다.", { x: 4.8, y: 6.4, w: 8.0, h: 0.45, fontSize: 11, color: C.accent3 });
}
{
  const s = pres.addSlide({ masterName: "TITLE", sectionTitle: "제작과 업로드" });
  s.addImage({ path: P("docs/images/mantis_logo_white.png"), x: 0.8, y: 0.7, w: 2.0, h: 0.4, altText: "MANTIS 로고", objectName: nm("logo") });
  txt(s, "다음 단계", { x: 0.8, y: 2.0, w: 11, h: 0.8, fontSize: 40, bold: true, color: C.background1, fontFace: THEME.headFontFace });
  txt(s, [
    { text: "부품 실측 후 케이스 치수 확정 → 3D 모델링·시제품 출력", options: { bullet: true, breakLine: true } },
    { text: "실제 deep sleep 전류 측정 → 배터리 수명 재계산", options: { bullet: true, breakLine: true } },
    { text: "공휴일 API 키 발급 후 서버 공휴일 동작 확인", options: { bullet: true, breakLine: true } },
    { text: "소스 저장소 공개 · KC 인증 확인 → 판매", options: { bullet: true, breakLine: true } },
    { text: "(선택) 배터리 전압 측정 회로 추가 → 잔량 표시", options: { bullet: true } },
  ], { x: 0.8, y: 3.0, w: 11, h: 2.6, fontSize: 18, color: C.background2, paraSpaceAfter: 12 });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("written", OUT);
})();
