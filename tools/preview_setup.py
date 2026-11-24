# Wi-Fi 설정 화면 미리보기 (PC 근사 렌더링). 사용: python3 tools/preview_setup.py out.png
import sys, os, qrcode
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = "/usr/share/fonts/truetype/freefont/"
def f(pt, bold=False): return ImageFont.truetype(FS + ("FreeSansBold.ttf" if bold else "FreeSans.ttf"), int(pt * 141 / 72))
B, W, R = (0, 0, 0), (255, 255, 255), (200, 20, 20)
ap, pw = "MANTIS-CAL-3A7F", "k7mqx2vh"
img = Image.new("RGB", (800, 480), W); g = ImageDraw.Draw(img)
q = qrcode.QRCode(version=4, error_correction=qrcode.constants.ERROR_CORRECT_M, border=0, box_size=1)
q.add_data(f"WIFI:T:WPA;S:{ap};P:{pw};;"); q.make(fit=False); m = q.get_matrix()
sc = 9; sz = len(m) * sc; x0, y0 = 200 - sz // 2, 205 - sz // 2
for y, row in enumerate(m):
    for x, v in enumerate(row):
        if v: g.rectangle([x0 + x*sc, y0 + y*sc, x0 + x*sc + sc - 1, y0 + y*sc + sc - 1], fill=B)
g.rectangle([32, 37, 367, 372], outline=B)
g.text((200, 410), ap, font=f(12, True), fill=B, anchor="mm")
g.text((200, 444), "PW  " + pw, font=f(12, True), fill=B, anchor="mm")
X = 410
g.text((X, 62), "Wi-Fi Setup", font=f(18, True), fill=R, anchor="ls")
steps = [("Scan the QR code with your phone", "camera to join the setup Wi-Fi."),
         ("The setup page opens automatically.", "If not, open 192.168.4.1 in a browser."),
         ("Tap [Configure WiFi], pick your Wi-Fi,", "enter the password and tap [Save]."),
         ("The calendar appears once connected.", "")]
y = 112
for i, (a, b) in enumerate(steps):
    g.text((X, y), f"{i+1}.", font=f(12, True), fill=B, anchor="ls")
    g.text((X + 28, y - 2), a, font=f(9), fill=B, anchor="ls")
    if b: g.text((X + 28, y + 20), b, font=f(9), fill=B, anchor="ls")
    y += 62
g.rectangle([X, 372, X + 369, 372], fill=B)
for yy, t in ((384, "No input for 10 minutes -> power saving mode."), (398, "To set up again: hold the side button"), (412, "for 3 seconds.")):
    g.text((X, yy), t, fill=B)
lg = Image.open(ROOT + "/assets/mantis_logo_1bit.png").convert("L")
img.paste(B, (800 - 20 - lg.width, 458), Image.eval(lg, lambda v: 255 - v))
img.save(sys.argv[1] if len(sys.argv) > 1 else "preview_setup.png")
