# Hok Gong — app icons.
#
#   python build/make-icons.py
#
# The mark is the app's own subject: a pitch contour. Two strokes on a red
# field — one rising (tone 2) and one level below it (tone 6) — which is the
# contrast the app spends its time teaching. Drawn at 4x and downsampled so
# the curve stays clean at 48px.
#
# No character is used in the mark. A CJK glyph would need a bundled font, and
# at 48 pixels 學 turns to mush.

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'app', 'icons')
os.makedirs(OUT, exist_ok=True)

RED = (154, 42, 34)          # --accent
PAPER = (251, 247, 240)      # --bg
LINE = (255, 255, 255, 235)
FAINT = (255, 255, 255, 70)


def curve(draw, pts, width, fill):
    draw.line(pts, fill=fill, width=width, joint='curve')
    r = width // 2
    for (x, y) in (pts[0], pts[-1]):
        draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def mark(size, pad):
    """The icon at 4x, then downsampled."""
    s = size * 4
    p = pad * 4
    img = Image.new('RGBA', (s, s), RED + (255,))
    d = ImageDraw.Draw(img)
    inner = s - 2 * p
    # Three faint rails: the five-point Chao scale, top, middle and bottom.
    for k in (0, 0.5, 1):
        y = p + inner * (0.22 + 0.56 * k)
        d.line([(p, y), (s - p, y)], fill=FAINT, width=max(2, s // 180))
    w = max(6, s // 22)
    # Tone 2, low to high: the rise a learner has to hear and then produce.
    rise = [(p + inner * t, p + inner * (0.78 - 0.56 * t ** 1.6)) for t in
            [i / 24 for i in range(25)]]
    curve(d, rise, w, LINE)
    # Tone 6, level and low, underneath it.
    flat = [(p + inner * 0.08, p + inner * 0.92), (p + inner * 0.62, p + inner * 0.92)]
    curve(d, flat, w, FAINT)
    return img.resize((size, size), Image.LANCZOS)


def write(name, img):
    img.convert('RGB').save(os.path.join(OUT, name))
    print('  ' + name, img.size[0])


print('icons:')
write('icon-192.png', mark(192, 34))
write('icon-512.png', mark(512, 92))
# Maskable: the same mark with more room, so a circular crop keeps it whole.
write('icon-maskable-512.png', mark(512, 138))
write('apple-touch-icon.png', mark(180, 30))
