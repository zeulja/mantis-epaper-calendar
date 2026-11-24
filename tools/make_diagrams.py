# 배선도 / 기구 도면 생성 (PPT·README용 PNG). 사용: python3 tools/make_diagrams.py [출력폴더=docs/images]
# 필요: Pillow, Noto Sans CJK 글꼴 (fonts-noto-cjk)
import sys, os
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else "docs/images"
os.makedirs(OUT, exist_ok=True)
NOTO = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
NOTOB = "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc"
def F(sz, b=False): return ImageFont.truetype(NOTOB if b else NOTO, sz, index=1)

INK = (30, 34, 40); GRAY = (120, 126, 134); LIGHT = (236, 239, 243); WHITE = (255, 255, 255)
RED = (205, 40, 40); BLUE = (40, 90, 200); GREEN = (30, 140, 80); ORANGE = (220, 120, 20)
PURPLE = (130, 70, 180); TEAL = (20, 140, 150); BROWN = (140, 90, 40); YEL = (200, 160, 0)
NAVY = (22, 52, 96)

def box(g, xy, title=None, fill=LIGHT, outline=INK, w=3, r=12, tf=None):
    g.rounded_rectangle(xy, r, fill=fill, outline=outline, width=w)
    if title:
        g.text(((xy[0] + xy[2]) / 2, xy[1] + 22), title, font=tf or F(24, True), fill=INK, anchor="mm")

def tag(g, x, y, text, color, side="r"):
    """net label (flag)"""
    f = F(19, True); w = g.textlength(text, font=f) + 22; h = 30
    if side == "r":
        pts = [(x, y), (x + 12, y - h / 2), (x + w, y - h / 2), (x + w, y + h / 2), (x + 12, y + h / 2)]
        tx = x + 12 + (w - 12) / 2
    else:
        pts = [(x, y), (x - 12, y - h / 2), (x - w, y - h / 2), (x - w, y + h / 2), (x - 12, y + h / 2)]
        tx = x - 12 - (w - 12) / 2
    g.polygon(pts, fill=color)
    g.text((tx, y), text, font=f, fill=WHITE, anchor="mm")

# ------------------------------------------------------------------
# 1) 배선도
# ------------------------------------------------------------------
W, H = 1800, 980
im = Image.new("RGB", (W, H), WHITE); g = ImageDraw.Draw(im)

NETS = {  # net: color
    "3V3": RED, "GND": INK, "EPD_DIN": BLUE, "EPD_CLK": GREEN, "EPD_CS": ORANGE, "EPD_DC": PURPLE,
    "EPD_RST": TEAL, "EPD_BUSY": BROWN, "EPD_PWR": YEL, "BTN": NAVY, "5V_BAT": (200, 60, 120),
}

# --- ESP32-C3 SuperMini ---
sx0, sy0, sx1, sy1 = 720, 170, 1080, 700
CXs = (sx0 + sx1) / 2
box(g, (sx0, sy0, sx1, sy1), None, fill=(250, 250, 252))
g.rounded_rectangle((CXs - 40, sy0 - 26, CXs + 40, sy0 + 6), 6, fill=GRAY)
g.text((CXs, sy0 - 10), "USB-C", font=F(15, True), fill=WHITE, anchor="mm")
g.text((CXs, 330), "ESP32-C3", font=F(30, True), fill=INK, anchor="mm")
g.text((CXs, 368), "SuperMini", font=F(26, True), fill=INK, anchor="mm")
g.text((CXs, 410), "22.5 × 18 mm", font=F(18), fill=GRAY, anchor="mm")
g.text((CXs, 560), "BOOT = GPIO9", font=F(16), fill=GRAY, anchor="mm")
g.text((CXs, 584), "LED = GPIO8", font=F(16), fill=GRAY, anchor="mm")
left = [("5V", None), ("GND", None), ("3V3", "3V3"), ("GPIO4", "EPD_CLK"), ("GPIO3", "EPD_BUSY"),
        ("GPIO2", None), ("GPIO1", "EPD_DC"), ("GPIO0", "EPD_PWR")]
right = [("GPIO5", "BTN"), ("GPIO6", "EPD_DIN"), ("GPIO7", "EPD_CS"), ("GPIO8", None), ("GPIO9", None),
         ("GPIO10", "EPD_RST"), ("GPIO20", None), ("GPIO21", None)]
