# Vignettes 640 px des photos principales / survol des produits : public/photos-sm/ (utilisées par les listes).
# usage : python3 scripts/photos/vignettes.py <dossier du site>
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image
ROOT=sys.argv[1]
def one(u):
    src=f"{ROOT}/public{u}"; dst=f"{ROOT}/public/photos-sm/"+u[len("/photos/"):]
    if os.path.exists(dst): return os.path.getsize(dst)
    os.makedirs(os.path.dirname(dst),exist_ok=True)
    im=Image.open(src); im.load()
    if im.width>640: im=im.resize((640, round(im.height*640/im.width)), Image.LANCZOS)
    im.save(dst,"WEBP",quality=76,method=4)
    return os.path.getsize(dst)
if __name__=="__main__":
    d=json.load(open(f"{ROOT}/src/integrations/demo/data.json"))
    paths=sorted({p[k] for p in d["products"] for k in ("image_url","hover_image_url") if (p.get(k) or "").startswith("/photos/")})
    with ProcessPoolExecutor() as ex: sizes=list(ex.map(one,paths,chunksize=8))
    print(len(sizes), sum(sizes)//1024, "Ko, moyenne", sum(sizes)//len(sizes)//1024, "Ko")
