# -*- coding: utf-8 -*-
"""Crée les nouvelles fiches produit (références photographiées absentes du site).
Rejouable : repart de data.before-new.json à chaque exécution."""
import json, os, re, shutil, uuid, datetime, collections, sys
sys.path.insert(0, "/home/claude/sel")
from catalogue_new import NEW, MERGE, RANGE_TXT

SITE = "/home/claude/impulse"
DATA = f"{SITE}/src/integrations/demo/data.json"
BACKUP = "/home/claude/sel/data.before-new.json"
WEB = "/home/claude/web01"; OUT = f"{SITE}/public/photos"
SEL = json.load(open("/home/claude/sel/selection_new.json"))
MSSPECS = json.load(open("/home/claude/sel/ms_specs.json"))

if not os.path.exists(BACKUP):
    shutil.copy(DATA, BACKUP)
db = json.load(open(BACKUP, encoding="utf-8"))
now = datetime.datetime.utcnow().isoformat() + "+00:00"

def slug(seg): return re.sub(r"[^a-z0-9+._-]", "-", seg.lower().replace(" ", "-"))
def web_path(rel): return "/photos/" + "/".join(slug(s) for s in rel.split("/"))
def copy(rel):
    dst = OUT + web_path(rel)[len("/photos"):]
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(os.path.join(WEB, rel), dst)

COLOR_LABEL = {"noir": "noir", "rouge": "rouge", "argent": "argent", "argent-rouge": "argent / rouge", "noir-rouge": "noir / rouge",
               "blanc-noir": "blanc / noir", "noir-marron": "noir / marron", "jaune": "jaune"}

# --- 0. corrections de données existantes ---
fixes = []
for p in db["products"]:
    if p["category"] == "fonctionnel" and p.get("subcategory") == "cages-rigs":
        p["category"], p["subcategory"] = "Fonctionnel", "Cages & Rigs"; fixes.append(p["name"])
        # ces fiches étaient invisibles (catégorie mal écrite) ; sans photo, on les garde masquées
        if not p.get("image_url"):
            p["is_published"] = False

# --- specs connues (MS : PDF client ; IF93 : catalogue distributeur) ---
def fix_specs(lst):
    out = []
    for s in lst:
        if s["label"].startswith("Dimensions") and "×" not in s["value"]:
            s = {"label": "Longueur", "value": s["value"]}
        out.append(s)
    return out
SPECS = {k: fix_specs(v) for k, v in MSSPECS.items()}
SPECS["MS12"] = [{"label": "Dimensions (L × l × H)", "value": "496 × 1313 × 2599 mm"}, {"label": "Poids", "value": "51,7 kg"}, {"label": "Pile de poids", "value": "295 lbs"}]
SPECS["MS11"] = SPECS.get("MS11", []) + [{"label": "Pile de poids", "value": "295 lbs"}]
SPECS["MS22"] = [{"label": "Dimensions (L × l × H)", "value": "240 × 2756 × 192 mm"}, {"label": "Poids", "value": "21,4 kg"}]
SPECS["IF9316"] = [{"label": "Dimensions (L × l × H)", "value": "1150 × 1105 × 1775 mm"}, {"label": "Poids net", "value": "106 kg"}, {"label": "Pile de poids", "value": "160 / 200 / 235 / 295 lbs (selon option)"}]
SPECS["IF9329"] = [{"label": "Dimensions (L × l × H)", "value": "1950 × 1460 × 1667 mm"}, {"label": "Poids", "value": "271 kg"}, {"label": "Poids max. utilisateur", "value": "150 kg"}, {"label": "Pile de poids", "value": "160 / 200 / 235 / 295 lbs (selon option)"}]

# --- specs lues dans le catalogue Impulse (PDF client, vérifiées visuellement) ---
def S(dims=None, poids=None, maxu=None, longueur=None):
    out = []
    if dims: out.append({"label": "Dimensions (L × l × H)", "value": dims + " mm"})
    if longueur: out.append({"label": "Longueur", "value": longueur + " mm"})
    if poids: out.append({"label": "Poids", "value": poids + " kg"})
    if maxu: out.append({"label": "Poids max. utilisateur", "value": maxu + " kg"})
    return out
