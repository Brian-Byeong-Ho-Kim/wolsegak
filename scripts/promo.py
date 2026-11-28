# SNS 카드 이미지(public/promo/*.png, 1080x1350)를 만든다. 사용: python3 scripts/promo.py
from PIL import Image, ImageDraw, ImageFont
import os
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'promo'); os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-{}.ttc'
def font(w, size):
    for i in range(6):
        f = ImageFont.truetype(FONT.format(w), size, index=i)
        if 'KR' in f.getname()[0]: return f
    return ImageFont.truetype(FONT.format(w), size)
BRAND, INK, BG, SUB, SOFT = (255,107,61), (31,26,23), (255,248,243), (109,99,92), (255,241,232)
W, H = 1080, 1350

def base():
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    d.rectangle([0,0,W,20], fill=BRAND)
    d.rounded_rectangle([70,70,150,150], radius=18, fill=BRAND)
    k = 80/64; x, y = 70, 70
    d.polygon([(x+10*k,y+32*k),(x+32*k,y+13*k),(x+54*k,y+32*k),(x+54*k,y+51*k),(x+10*k,y+51*k)], fill='white')
    d.line([(x+22*k,y+37*k),(x+29*k,y+44*k),(x+42*k,y+30*k)], fill=BRAND, width=int(6*k), joint='curve')
    d.text((172,72), '월세각', font=font('Black',48), fill=INK)
    d.text((174,130), 'wolsegak.com', font=font('Medium',26), fill=SUB)
    return im, d

def fit(d, text, w, size, weight='Black', minsize=40):
    f = font(weight, size)
    while d.textlength(text, font=f) > w and f.size > minsize: f = font(weight, f.size-2)
    return f

def foot(d, text='국토교통부 전월세 실거래가 기준 · 참고용'):
    d.rounded_rectangle([70,1230,W-70,1290], radius=14, fill=SOFT)
    d.text((96,1241), text, font=font('Medium',28), fill=(194,65,12))

def title(d, lines, y=230, size=84, color=INK):
    for ln in lines:
        d.text((70,y), ln, font=fit(d, ln, W-140, size), fill=color); y += int(size*1.25)
    return y

# 1. 흐름 카드
im, d = base()
y = title(d, ['부동산 가기 전에', '월세 시세부터'], size=96)
d.text((72,y+4), '네이버·직방·다방에서 본 방, 그 월세 괜찮을까?', font=fit(d,'네이버·직방·다방에서 본 방, 그 월세 괜찮을까?',W-144,34,'Medium'), fill=SUB)
steps = [('1','네이버·직방·다방에서 방 찾기','마음에 드는 방의 보증금·월세·크기 확인'),
         ('2','월세각에서 실거래와 비교','링크나 매물 글을 붙여 넣으면 칸이 채워져요'),
         ('3','부동산에서 확인하고 상담','시세를 알고 가면 물어볼 게 분명해져요')]
yy = 560
for n,t,s in steps:
    d.rounded_rectangle([70,yy,W-70,yy+190], radius=26, fill='white', outline=(239,227,218), width=3)
    d.ellipse([100,yy+50,190,yy+140], fill=BRAND); d.text((145,yy+95), n, font=font('Black',52), fill='white', anchor='mm')
    d.text((220,yy+38), t, font=fit(d,t,W-330,44,'Bold'), fill=INK)
    d.text((220,yy+104), s, font=fit(d,s,W-330,30,'Medium',24), fill=SUB)
    yy += 220
foot(d); im.save(f'{OUT}/1-flow.png', optimize=True)

# 2. 학교별 격차
im, d = base()
y = title(d, ['같은 원룸인데', '월세가 이렇게 달라요'], size=84)
d.text((72,y+4), '학교 근처 원룸 중간 월세 (보증금 2천만원 이하)', font=font('Medium',32), fill=SUB)
rows = [('서강·홍대 앞 (마포구)',65,(220,38,38)),('연대·이대 앞 (서대문구)',57,(217,119,6)),('서울대 앞 (관악구)',48,(37,99,235)),('부산대 앞 (금정구)',30,(22,163,74))]
yy = 510
for name,v,c in rows:
    d.text((70,yy), name, font=font('Bold',38), fill=INK)
    d.rounded_rectangle([70,yy+60,70+int((W-300)*v/65),yy+120], radius=14, fill=c)
    d.text((70+int((W-300)*v/65)+20,yy+68), f'{v}만원', font=font('Black',44), fill=INK)
    yy += 160
d.text((72,1160), '우리 학교는? wolsegak.com 에서 학교 이름으로 검색', font=fit(d,'우리 학교는? wolsegak.com 에서 학교 이름으로 검색',W-144,30,'Medium'), fill=SUB)
foot(d, '국토교통부 실거래 2025.12~2026.11 · 구 단위 · 참고용'); im.save(f'{OUT}/2-gap.png', optimize=True)

# 3. 부동산에서 물어볼 3가지
im, d = base()
y = title(d, ['부동산에 가면', '이것부터 물어보세요'], size=88)
qs = [('월세 외에 매달 나가는 돈은?','관리비에 뭐가 포함인지, 전기·가스·인터넷은 별도인지'),
      ('이 보증금, 안전한가요?','등기부등본의 근저당과 보증금 반환 보증 가능 여부'),
      ('이 가격, 시세와 비슷한가요?','월세각에서 확인한 같은 동네 실거래와 비교해 보기')]
yy = 540
for i,(t,s) in enumerate(qs):
    d.rounded_rectangle([70,yy,W-70,yy+200], radius=26, fill='white', outline=(239,227,218), width=3)
    d.text((110,yy+34), 'Q'+str(i+1), font=font('Black',40), fill=BRAND)
    d.text((200,yy+30), t, font=fit(d,t,W-290,46,'Bold'), fill=INK)
    d.text((110,yy+110), s, font=fit(d,s,W-180,30,'Medium',24), fill=SUB)
    yy += 230
foot(d, '시세 비교는 참고 정보 · 방 상태는 직접 확인하세요'); im.save(f'{OUT}/3-ask.png', optimize=True)

# 4. 사용법
im, d = base()
y = title(d, ['매물 링크,', '그대로 붙여 넣으세요'], size=92)
d.text((72,y+4), '입력 칸이 자동으로 채워져요', font=font('Medium',36), fill=SUB)
items = [('직방·다방','매물 링크를 붙여 넣기'),('네이버 부동산','매물 글을 복사해 붙여 넣기'),('그 외 앱·카톡','보증금·월세·크기만 직접 입력')]
yy = 540
for t,s in items:
    d.rounded_rectangle([70,yy,W-70,yy+170], radius=26, fill='white', outline=(239,227,218), width=3)
    d.text((110,yy+28), t, font=font('Black',50), fill=BRAND)
    d.text((110,yy+105), s, font=font('Medium',36), fill=INK)
    yy += 200
d.text((72,1150), '→ 비슷한 집의 실거래와 비교해 결과가 나와요', font=fit(d,'→ 비슷한 집의 실거래와 비교해 결과가 나와요',W-144,32,'Bold'), fill=INK)
foot(d); im.save(f'{OUT}/4-paste.png', optimize=True)
print('ok')
