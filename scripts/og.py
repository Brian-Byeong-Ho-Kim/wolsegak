# 링크 미리보기 이미지(public/og/*.png, 1200x630)를 만든다. 문구를 바꿀 때만 다시 실행.
# 사용: python3 scripts/og.py   (Pillow, Noto Sans CJK 필요)
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'og')
os.makedirs(OUT, exist_ok=True)
FONT = '/usr/share/fonts/opentype/noto/NotoSansCJK-{}.ttc'

def font(w, size):
    for i in range(6):
        f = ImageFont.truetype(FONT.format(w), size, index=i)
        if 'KR' in f.getname()[0]:
            return f
    return ImageFont.truetype(FONT.format(w), size)

BRAND, INK, BG = (255, 107, 61), (31, 26, 23), (255, 248, 243)
VARIANTS = {
    'default': (BRAND, '이 월세, 각 나오나?', '직방·다방에서 본 방, 실거래랑 비교해 보세요'),
    'good':    ((22, 163, 74), '시세보다 싼 편이래요', '같은 동네 비슷한 집 실거래와 비교한 결과'),
    'ok':      ((37, 99, 235), '적정한 편이래요', '같은 동네 비슷한 집 실거래와 비교한 결과'),
    'warn':    ((217, 119, 6), '조금 비싼 편이래요', '같은 동네 비슷한 집 실거래와 비교한 결과'),
    'bad':     ((220, 38, 38), '시세보다 비싼 편이래요', '같은 동네 비슷한 집 실거래와 비교한 결과'),
    'bait':    ((220, 38, 38), '너무 싸요, 미끼매물 주의', '실제로 있는 방인지 꼭 확인하세요'),
}

def logo(d, x, y, s):
    d.rounded_rectangle([x, y, x + s, y + s], radius=int(s * .22), fill=BRAND)
    k = s / 64
    d.polygon([(x + 10 * k, y + 32 * k), (x + 32 * k, y + 13 * k), (x + 54 * k, y + 32 * k), (x + 54 * k, y + 51 * k), (x + 10 * k, y + 51 * k)], fill='white')
    d.line([(x + 22 * k, y + 37 * k), (x + 29 * k, y + 44 * k), (x + 42 * k, y + 30 * k)], fill=BRAND, width=int(6 * k), joint='curve')

for name, (color, title, sub) in VARIANTS.items():
    im = Image.new('RGB', (1200, 630), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 1200, 18], fill=color)
    logo(d, 80, 80, 96)
    d.text((200, 82), '월세각', font=font('Black', 54), fill=INK)
    d.text((202, 146), 'wolsegak.com', font=font('Medium', 28), fill=(109, 99, 92))
    f = font('Black', 92)
    while d.textlength(title, font=f) > 1040:
        f = font('Black', f.size - 4)
    d.text((80, 268), title, font=f, fill=color if name != 'default' else INK)
    d.text((82, 400), sub, font=font('Medium', 40), fill=(109, 99, 92))
    d.rounded_rectangle([80, 500, 1120, 560], radius=14, fill=(255, 241, 232))
    d.text((104, 511), '국토교통부 전월세 실거래가 · 무료 서비스', font=font('Medium', 28), fill=(194, 65, 12))
    im.save(os.path.join(OUT, f'{name}.png'), optimize=True)
    print(name)