used_left = {"5V", "GND"}
py = [sy0 + 60 + i * 60 for i in range(8)]
for (name, net), y in zip(left, py):
    g.ellipse((sx0 - 7, y - 7, sx0 + 7, y + 7), fill=WHITE, outline=INK, width=2)
    g.text((sx0 + 16, y), name, font=F(19, True), fill=INK if (net or name in used_left) else GRAY, anchor="lm")
    if net:
        g.line((sx0 - 7, y, sx0 - 60, y), fill=NETS[net], width=5)
        tag(g, sx0 - 60, y, net, NETS[net], "l")
for (name, net), y in zip(right, py):
    g.ellipse((sx1 - 7, y - 7, sx1 + 7, y + 7), fill=WHITE, outline=INK, width=2)
    g.text((sx1 - 16, y), name, font=F(19, True), fill=INK if net else GRAY, anchor="rm")
    if net:
        g.line((sx1 + 7, y, sx1 + 60, y), fill=NETS[net], width=5)
        tag(g, sx1 + 60, y, net, NETS[net], "r")

# --- e-Paper HAT (B) ---
hx0, hy0, hx1, hy1 = 1500, 170, 1770, 788
box(g, (hx0, hy0, hx1, hy1), None, fill=(250, 250, 252))
g.text(((hx0 + hx1) / 2, hy0 + 28), "Waveshare 7.5\"", font=F(20, True), fill=INK, anchor="mm")
g.text(((hx0 + hx1) / 2, hy0 + 54), "e-Paper HAT (B)", font=F(20, True), fill=INK, anchor="mm")
g.text(((hx0 + hx1) / 2, hy0 + 80), "9핀 케이블 (GH1.25)", font=F(16), fill=GRAY, anchor="mm")
hat = [("VCC", "3V3"), ("GND", "GND"), ("DIN", "EPD_DIN"), ("CLK", "EPD_CLK"), ("CS", "EPD_CS"),
       ("DC", "EPD_DC"), ("RST", "EPD_RST"), ("BUSY", "EPD_BUSY"), ("PWR", "EPD_PWR")]
for i, (name, net) in enumerate(hat):
    y = hy0 + 120 + i * 52
    g.ellipse((hx0 - 7, y - 7, hx0 + 7, y + 7), fill=WHITE, outline=INK, width=2)
    g.text((hx0 + 18, y), name, font=F(21, True), fill=INK, anchor="lm")
    g.line((hx0 - 7, y, hx0 - 50, y), fill=NETS[net], width=5)
    tag(g, hx0 - 50, y, net, NETS[net], "l")
g.text(((hx0 + hx1) / 2, hy1 - 40), "뒷면 Interface Config = 0", font=F(16, True), fill=RED, anchor="mm")
g.text(((hx0 + hx1) / 2, hy1 - 17), "(4-line SPI)", font=F(16), fill=RED, anchor="mm")

# --- 버튼 회로 (오른쪽 위, BTN 이름표로 GPIO5와 연결) ---
jx, jy = 1330, 100
g.text((1170, 24), "버튼 회로", font=F(20, True), fill=INK)
tag(g, jx - 60, jy, "BTN", NAVY, "l")
g.line((jx - 60, jy, jx, jy), fill=NAVY, width=5)
g.ellipse((jx - 7, jy - 7, jx + 7, jy + 7), fill=NAVY)
# 풀업: 위로 → 오른쪽 저항 → 3V3
g.line((jx, jy, jx, 50), fill=NAVY, width=4)
g.line((jx, 50, jx + 30, 50), fill=NAVY, width=4)
g.rectangle((jx + 30, 38, jx + 100, 62), outline=INK, width=3, fill=WHITE)
g.text((jx + 65, 50), "1MΩ", font=F(16, True), fill=INK, anchor="mm")
g.line((jx + 100, 50, jx + 130, 50), fill=RED, width=4)
tag(g, jx + 130, 50, "3V3", RED, "r")
# 스위치 → GND
g.line((jx, jy, jx + 40, jy), fill=NAVY, width=4)
g.ellipse((jx + 36, jy - 6, jx + 48, jy + 6), outline=INK, width=3)
g.ellipse((jx + 92, jy - 6, jx + 104, jy + 6), outline=INK, width=3)
g.line((jx + 46, jy - 6, jx + 98, jy - 28), fill=INK, width=4)
g.text((jx + 70, jy + 24), "푸시 버튼", font=F(15, True), fill=INK, anchor="mm")
g.line((jx + 104, jy, jx + 130, jy), fill=INK, width=4)
tag(g, jx + 130, jy, "GND", INK, "r")
g.text((1170, 140), "(선택) GPIO5–GND 100nF", font=F(14), fill=GRAY)

