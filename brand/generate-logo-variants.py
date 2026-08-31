"""
Prepare les declinaisons du logo DEL a partir du PNG fourni.

Le fichier source est un rendu dore avec biseau et reflets. Pour le lockup
d'en-tete on garde uniquement la silhouette (canal alpha), teintee en une
seule couleur : c'est ce qui reste net a 28 px de haut et qui s'accorde avec
la palette desaturee du site. La version doree d'origine est conservee pour
les usages ou elle a du sens (partage social, supports imprimes).
"""

import pathlib
from PIL import Image

SRC = pathlib.Path(r"C:\Users\latitude\Downloads\ChatGPT Image Aug 31, 2026, 05_44_24 PM.png")
OUT = pathlib.Path(r"C:\DelHerren\public\media")
OUT.mkdir(parents=True, exist_ok=True)

img = Image.open(SRC).convert("RGBA")
alpha = img.getchannel("A")

# Rogne les marges transparentes. Seuil bas : on ignore le halo residuel.
mask = alpha.point(lambda v: 255 if v > 24 else 0)
bbox = mask.getbbox()
if bbox is None:
    raise SystemExit("logo vide")
print("bbox", bbox, "source", img.size)

trimmed = img.crop(bbox)
trimmed_alpha = trimmed.getchannel("A")
w, h = trimmed.size
print("trimmed", trimmed.size)


def save_gold(height: int, name: str) -> None:
    ratio = height / h
    out = trimmed.resize((max(1, round(w * ratio)), height), Image.LANCZOS)
    out.save(OUT / name, optimize=True)
    print("wrote", name, out.size)


def save_tinted(height: int, rgb: tuple, name: str) -> None:
    ratio = height / h
    size = (max(1, round(w * ratio)), height)
    a = trimmed_alpha.resize(size, Image.LANCZOS)
    out = Image.new("RGBA", size, rgb + (0,))
    out.putalpha(a)
    out.save(OUT / name, optimize=True)
    print("wrote", name, size)


CARBON = (33, 31, 28)     # --carbon
PAPER = (251, 248, 242)   # --paper
BRASS = (140, 112, 74)    # --brass, version doree assagie

save_gold(512, "logo-gold.png")
save_tinted(256, CARBON, "logo-carbon.png")
save_tinted(256, PAPER, "logo-paper.png")
save_tinted(512, BRASS, "logo-brass.png")

# Marque seule sur fond transparent, carree, pour les icones PWA et le favicon
def save_square(size: int, rgb: tuple, bg: tuple | None, name: str, pad: float = 0.18) -> None:
    inner = round(size * (1 - pad * 2))
    ratio = min(inner / w, inner / h)
    mw, mh = max(1, round(w * ratio)), max(1, round(h * ratio))
    a = trimmed_alpha.resize((mw, mh), Image.LANCZOS)
    mark = Image.new("RGBA", (mw, mh), rgb + (0,))
    mark.putalpha(a)
    canvas = Image.new("RGBA", (size, size), (bg + (255,)) if bg else (0, 0, 0, 0))
    canvas.alpha_composite(mark, ((size - mw) // 2, (size - mh) // 2))
    canvas.save(OUT / name, optimize=True)
    print("wrote", name, canvas.size)


ICONS = pathlib.Path(r"C:\DelHerren\public")
for size, name in ((192, "icon-192.png"), (512, "icon-512.png")):
    inner = round(size * 0.64)
    ratio = min(inner / w, inner / h)
    mw, mh = max(1, round(w * ratio)), max(1, round(h * ratio))
    a = trimmed_alpha.resize((mw, mh), Image.LANCZOS)
    mark = Image.new("RGBA", (mw, mh), CARBON + (0,))
    mark.putalpha(a)
    canvas = Image.new("RGBA", (size, size), (251, 248, 242, 255))
    canvas.alpha_composite(mark, ((size - mw) // 2, (size - mh) // 2))
    canvas.save(ICONS / name, optimize=True)
    print("wrote", name, canvas.size)

# Favicon multi-tailles
fav = Image.open(ICONS / "icon-512.png")
fav.save(ICONS / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("wrote favicon.ico")