CAT = {
    "IF9327": S("3450 × 2445 × 2338", "258,6"), "IT9503": S("1295 × 1208 × 1506", "115,5"), "IT9506": S(None, "149,6"),
    "IT9519": S("1617 × 1264 × 1508", "125,5"), "IT9526": S("1503 × 1245 × 1508", "166"),
    "IFP1614": S("1292 × 1449 × 784", "90", "100"), "IFP1623": S("1368 × 566 × 849"),
    "ITF8301": S("1718 × 1822 × 1450"), "ITF8406": S("1182 × 657 × 692"),
    "SL7001": S("1937 × 1370 × 1717", "170,5"), "SL7006": S("2226 × 1421 × 1415", "195", "150"),
    "SL7008": S("1680 × 1229 × 1636", "144", "150"), "SL7011": S("1350 × 670 × 1350", "44"),
    "SL7013": S("1562 × 914 × 1477", "56", "150"), "SL7014": S(None, "153"), "SL7020": S("2499 × 1879 × 1544"),
    "SL7040": S("1700 × 1670 × 640", "123"),
    "FF00": S("367 × 1321 × 2334", "51,6"), "FF01": S("367 × 1998 × 2334", "67"), "FF02": S("285 × 300 × 2380", "43,5"),
    "FF1011": S("1641 × 1321 × 2334", "73,3"), "FF1012": S("1641 × 1988 × 2334", "93"), "FF1013": S("345 × 270 × 2380", "62,5"),
    "FFSP": S("2338 × 675 × 1016", "190"), "FF23": S("1555 × 370 × 251", "12,1"), "FF24": S("1555 × 465 × 74", "20,6"),
    "FF25": S("1555 × 230 × 70", "7,1"), "FF44": S("236 × 194 × 200", "3,6"), "FF46": S("450 × 355 × 821", "16"),
    "FF52": S("380 × 200 × 100", "3,3"), "FF53": S("1070 × 260 × 140", "9,8"),
    "MS27": S("995 × 416 × 763", "30,8"), "MS704001": S("1559 × 865 × 210", "20,2"), "MS41": S("1340 × 400 × 77", "20"),
    "MS43": S(None, "6,8", longueur="590"), "MS44": S("280 × 240 × 180", "6"), "MS45": S(None, "7,3", longueur="559"),
    "MS50": S("325 × 101 × 50"), "MS7041": S("781 × 618 × 905", "11,2"), "MS7042": S("1440 × 169 × 76", "15,2"),
    "MS7043": S("908 × 257 × 205", "4,4"), "MS7048": S("1040 × 702 × 922"),
}
for k, v in CAT.items():
    keep = [s for s in SPECS.get(k, []) if not s["label"].startswith(("Dimensions", "Longueur", "Poids"))]
    SPECS[k] = v + keep

# --- textes / garanties de gamme repris des fiches existantes ---
by_range = collections.defaultdict(list)
for p in db["products"]:
    by_range[p.get("range_code")].append(p)
def majority(code, field):
    vals = collections.Counter((p.get(field) or "") for p in by_range.get(code, []))
    v, n = vals.most_common(1)[0] if vals else ("", 0)
    return v if v and n >= 3 else ""
def max_sort(code):
    return max([p.get("sort_order") or 0 for p in by_range.get(code, [])] + [0])

def images_for(ref):
    key = next((k for k in SEL if k.split("/")[-1] == ref), None)
    return SEL[key] if key else None

created, gallery_added = [], 0
prods_by_name = {p["name"].strip(): p for p in db["products"]}
sort_next = collections.Counter()

def attach(p, imgs, extra=None):
    """image principale + survol (couleur par défaut) + galerie toutes couleurs"""
    global gallery_added
    for im in imgs + (extra or []):
        copy(im["p"])
    main_col = imgs[0]["color"]
    same = [i for i in imgs if i["color"] == main_col]
    p["image_url"] = web_path(same[0]["p"])
    p["hover_image_url"] = web_path(same[1]["p"]) if len(same) > 1 else None
    p["default_color"] = main_col or None
    used = {same[0]["p"]} | ({same[1]["p"]} if len(same) > 1 else set())
    db["product_images"] = [g for g in db["product_images"] if g["product_id"] != p["id"]]
    name = re.sub(r"\s+", " ", p["name"]).strip(); order = 0
    for im in [i for i in imgs if i["p"] not in used] + (extra or []):
        col = im.get("color") or None
        db["product_images"].append({"id": str(uuid.uuid4()), "product_id": p["id"], "image_url": web_path(im["p"]),
            "alt_text": name + (f" – {COLOR_LABEL.get(col, col)}" if col else ""), "color": col, "sort_order": order, "created_at": now})
        order += 1; gallery_added += 1

