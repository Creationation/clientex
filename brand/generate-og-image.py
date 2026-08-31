"""Genere l'image Open Graph 1200x630 avec le logo et le lockup."""

import pathlib
from PIL import Image, ImageDraw, ImageFont

PUB = pathlib.Path(r"C:\DelHerren\public")
MARK = PUB / "media" / "logo-carbon.png"

PAPER = (251, 248, 242)
CARBON = (33, 31, 28)
STONE = (109, 104, 98)
BRASS = (140, 112, 74)

W, H = 1200, 630
canvas = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(canvas)


def font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


serif = font(r"C:\Windows\Fonts\georgia.ttf", 88)
serif_small = font(r"C:\Windows\Fonts\georgiai.ttf", 46)
sans = font(r"C:\Windows\Fonts\segoeui.ttf", 22)
sans_bold = font(r"C:\Windows\Fonts\segoeuib.ttf", 20)

# Marque
mark = Image.open(MARK).convert("RGBA")
mh = 150
mark = mark.resize((round(mark.width * mh / mark.height), mh), Image.LANCZOS)
canvas.paste(mark, (92, 120), mark)


def tracked(xy, text, fnt, fill, tracking=0):
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x


tracked((94, 316), "DEL", serif, CARBON, 10)
draw.text((94, 428), "Herren Friseur & Barber Shop", font=serif_small, fill=BRASS)

draw.line([(96, 512), (200, 512)], fill=BRASS, width=2)
tracked((94, 546), "ERZHERZOG-KARL-STRASSE 60  ·  1220 WIEN  ·  +43 660 87511680",
        sans_bold, STONE, 1.4)

canvas.save(PUB / "og-image.png", optimize=True)
print("wrote og-image.png", canvas.size)