# --- 전원부 ---
PINK = (200, 60, 120)
bx0, byy = 60, 610
box(g, (bx0, byy, bx0 + 230, byy + 120), None, fill=(255, 248, 230))
g.text((bx0 + 115, byy + 40), "18650 셀", font=F(22, True), fill=INK, anchor="mm")
g.text((bx0 + 115, byy + 72), "+ 배터리 홀더", font=F(18), fill=GRAY, anchor="mm")
g.text((bx0 + 115, byy + 100), "3.0 ~ 4.2 V", font=F(16), fill=GRAY, anchor="mm")
tx0, ty0 = 60, 370
box(g, (tx0, ty0, tx0 + 230, ty0 + 160), None, fill=(235, 245, 255))
g.text((tx0 + 115, ty0 + 30), "TP4056 충전 모듈", font=F(20, True), fill=INK, anchor="mm")
g.text((tx0 + 115, ty0 + 58), "USB-C, 보호회로(DW01) 포함", font=F(15), fill=GRAY, anchor="mm")
for lbl, xx in (("B+", tx0 + 60), ("B−", tx0 + 170)):
    g.text((xx, ty0 + 140), lbl, font=F(18, True), fill=INK, anchor="mm")
for lbl, yy in (("OUT+", ty0 + 92), ("OUT−", ty0 + 126)):
    g.text((tx0 + 222, yy), lbl, font=F(16, True), fill=INK, anchor="rm")
g.line((tx0 + 60, byy, tx0 + 60, ty0 + 160), fill=RED, width=5)
g.line((tx0 + 170, byy, tx0 + 170, ty0 + 160), fill=INK, width=5)
V5X, GNX = 470, 515
g.line((tx0 + 230, ty0 + 92, 380, ty0 + 92), fill=PINK, width=5)
g.ellipse((376, ty0 + 86, 388, ty0 + 98), outline=INK, width=3)
g.line((386, ty0 + 90, 436, ty0 + 70), fill=INK, width=4)
g.ellipse((432, ty0 + 86, 444, ty0 + 98), outline=INK, width=3)
g.text((410, ty0 + 52), "전원 스위치", font=F(17, True), fill=INK, anchor="mm")
g.line((444, ty0 + 92, V5X, ty0 + 92), fill=PINK, width=5)
g.line((V5X, ty0 + 92, V5X, py[0]), fill=PINK, width=5)
g.line((V5X, py[0], sx0 - 7, py[0]), fill=PINK, width=5)
g.text((V5X + 10, py[0] - 18), "5V 핀 (보드 LDO 입력)", font=F(16, True), fill=PINK, anchor="lm")
g.line((tx0 + 230, ty0 + 126, GNX, ty0 + 126), fill=INK, width=5)
g.line((GNX, ty0 + 126, GNX, py[1]), fill=INK, width=5)
g.line((GNX, py[1], sx0 - 7, py[1]), fill=INK, width=5)
# 470uF (5V-GND 사이)
CX_ = 640
g.line((CX_, py[0], CX_, py[0] + 18), fill=INK, width=3)
g.line((CX_ - 18, py[0] + 18, CX_ + 18, py[0] + 18), fill=INK, width=4)
g.arc((CX_ - 18, py[0] + 22, CX_ + 18, py[0] + 42), 200, 340, fill=INK, width=4)
g.line((CX_, py[0] + 26, CX_, py[1]), fill=INK, width=3)
g.text((CX_ - 24, py[0] + 30), "470µF", font=F(16, True), fill=INK, anchor="rm")
g.text((60, 150), "전원 경로", font=F(26, True), fill=INK)
g.text((60, 188), "18650 → 충전/보호 모듈 → 스위치 → SuperMini 5V", font=F(17), fill=GRAY)
g.text((60, 212), "HAT 전원은 SuperMini 3V3 핀에서 공급", font=F(17), fill=GRAY)