# --- 1. nouvelles fiches ---
for ref, (name, code, usage, cat, sub, source) in NEW.items():
    s = images_for(ref)
    if not s:
        print("PAS DE PHOTOS", ref); continue
    txt = RANGE_TXT[code]
    short = f"{name} : {txt}."
    desc = majority(code, "description") or (short + " Caractéristiques techniques détaillées et options (finitions, piles de poids) disponibles sur demande auprès de notre équipe.")
    warranty = majority(code, "warranty") or None
    sort_next[code] += 1
    p = {"id": str(uuid.uuid4()), "name": name, "category": cat, "subcategory": sub, "usage_type": usage,
         "description": desc, "short_description": short, "image_url": None, "hover_image_url": None,
         "features": [], "specs": SPECS.get(ref, []), "warranty": warranty, "is_published": True, "is_trending": False,
         "sort_order": max_sort(code) + sort_next[code], "created_at": now, "updated_at": now, "range_code": code,
         "default_color": None}
    extra = None
    if ref == "IT9526":  # photos IT9526B = même machine en argent
        b = images_for("IT9526B"); extra = [dict(i, color=i["color"] or "argent") for i in b["images"]] if b else None
        imgs = [dict(i, color=i["color"] or "noir") for i in s["images"]]
        attach(p, imgs, extra)
    else:
        attach(p, s["images"])
    db["products"].append(p); created.append((ref, name, source))

# --- 2. photos rattachées à des fiches existantes ---
merged = []
def find(ref):
    return [p for p in db["products"] if re.search(rf"\b{re.escape(ref)}\b", p["name"])]
for ref, (target, color) in MERGE.items():
    if ref == "IT9526B":
        continue  # traité avec IT9526
    s = images_for(ref); targets = find(target)
    if not s or not targets:
        print("MERGE impossible", ref, target); continue
    p = targets[0]
    if color:  # ajout d'une couleur à la galerie existante
        imgs = [dict(i, color=color) for i in s["images"]]
        for im in imgs: copy(im["p"])
        existing = [g for g in db["product_images"] if g["product_id"] == p["id"]]
        cur_cols = {g.get("color") for g in existing} | {p.get("default_color")}
        if p.get("default_color") is None and len(cur_cols - {None}) == 0:
            # la fiche n'avait qu'une couleur implicite : on la nomme (argent pour FE9710)
            p["default_color"] = "argent"
            for g in existing: g["color"] = "argent"
        order = max([g["sort_order"] for g in existing] + [-1]) + 1
        for im in imgs:
            db["product_images"].append({"id": str(uuid.uuid4()), "product_id": p["id"], "image_url": web_path(im["p"]),
                "alt_text": re.sub(r"\s+", " ", p["name"]).strip() + f" – {COLOR_LABEL[color]}", "color": color, "sort_order": order, "created_at": now})
            order += 1; gallery_added += 1
        merged.append((ref, p["name"], f"couleur {color} ajoutée"))
    else:  # fiche existante sans photo : on lui donne les photos et on corrige la référence
        attach(p, s["images"])
        old = p["name"]; p["name"] = old.replace(target, ref); p["range_code"] = "ITF"; p["updated_at"] = now
        merged.append((ref, old, f"photos ajoutées, renommée « {p['name']} »"))

# ligne de gamme ITF en charges guidées (pour les Smith ITF8721 / ITF8722)
if not any(r["code"] == "ITF" and r["subcategory"] == "charges-guidees" for r in db["product_ranges"]):
    db["product_ranges"].append({"id": str(uuid.uuid4()), "code": "ITF", "label": "", "usage_type": "professionnel", "category": "musculation",
        "subcategory": "charges-guidees", "sort_order": 99, "is_active": True, "created_at": now, "updated_at": now})

json.dump(db, open(DATA, "w", encoding="utf-8"), ensure_ascii=False)
json.dump({"created": created, "merged": merged, "fixes": fixes}, open("/home/claude/sel/create_report.json", "w"), ensure_ascii=False, indent=1)
print(f"créées {len(created)} | rattachées {len(merged)} | corrections {len(fixes)} | photos galerie ajoutées {gallery_added}")
print("à vérifier (noms visuels):", [r for r, n, s in created if s == "visuel"])
