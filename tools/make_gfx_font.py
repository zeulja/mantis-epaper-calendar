# Adafruit GFX 폰트 헤더 생성기 (fontconvert 와 동일 방식: 141 dpi, 1비트 렌더)
# 사용: python3 make_gfx_font.py FreeSans.ttf 14 FreeSans14pt_digits 48 57 > out.h
import sys, freetype
path, pt, name, first, last = sys.argv[1], float(sys.argv[2]), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
face = freetype.Face(path); face.set_char_size(int(pt * 64), 0, 141, 141)
bits = bytearray(); glyphs = []
acc = 0; nb = 0
def flush():
    global acc, nb
    if nb: bits.append(acc << (8 - nb)); acc = 0; nb = 0
for c in range(first, last + 1):
    face.load_char(chr(c), freetype.FT_LOAD_TARGET_MONO | freetype.FT_LOAD_RENDER)
    g = face.glyph; bm = g.bitmap
    off = len(bits)
    for y in range(bm.rows):
        for x in range(bm.width):
            byte = bm.buffer[y * bm.pitch + (x >> 3)]
            bit = (byte >> (7 - (x & 7))) & 1
            acc = (acc << 1) | bit; nb += 1
            if nb == 8: bits.append(acc); acc = 0; nb = 0
    flush()
    glyphs.append((off, bm.width, bm.rows, g.advance.x >> 6, g.bitmap_left, 1 - g.bitmap_top))
ya = face.size.height >> 6
print("#pragma once\n// 자동 생성: tools/make_gfx_font.py %s %g pt, chars 0x%02X-0x%02X" % (path.split('/')[-1], pt, first, last))
print("const uint8_t %sBitmaps[] PROGMEM = {" % name)
for i in range(0, len(bits), 12): print("  " + ", ".join("0x%02X" % b for b in bits[i:i+12]) + ",")
print("};\nconst GFXglyph %sGlyphs[] PROGMEM = {" % name)
for c, g in zip(range(first, last + 1), glyphs): print("  {%5d, %3d, %3d, %3d, %4d, %4d},  // 0x%02X '%s'" % (*g, c, chr(c)))
print("};\nconst GFXfont %s PROGMEM = {(uint8_t *)%sBitmaps, (GFXglyph *)%sGlyphs, 0x%02X, 0x%02X, %d};" % (name, name, name, first, last, ya))
