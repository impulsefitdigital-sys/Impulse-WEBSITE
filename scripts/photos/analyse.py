import os, json
from PIL import Image
ROOT="/home/claude/web01"; out=[]
for dp,dn,fn in os.walk(ROOT):
    for f in sorted(fn):
        if not f.endswith(".webp"): continue
        p=os.path.join(dp,f); rel=os.path.relpath(p,ROOT)
        im=Image.open(p); w,h=im.size
        sm=im.copy(); sm.thumbnail((200,200)); sw,sh=sm.size
        if sm.mode=="RGBA":
            a=sm.getchannel("A"); mask=a.point(lambda v:255 if v>20 else 0); alpha=True
            bgwhite=True
        else:
            g=sm.convert("L"); mask=g.point(lambda v:255 if v<235 else 0); alpha=False
            # border whiteness
            px=g.load(); border=[px[x,0] for x in range(sw)]+[px[x,sh-1] for x in range(sw)]+[px[0,y] for y in range(sh)]+[px[sw-1,y] for y in range(sh)]
            bgwhite=sum(1 for v in border if v>230)/len(border)>0.85
        bb=mask.getbbox() or (0,0,sw,sh)
        touch=sum([bb[0]<=1,bb[1]<=1,bb[2]>=sw-1,bb[3]>=sh-1])
        fill=((bb[2]-bb[0])*(bb[3]-bb[1]))/(sw*sh)
        cover=sum(1 for v in mask.getdata() if v)/ (sw*sh)
        out.append(dict(p=rel,w=w,h=h,alpha=alpha,bgwhite=bgwhite,touch=touch,fill=round(fill,3),cover=round(cover,3)))
json.dump(out,open("/home/claude/sel/analyse.json","w"),ensure_ascii=False)
print(len(out))
