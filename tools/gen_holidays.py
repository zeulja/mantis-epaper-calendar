# 대한민국 공휴일 표 생성기 (양력 변환 + 대체공휴일 규칙, 2023년 개정 기준)
import datetime as dt, sys
from korean_lunar_calendar import KoreanLunarCalendar
Y0, Y1 = int(sys.argv[1]), int(sys.argv[2])
NAMES = ["NEW YEAR'S DAY","SEOLLAL","SAMILJEOL","CHILDREN'S DAY","BUDDHA'S BIRTHDAY",
         "MEMORIAL DAY","LIBERATION DAY","CHUSEOK","GAECHEONJEOL","HANGEUL DAY",
         "CHRISTMAS","SUBSTITUTE HOLIDAY","ELECTION DAY"]
# 선거일 등 임시공휴일 (확정된 것만)
EXTRA = {dt.date(2026,6,3): 12}
def lunar(y,m,d):
    c=KoreanLunarCalendar(); c.setLunarDate(y,m,d,False); return dt.date.fromisoformat(c.SolarIsoFormat())
out={}
for y in range(Y0,Y1+1):
    H={}   # date -> name idx
    groups=[]  # (dates, rule) rule: 'sun' or 'weekend'
    def add(ds,n,rule):
        for d in ds: H.setdefault(d,n)
        groups.append((ds,n,rule))
    add([dt.date(y,1,1)],0,None)
    s=lunar(y,1,1); add([s-dt.timedelta(1),s,s+dt.timedelta(1)],1,'sun')
    add([dt.date(y,3,1)],2,'weekend')
    add([dt.date(y,5,5)],3,'weekend')
    add([lunar(y,4,8)],4,'weekend')
    add([dt.date(y,6,6)],5,None)
    add([dt.date(y,8,15)],6,'weekend')
    c=lunar(y,8,15); add([c-dt.timedelta(1),c,c+dt.timedelta(1)],7,'sun')
    add([dt.date(y,10,3)],8,'weekend')
    add([dt.date(y,10,9)],9,'weekend')
    add([dt.date(y,12,25)],10,'weekend')
    for d,n in EXTRA.items():
        if d.year==y: H.setdefault(d,n)
    # 겹침 수 세기
    cnt={}
    for ds,n,r in groups:
        for d in ds: cnt[d]=cnt.get(d,0)+1
    for ds,n,rule in groups:
        if not rule: continue
        need=0
        for d in ds:
            if d.weekday()==6 or cnt[d]>1 or (rule=='weekend' and d.weekday()==5): need+=1
        nd=max(ds)
        while need:
            nd+=dt.timedelta(1)
            if nd.weekday()<5 and nd not in H:
                H[nd]=11; need-=1
    out.update(H)
items=sorted(out.items())
print("#pragma once\n// 자동 생성: tools/gen_holidays.py %d %d  (대한민국 공휴일 + 대체공휴일)" % (Y0,Y1))
print("// 표 범위 밖의 연도는 양력 고정 공휴일만 표시됩니다. 선거일 등 임시공휴일은 생성기의 EXTRA에 추가.")
print("#define HOLIDAY_TABLE_FIRST_YEAR %d\n#define HOLIDAY_TABLE_LAST_YEAR %d" % (Y0,Y1))
print("static const char* const HOLIDAY_NAMES[] = {"+", ".join('"%s"'%n.replace("'","\\'") for n in NAMES)+"};")
print("struct Holiday { uint32_t ymd; uint8_t name; };")
print("static const Holiday HOLIDAYS[] = {")
for d,n in items: print("  {%d, %d},  // %s %s" % (d.year*10000+d.month*100+d.day, n, d.strftime('%a'), NAMES[n]))
print("};\nstatic const size_t HOLIDAY_COUNT = sizeof(HOLIDAYS) / sizeof(HOLIDAYS[0]);")