# 범례 / 주의
g.rounded_rectangle((60, 800, 1740, 950), 12, fill=(255, 245, 245), outline=RED, width=2)
notes = [
    "• 같은 이름표(색)끼리 연결합니다.  예) SuperMini GPIO6 [EPD_DIN] ↔ HAT DIN",
    "• SuperMini 빨간 전원 LED는 제거 (deep sleep 전류 절감).  USB로 업로드할 때는 전원 스위치 OFF.",
    "• 버튼은 GPIO5 (deep sleep 기상은 GPIO0~5만 가능).  짧게 = 시간 동기화+화면 갱신, 3초 = Wi-Fi 설정.",
    "• 3V3 핀을 배터리에 직접 연결하지 말 것 (만충 4.2V > ESP32-C3 최대 3.6V).",
]
for i, t in enumerate(notes):
    g.text((84, 818 + i * 32), t, font=F(19), fill=INK)
im.save(f"{OUT}/wiring.png")

# ------------------------------------------------------------------
# 2) 외곽 기구 - 정면 / 내부 배치 (축척 4 px/mm)
# ------------------------------------------------------------------
S = 4.0
OW, OH, R = 196, 136, 6          # 외곽
PW, PH = 170.2, 111.2            # 패널 외형
AW, AH = 163.2, 97.92            # 표시 영역
WINW, WINH = 166, 101            # 정면 창
im = Image.new("RGB", (1800, 900), WHITE); g = ImageDraw.Draw(im)

def mm(x0, y0, x, y): return (x0 + x * S, y0 + y * S)
def rect(x0, y0, x, y, w, h, **kw):
    g.rectangle((x0 + x * S, y0 + y * S, x0 + (x + w) * S, y0 + (y + h) * S), **kw)
def dim_h(x0, y0, xa, xb, y, text, off=-20):
    ya = y0 + y * S + off
    g.line((x0 + xa * S, ya, x0 + xb * S, ya), fill=GRAY, width=2)
    for xx in (xa, xb):
        g.line((x0 + xx * S, ya - 8, x0 + xx * S, ya + 8), fill=GRAY, width=2)
    g.text((x0 + (xa + xb) / 2 * S, ya - 4), text, font=F(17, True), fill=GRAY, anchor="mb")
def dim_v(x0, y0, ya, yb, x, text, off=-20):
    xa = x0 + x * S + off
    g.line((xa, y0 + ya * S, xa, y0 + yb * S), fill=GRAY, width=2)
    for yy in (ya, yb):
        g.line((xa - 8, y0 + yy * S, xa + 8, y0 + yy * S), fill=GRAY, width=2)
    t = Image.new("RGBA", (200, 30), (0, 0, 0, 0)); tg = ImageDraw.Draw(t)
    tg.text((100, 15), text, font=F(17, True), fill=GRAY, anchor="mm"); t = t.rotate(90, expand=True)
    im.paste(t, (int(xa - 34), int(y0 + (ya + yb) / 2 * S - 100)), t)

# 정면
X0, Y0 = 70, 120
g.text((X0, 50), "정면 (Front)", font=F(28, True), fill=INK)
g.rounded_rectangle((X0, Y0, X0 + OW * S, Y0 + OH * S), int(R * S), fill=(245, 246, 248), outline=INK, width=4)
wx, wy = (OW - WINW) / 2, 13
rect(X0, Y0, wx, wy, WINW, WINH, fill=WHITE, outline=INK, width=3)
g.text(mm(X0, Y0, OW / 2, wy + WINH / 2), "표시 영역 163.2 × 97.9", font=F(20, True), fill=GRAY, anchor="mm")
g.text(mm(X0, Y0, OW / 2, wy + WINH / 2 + 8), "창 166 × 101", font=F(17), fill=GRAY, anchor="mm")
dim_h(X0, Y0, 0, OW, 0, f"{OW} mm")
dim_v(X0, Y0, 0, OH, 0, f"{OH} mm")
# 부품 배치는 뒤에서 본 좌표(rear x)로 정의하고, 정면은 좌우 반전(front x = OW - rear x - w)
PORTS = [  # (rear_x, width, label, color)
    (30, 10, "업로드 USB-C", INK),     # SuperMini
    (73, 10, "충전 USB-C", INK),       # TP4056
    (100, 8, "전원 스위치", GRAY),
]
# 측면 버튼 (정면 기준 오른쪽 벽)
g.rectangle(mm(X0, Y0, OW, 60) + mm(X0, Y0, OW + 3, 72), fill=NAVY)
g.text(mm(X0, Y0, OW + 5, 66), "버튼", font=F(17, True), fill=NAVY, anchor="lm")
for i, (rx, w, lbl, col) in enumerate(PORTS):
    fx = OW - rx - w
    g.rectangle(mm(X0, Y0, fx, OH) + mm(X0, Y0, fx + w, OH + 3), fill=col)
    g.text(mm(X0, Y0, fx + w / 2, OH + 6 + (i % 2) * 6), lbl, font=F(16, True), fill=col, anchor="mt")

