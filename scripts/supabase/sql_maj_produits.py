# Génère le SQL de mise à jour des produits (photos, couleurs, nouvelles fiches) pour la base en ligne.
# Ne touche QUE products, product_images et product_ranges ; ne modifie, pour une fiche existante,
# que les champs réellement changés par rapport à la base de départ (sauvegarde du 24/09/2026).
# usage : python3 sql_maj_produits.py <data_depart.json> <data_final.json> <dossier_sortie>
import json, sys, os
base = json.load(open(sys.argv[1], encoding="utf-8")); fin = json.load(open(sys.argv[2], encoding="utf-8")); OUT = sys.argv[3]
os.makedirs(OUT, exist_ok=True)
def lit(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    if isinstance(v, (list, dict)): v = json.dumps(v, ensure_ascii=False); return "'" + v.replace("'", "''") + "'::jsonb"
    return "'" + str(v).replace("'", "''") + "'"
def rows_json(rows):
    j = json.dumps(rows, ensure_ascii=False); assert "$impulse$" not in j; return "$impulse$" + j + "$impulse$::jsonb"
def insert(table, rows, conflict="(id) DO NOTHING"):
    cols = sorted({k for r in rows for k in r}); c = ", ".join(f'"{x}"' for x in cols)
    return f"INSERT INTO public.{table} ({c})\nSELECT {c} FROM jsonb_populate_recordset(NULL::public.{table}, {rows_json(rows)})\nON CONFLICT {conflict};\n"

bp = {p["id"]: p for p in base["products"]}
upd, new = [], []
for p in fin["products"]:
    if p["id"] not in bp: new.append(p); continue
    o = bp[p["id"]]
    ch = {k: v for k, v in p.items() if k not in ("updated_at",) and o.get(k) != v}
    if ch: upd.append(f"UPDATE public.products SET {', '.join(f'{k} = {lit(v)}' for k, v in ch.items())}, updated_at = now() WHERE id = '{p['id']}';")
def gal(d):
    g = {}
    for i in d["product_images"]: g.setdefault(i["product_id"], []).append(i)
    return g
gb, gf = gal(base), gal(fin)
key = lambda L: sorted((i["image_url"], i.get("color"), i["sort_order"]) for i in L)
changed = [pid for pid in set(gb) | set(gf) if pid in bp and key(gb.get(pid, [])) != key(gf.get(pid, []))]
new_ids = {p["id"] for p in new}
imgs = [i for pid in changed for i in gf.get(pid, [])] + [i for i in fin["product_images"] if i["product_id"] in new_ids]
bids = {r["id"] for r in base["product_ranges"]}
ranges = [r for r in fin["product_ranges"] if r["id"] not in bids]

H = "-- IMPULSE FITNESS MAROC — mise à jour produits du 16/10/2026 — fichier {n}/3\n-- Supabase > SQL Editor > New query : coller TOUT le fichier, « Run ». Ordre : 1, 2, 3.\n\n"
s = H.format(n=1) + "BEGIN;\n-- colonnes couleur (migration 20261016120000_couleurs_photos)\n"
s += "ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_color TEXT;\nALTER TABLE public.product_images ADD COLUMN IF NOT EXISTS color TEXT;\n\n"
s += f"-- {len(upd)} fiches existantes : nouvelles photos principales / couleur par défaut / corrections\n" + "\n".join(upd) + "\n\n"
s += f"-- {len(new)} nouvelles fiches\n" + insert("products", new) + "\n"
if ranges:
    s += "-- gammes ajoutées (n'écrase jamais une gamme existante)\n" + insert("product_ranges", ranges, "(code, usage_type, category, subcategory) DO NOTHING")
s += "COMMIT;\n\nSELECT count(*) AS produits_total, count(*) FILTER (WHERE is_published) AS publies FROM public.products;\n"
open(f"{OUT}/MAJ_1_produits.sql", "w", encoding="utf-8").write(s)
half = (len(imgs) + 1) // 2
dl = ", ".join(f"'{x}'" for x in sorted(changed))
s = H.format(n=2) + f"BEGIN;\n-- galeries remplacées pour {len(changed)} fiches existantes (+ galeries des nouvelles fiches)\nDELETE FROM public.product_images WHERE product_id IN ({dl});\n" + insert("product_images", imgs[:half]) + "COMMIT;\n"
open(f"{OUT}/MAJ_2_photos.sql", "w", encoding="utf-8").write(s)
s = H.format(n=3) + "BEGIN;\n" + insert("product_images", imgs[half:]) + "COMMIT;\n\n"
s += f"SELECT count(*) AS photos_galerie, {len(fin['product_images'])} AS attendu_si_base_inchangee FROM public.product_images;\n"
open(f"{OUT}/MAJ_3_photos.sql", "w", encoding="utf-8").write(s)
print(f"fiches modifiées {len(upd)} | nouvelles {len(new)} | galeries remplacées {len(changed)} | photos insérées {len(imgs)} | gammes {len(ranges)}")
for f in sorted(os.listdir(OUT)): print(f, os.path.getsize(f"{OUT}/{f}") // 1024, "Ko")
