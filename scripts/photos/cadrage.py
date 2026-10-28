"""Cadrage uniforme des photos produit sur fond blanc : machine centrée sur un carré, côté le plus long = TARGET du carré."""
import os, sys, json, statistics
from PIL import Image, ImageDraw
TARGET = 0.86      # la machine occupe 86 % du côté (comme IFP1201, jugée bonne)
THRESH = 242       # pixel « contenu » s'il est plus sombre que ça
MAXSIDE = 1400

def to_rgb(im):
    """Les détourages avec transparence sont posés sur du blanc (comme sur le site)."""
    if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
        im = im.convert("RGBA"); bgw = Image.new("RGBA", im.size, (255, 255, 255, 255)); bgw.alpha_composite(im); return bgw.convert("RGB")
    return im.convert("RGB")

def analyse(im):
    rgb = to_rgb(im)
    small = rgb.copy(); small.thumbnail((500, 500))
    sw, sh = small.size; px = small.load()
    border = [px[x, 0] for x in range(sw)] + [px[x, sh-1] for x in range(sw)] + [px[0, y] for y in range(sh)] + [px[sw-1, y] for y in range(sh)]
    lum = [sum(p) / 3 for p in border]
    bg = tuple(int(statistics.median(c[i] for c in border)) for i in range(3))
    g = small.convert("L").point(lambda v: 255 if v < THRESH else 0)
    bb = g.getbbox()
    return dict(mean=sum(lum)/len(lum), mn=min(lum), bg=bg, bb=bb, sw=sw, sh=sh)

def eligible(a):
    if a["bb"] is None: return "vide"
    if a["mean"] < 246 or a["mn"] < 225 or min(a["bg"]) < 244: return "fond non blanc"
    x0, y0, x1, y1 = a["bb"]
    if x0 <= 1 or y0 <= 1 or x1 >= a["sw"] - 1 or y1 >= a["sh"] - 1: return "machine coupée par le bord"
    return ""

def cadrer(im, a):
    rgb = to_rgb(im); W, H = rgb.size
    k = W / a["sw"]
    x0, y0, x1, y1 = [v * k for v in a["bb"]]
    bw, bh = x1 - x0, y1 - y0
    S = int(round(max(bw, bh) / TARGET))
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    out = Image.new("RGB", (S, S), a["bg"])
    out.paste(rgb, (int(round(S / 2 - cx)), int(round(S / 2 - cy))))
    if S > MAXSIDE: out = out.resize((MAXSIDE, MAXSIDE), Image.LANCZOS)
    return out

def fill(a):
    if not a["bb"]: return 0
    x0, y0, x1, y1 = a["bb"]
    # occupation si l'image était montrée dans un carré (cartes et fiches sont carrées)
    side = max(a["sw"], a["sh"])
    return max(x1 - x0, y1 - y0) / side

THRESH_SOL = 215   # images avec sol gris dégradé (rendus ECP, I-Zone…) : la machine est plus sombre que le sol

def recadrage_interieur(im, a):
    """Recadrage carré DANS l'image (sans ajouter de fond) : pour les rendus dont le sol touche le bord.
    Renvoie (image, "") ou (None, raison)."""
    rgb = to_rgb(im); W, H = rgb.size
    small = rgb.copy(); small.thumbnail((500, 500)); sw, sh = small.size; k = W / sw
    g = small.convert("L")
    bb = g.point(lambda v: 255 if v < THRESH_SOL else 0).getbbox()
    if not bb: return None, "vide"
    x0, y0, x1, y1 = bb
    if x0 <= 1 or y0 <= 1 or x1 >= sw - 1 or y1 >= sh - 1: return None, "machine coupée par le bord"
    bw, bh = (x1 - x0) * k, (y1 - y0) * k
    S = min(max(bw, bh) / TARGET, W, H)
    if S < max(bw, bh) * 1.02: return None, "pas de carré possible"
    cx, cy = (x0 + x1) / 2 * k, (y0 + y1) / 2 * k
    left = min(max(cx - S / 2, 0), W - S); top = min(max(cy - S / 2, 0), H - S)
    box = (int(left), int(top), int(left + S), int(top + S))
    # sécurité : rien de sombre ne doit rester hors du cadre
    dark = g.point(lambda v: 255 if v < 230 else 0)
    sb = [int(v / k) for v in box]
    total = sum(1 for v in dark.getdata() if v)
    inside = sum(1 for v in dark.crop(sb).getdata() if v)
    if total and (total - inside) / total > 0.002: return None, "contenu hors cadre"
    # gain trop faible : on garde l'original
    if S > min(W, H) * 0.97 and abs(W - H) / max(W, H) < 0.05: return None, "déjà bien cadrée"
    out = rgb.crop(box)
    if out.width > MAXSIDE: out = out.resize((MAXSIDE, MAXSIDE), Image.LANCZOS)
    return out, ""
