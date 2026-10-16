"""Applique la sélection de photos aux données du site (mode démo).

- copie les WebP utilisés vers public/photos/<gamme>/<ref>/[couleur/]fichier.webp (chemins en minuscules, sans espaces)
- products.image_url / hover_image_url = 2 premières vues de la couleur par défaut
- products.default_color = couleur par défaut (ou null)
- product_images = toutes les autres photos (toutes couleurs), avec le champ color
- sauvegarde l'ancien data.json en data.before-photos.json (hors bundle : dans /home/claude/sel)
"""
import json, os, re, shutil, uuid, datetime, collections

SITE = "/home/claude/impulse"
DATA = f"{SITE}/src/integrations/demo/data.json"
WEB = "/home/claude/web01"
OUT = f"{SITE}/public/photos"
SEL = json.load(open("/home/claude/sel/selection.json"))

def slug(seg):
    seg = seg.lower().replace(" ", "-")
    return re.sub(r"[^a-z0-9+._-]", "-", seg)

def web_path(rel):
    return "/photos/" + "/".join(slug(s) for s in rel.split("/"))

COLOR_LABEL = {"noir": "noir", "rouge": "rouge", "argent": "argent", "argent-rouge": "argent / rouge",
               "blanc-noir": "blanc / noir", "noir-marron": "noir / marron", "jaune": "jaune"}

db = json.load(open(DATA, encoding="utf-8"))
backup = "/home/claude/sel/data.before-photos.json"
if not os.path.exists(backup):
    shutil.copy(DATA, backup)
else:  # toujours repartir de l'original pour pouvoir rejouer le script
    db = json.load(open(backup, encoding="utf-8"))

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
now = datetime.datetime.utcnow().isoformat() + "+00:00"
prods = {p["id"]: p for p in db["products"]}
stats = collections.Counter()
new_gallery = [g for g in db["product_images"] if g["product_id"] not in SEL]
copied = set()

for pid, s in SEL.items():
    p = prods[pid]
    imgs = s["images"]
    dc = s["default_color"] or None
    for im in imgs:
        dst = OUT + web_path(im["p"])[len("/photos"):]
        if dst not in copied:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(WEB, im["p"]), dst)
            copied.add(dst)
    main_col = imgs[0]["color"]
    same = [i for i in imgs if i["color"] == main_col]
    p["image_url"] = web_path(same[0]["p"])
    p["hover_image_url"] = web_path(same[1]["p"]) if len(same) > 1 else None
    p["default_color"] = main_col or None
    p["updated_at"] = now
    used = {same[0]["p"]} | ({same[1]["p"]} if len(same) > 1 else set())
    order = 0
    name = re.sub(r"\s+", " ", p["name"]).strip()
    for im in imgs:
        if im["p"] in used:
            continue
        col = im["color"] or None
        new_gallery.append({
            "id": str(uuid.uuid4()), "product_id": pid, "image_url": web_path(im["p"]),
            "alt_text": f"{name}" + (f" – {COLOR_LABEL.get(col, col)}" if col else ""),
            "color": col, "sort_order": order, "created_at": now,
        })
        order += 1
    stats["produits"] += 1
    stats["photos"] += len(imgs)

for p in db["products"]:
    p.setdefault("default_color", None)
for g in new_gallery:
    g.setdefault("color", None)
db["product_images"] = new_gallery
json.dump(db, open(DATA, "w", encoding="utf-8"), ensure_ascii=False)
print(dict(stats), "| fichiers copiés", len(copied), "| galerie", len(new_gallery))