# 내부 배치 (뒤판 제거, 뒤에서 본 모습)
X1, Y1 = 960, 120
g.text((X1, 50), "내부 배치 (뒤판 제거, 뒤에서 본 모습)", font=F(28, True), fill=INK)
g.rounded_rectangle((X1, Y1, X1 + OW * S, Y1 + OH * S), int(R * S), fill=(250, 250, 250), outline=INK, width=4)
px_, py_ = (OW - PW) / 2, 9
rect(X1, Y1, px_, py_, PW, PH, fill=(232, 236, 242), outline=GRAY, width=2)
g.text(mm(X1, Y1, px_ + 3, py_ + 3), "패널 뒷면 170.2 × 111.2 × 1.2", font=F(16), fill=GRAY)
def part(x, y, w, h, label, sub, color):
    rect(X1, Y1, x, y, w, h, fill=color, outline=INK, width=2)
    g.text(mm(X1, Y1, x + w / 2, y + h / 2 - 2.5), label, font=F(17, True), fill=INK, anchor="mm")
    g.text(mm(X1, Y1, x + w / 2, y + h / 2 + 3), sub, font=F(14), fill=INK, anchor="mm")
part(22, 20, 77, 21, "18650 홀더", "77 × 21 × 19", (255, 236, 200))
part(112, 18, 65, 30.2, "Driver HAT", "65 × 30.2", (210, 230, 210))
part(24, 98, 22.5, 18, "SuperMini", "22.5 × 18", (230, 215, 245))
part(64, 98, 28, 17, "TP4056", "28 × 17", (210, 225, 250))
# 패널 FPC (오른쪽 아래) → HAT
rect(X1, Y1, 140, py_ + PH - 6, 25, 6, fill=(200, 160, 60), outline=INK, width=1)
g.line(mm(X1, Y1, 152, py_ + PH - 6) + mm(X1, Y1, 152, 48.2), fill=BROWN, width=4)
g.text(mm(X1, Y1, 156, 80), "FPC", font=F(15, True), fill=BROWN, anchor="lm")
g.text(mm(X1, Y1, 152, py_ + PH + 4), "패널 FPC 위치는 실물 확인", font=F(15), fill=BROWN, anchor="mm")
# HAT 9핀 케이블 → SuperMini
g.line(mm(X1, Y1, 112, 40) + mm(X1, Y1, 40, 98), fill=(90, 90, 90), width=2)
g.text(mm(X1, Y1, 66, 72), "9핀 케이블", font=F(14), fill=(90, 90, 90), anchor="rm")
# 버튼 (뒤에서 보면 왼쪽 벽)
rect(X1, Y1, 0.5, 60, 4, 12, fill=NAVY)
g.text(mm(X1, Y1, 6, 66), "버튼", font=F(15, True), fill=NAVY, anchor="lm")
for i, (rx, w, lbl, col) in enumerate(PORTS):
    rect(X1, Y1, rx, OH - 3, w, 3, fill=col)
    g.text(mm(X1, Y1, rx + w / 2, OH + 5 + (i % 2) * 6), lbl.replace(" USB-C", ""), font=F(14, True), fill=col, anchor="mt")
# 나사 보스
for (x, y) in ((8, 8), (OW - 8, 8), (8, OH - 8), (OW - 8, OH - 8)):
    c = mm(X1, Y1, x, y); g.ellipse((c[0] - 12, c[1] - 12, c[0] + 12, c[1] + 12), outline=INK, width=3)
    g.ellipse((c[0] - 5, c[1] - 5, c[0] + 5, c[1] + 5), fill=INK)
g.text((X1, Y1 + OH * S + 100), "● M2.5 나사 보스 4개 (열압입 인서트)   ※ 뒤에서 본 모습이라 좌우가 정면과 반대", font=F(17), fill=GRAY)
g.text((X0, Y0 + OH * S + 100), "※ 도면은 4 px/mm 축척의 개념도. 부품 실측 후 치수 확정", font=F(17), fill=GRAY)
im.save(f"{OUT}/enclosure_views.png")

