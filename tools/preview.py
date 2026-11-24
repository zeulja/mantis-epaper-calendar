# 화면 미리보기 (PC에서 근사 렌더링). 사용: python3 tools/preview.py 2026-11-21 out.png
import math, datetime, calendar, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw, ImageFont
y,m,d = map(int, sys.argv[1].split('-')); out=sys.argv[2]
H={}; hdr=open(ROOT + '/EpaperMonthDayClock/holidays_kr.h').read()
names=re.findall(r'"([^"]*)"', hdr.split('HOLIDAY_NAMES')[1].split('};')[0])
for ymd,n in re.findall(r'\{(\d{8}), (\d+)\}',hdr): H[int(ymd)]=names[int(n)].replace("\\'","'")
B,W,Rd=(0,0,0),(255,255,255),(200,20,20)
F="/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
def fr(pt): return ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",int(pt*141/72))
def f(pt,s=1): return ImageFont.truetype(F,int(pt*141/72*s))
img=Image.new("RGB",(800,480),W); g=ImageDraw.Draw(img)
def polar(r,deg,cx=240,cy=240):
    a=math.radians(deg); return (cx+round(r*math.sin(a)), cy-round(r*math.cos(a)))
def ctext(s,x,yc,font,c): g.text((x,yc),s,font=font,fill=c,anchor="mm")
def circ(p,r,**k): g.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r],**k)
def red(dd,wd): return wd in (0,6) or (y*10000+m*100+dd) in H
dt=datetime.date(y,m,d); wday=(dt.weekday()+1)%7; dim=calendar.monthrange(y,m)[1]
R=230;RT=R-28;RDN=(R+RT)/2;RM=R-64;ST=360/31
def arcseg(r0,r1,a0,a1,c):
    n=int((a1-a0)/0.5)+1
    pts=[polar(r0,a0+(a1-a0)*k/n) for k in range(n+1)]+[polar(r1,a1-(a1-a0)*k/n) for k in range(n+1)]
    g.polygon(pts,fill=c)
for dd in range(1,32):
    a=dd*ST; n=polar(RDN,a)
    if dd>dim:
        if dd==31:
            _ic=Image.open(ROOT + '/assets/mantis_icon_1bit.png').convert('L')
            img.paste((0,0,0),(n[0]-10,n[1]-10),Image.eval(_ic,lambda v:255-v))
        else: circ(n,3,outline=B)
        continue
    wd=(wday-(d-dd))%7; r=red(dd,wd)
    if dd==d: arcseg(RT,R,a-ST/2,a+ST/2,Rd if r else B); ctext(str(dd),*n,f(9),W)
    else: ctext(str(dd),*n,fr(9),Rd if r else B)
for k in range(31):
    a=(k+0.5)*ST; g.line([polar(RT,a),polar(R,a)],fill=B,width=1)
for i in range(2): circ((240,240),R-i,outline=B)
circ((240,240),RT,outline=B)
for mm in range(1,13):
    p=polar(RM,mm*30)
    ctext(str(mm),*p,fr(14.4),B)
def hand(deg,L,tail,hw):
    g.polygon([polar(L,deg),polar(hw,deg-90),polar(tail,deg+180),polar(hw,deg+90)],fill=B)
hand(m*30,RM-25,20,8); hand(d*ST,RT-3,20,8)
circ((240,240),9,fill=B); circ((240,240),3,fill=W)
X0,X1=505,790;XC=(X0+X1)//2; rr=red(d,wday); hol=H.get(y*10000+m*100+d)
ctext(str(y),XC,70,f(18),B); ctext(calendar.month_name[m].upper(),XC,120,f(12),B)
g.rectangle([X0+40,148,X1-40,149],fill=B)
ctext(str(d),XC,235,f(24,3),Rd if rr else B)
g.rectangle([X0+40,318,X1-40,319],fill=B)
ctext(["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"][wday],XC,352,f(12),Rd if rr else B)
if hol: ctext(hol,XC,388,f(9),Rd)
FR=ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",int(9*141/72))
_lg=Image.open(ROOT + '/assets/mantis_logo_1bit.png').convert('L')
_cw=6*11-1; _tw=_cw+5+_lg.width; _x0=XC-_tw//2
g.text((_x0,426),"Designed by",fill=B)
img.paste((0,0,0),(_x0+_cw+5,430-_lg.height//2),Image.eval(_lg,lambda v:255-v))
_s="SYNC on 11/16  rtc +1840ppm"; g.text((_x0,446),_s,fill=B)
img.save(out)
