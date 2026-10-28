"""Applique le cadrage uniforme à public/photos (sauvegarde des originaux modifiés + rapport CSV),
puis régénère les vignettes 640 px (public/photos-sm) des photos modifiées et des machines de la landing."""
import os, sys, json, csv, shutil
sys.path.insert(0, os.path.dirname(__file__))
from cadrage import *  # scripts/photos/cadrage.py
from concurrent.futures import ProcessPoolExecutor
SITE, BACKUP, REPORT = sys.argv[1], sys.argv[2], sys.argv[3]
PHOTOS = os.path.join(SITE, "public/photos"); SM = os.path.join(SITE, "public/photos-sm")
INTERIEUR_OK = ("ecp-series", "sl-series", "it95-series", "itf8-series", "ac-series", "exoform", "xsc-series", "r-series", "ifp-series")
LP = set("it9515 it9522 it9528 it9537 it9530 itf8102 itf8202 itf8501 itf8802 itf8618 itf8203 itf8722 itf8721 sl7001 sl7002 sl7003 sl7004 sl7005 sl7007 sl7006 sl7017 sl7019 sl7020 sl7028 sl7029 sl7038 sl7046 ifp1103 ifp1201 ifp1206 ifp1302 ifp1604 ifp1605 ifp1615 ifp1623 ifp1707 ifp1101 ifp1301 ifp1305 ifp1616 ifp1614 ecp101 ecp201 ecp301 ecp302 ecp617 ecp713 ecp721 ecp103".split())

def vignette(rel):
    src = os.path.join(PHOTOS, rel); dst = os.path.join(SM, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = Image.open(src); im.load()
    if im.width > 640: im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    im.save(dst, "WEBP", quality=76, method=4)

def one(rel):
    path = os.path.join(PHOTOS, rel)
    im = Image.open(path); im.load(); a = analyse(im); why = eligible(a); f = fill(a)
    out, mode = None, ""
    if "_autres-visuels" in rel: why = "visuel d'ambiance"
    elif not why:
        if abs(f - TARGET) >= 0.04: out, mode = cadrer(im, a), "carré + marges"
    elif why == "machine coupée par le bord" and rel.split("/")[0] in INTERIEUR_OK:
        out, why2 = recadrage_interieur(im, a)
        if out is not None: mode, why = "recadrage dans l'image", ""
        else: why = why2
    if out is not None:
        b = os.path.join(BACKUP, rel); os.makedirs(os.path.dirname(b), exist_ok=True)
        if not os.path.exists(b): shutil.copy2(path, b)
        out.save(path, "WEBP", quality=86, method=6)
    changed = out is not None
    parts = rel.split("/")
    if changed and os.path.exists(os.path.join(SM, rel)) or (parts[1] in LP and "_autres-visuels" not in rel):
        vignette(rel)
    return dict(photo=rel, avant=f"{im.width}x{im.height}", apres=(f"{out.width}x{out.height}" if changed else ""), occupation_avant=round(f, 2), action=mode or "inchangée", raison=why)

if __name__ == "__main__":
    rels = []
    for d, _, fs in os.walk(PHOTOS):
        rels += [os.path.relpath(os.path.join(d, x), PHOTOS) for x in fs if x.endswith(".webp")]
    with ProcessPoolExecutor() as ex: res = list(ex.map(one, sorted(rels), chunksize=8))
    with open(REPORT, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=list(res[0].keys()), delimiter=";"); w.writeheader(); w.writerows(res)
    import collections
    print(collections.Counter(r["action"] for r in res)); print("FINI")