# ------------------------------------------------------------------
# 3) 단면 (측면)
# ------------------------------------------------------------------
S2 = 9.0
im = Image.new("RGB", (1800, 760), WHITE); g = ImageDraw.Draw(im)
g.text((70, 40), "측면 단면 (Section A-A, 9 px/mm)", font=F(28, True), fill=INK)
X0, Y0 = 120, 190
D = 30  # 깊이
layers = [  # (z0, thickness, label, color)
    (0, 2.5, "앞판(베젤) 2.5 — 창 166×101", (200, 205, 212)),
    (2.5, 1.2, "e-Paper 패널 1.2", (120, 140, 170)),
    (3.7, 1.0, "완충 폼 1.0", (240, 220, 160)),
    (4.7, 2.0, "내부 지지판 2.0", (210, 215, 222)),
    (6.7, 19.5, "부품 공간 19.5 (18650 홀더 19 mm 기준)", (250, 250, 250)),
    (26.2, 2.5, "뒤판 2.5 (거치대·벽걸이 홈)", (200, 205, 212)),
]
SEC_H = 380
NUMS = "①②③④⑤⑥"
for z0, t, lbl, col in layers:
    g.rectangle((X0 + z0 * S2, Y0, X0 + (z0 + t) * S2, Y0 + SEC_H), fill=col, outline=INK, width=2)
# 번호 (위쪽에 엇갈리게) + 범례
for i, (z0, t, lbl, col) in enumerate(layers):
    xx = X0 + (z0 + t / 2) * S2
    ny = Y0 - 18 - (i % 3) * 30
    g.line((xx, Y0, xx, ny + 10), fill=GRAY, width=1)
    g.text((xx, ny), NUMS[i], font=F(20, True), fill=INK, anchor="mm")
    ly = Y0 + 10 + i * 46
    g.rectangle((470, ly, 496, ly + 26), fill=col, outline=INK, width=1)
    g.text((508, ly + 13), f"{NUMS[i]} {lbl}", font=F(17), fill=INK, anchor="lm")
cx = X0 + (6.7 + 9.75) * S2
g.ellipse((cx - 9 * S2, Y0 + 40, cx + 9 * S2, Y0 + 40 + 18 * S2), outline=(200, 120, 0), width=4, fill=(255, 240, 210))
g.text((cx, Y0 + 40 + 9 * S2), "18650", font=F(18, True), fill=INK, anchor="mm")
g.text((X0, Y0 + SEC_H + 30), f"전체 두께 약 {D} mm (거치대 제외)", font=F(19, True), fill=GRAY)
# 접이식 거치대
kx = X0 + 28.7 * S2
g.line((kx, Y0 + 200, kx + 150, Y0 + SEC_H + 60), fill=INK, width=8)
g.text((kx + 60, Y0 + SEC_H + 92), "접이식 거치대 (약 15° 기울기)", font=F(17, True), fill=INK, anchor="lm")

# 설계 메모
nx = 900
g.rounded_rectangle((nx, 120, 1740, 700), 14, fill=(247, 249, 252), outline=GRAY, width=2)
memo = [
    ("재질/출력", "PETG 또는 PLA, 벽 두께 2.5 mm, 0.2 mm 레이어"),
    ("패널 고정", "앞판 포켓 171 × 112 × 1.5 (사방 0.4 mm 여유), 폼으로 눌러 고정"),
    ("창 위치", "표시 영역 기준으로 맞춤 (패널 FPC 쪽 테두리가 더 넓음)"),
    ("FPC", "급하게 꺾지 말 것, 굽힘 반경 ≥ 1 mm, 접착 테이프로 고정"),
    ("배터리", "홀더를 지지판에 나사 고정, 셀 교체 가능하도록 뒤판 탈착"),
    ("구멍", "측면 버튼 1 · 하단 충전 USB-C · 전원 스위치 · 업로드 USB-C"),
    ("안테나", "SuperMini 칩 안테나 주변 10 mm 금속·배터리 피하기"),
    ("결합", "앞판-뒤판 M2.5 × 4개 (열압입 인서트), 뒤판에 벽걸이 키홀 2개"),
]
for i, (k, v) in enumerate(memo):
    y = 150 + i * 66
    g.text((nx + 26, y), k, font=F(20, True), fill=NAVY)
    g.text((nx + 26, y + 28), v, font=F(18), fill=INK)
im.save(f"{OUT}/enclosure_section.png")
print("ok")
