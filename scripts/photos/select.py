import json, csv, re, os, collections
A={x['p']:x for x in json.load(open('/home/claude/sel/analyse.json'))}
rows=list(csv.reader(open('/mnt/user-data/outputs/correspondance_site_photos.csv',encoding='utf-8-sig'),delimiter=';'))
hdr=rows[0]; prod_rows=[r for r in rows[1:] if len(r)>=11 and r[10]]
OVR=json.load(open('/home/claude/sel/overrides.json')) if os.path.exists('/home/claude/sel/overrides.json') else {}
COLOR_PREF=['noir','argent','rouge','argent-rouge','blanc-noir','noir-marron','jaune','']
def imgs_for(key):
    pre=key+'/'
    L=[p for p in A if p.startswith(pre)]
    out=[]
    for p in sorted(L):
        rest=p[len(pre):].split('/')
        autres='_autres-visuels' in rest
        col=rest[0] if len(rest)>1 and not rest[0].startswith('_') else ''
        if not col:
            m=re.match(r'.+?-(noir|rouge|argent|argent-rouge|blanc-noir|noir-marron|jaune)-\d+\.webp$',rest[-1])
            if m and not autres: col=m.group(1)
        x=A[p]; grp='C' if (autres or not x['bgwhite']) else ('B' if (x['touch']>=2 or x['fill']>0.88) else 'A')
        out.append(dict(p=p,color=col,grp=grp))
    return out
sel={}
for r in prod_rows:
    pid=r[10]; key=r[6]
    if not key or key.endswith('/HC005'): continue
    L=imgs_for(key)
    if not L: continue
    cols=collections.Counter(i['color'] for i in L if i['grp']=='A')
    allc=set(i['color'] for i in L)
    if OVR.get(pid,{}).get('default_color') is not None: dc=OVR[pid]['default_color']
    else:
        dc=sorted(allc,key=lambda c:(-cols.get(c,0),COLOR_PREF.index(c) if c in COLOR_PREF else 99))[0]
    order=[]
    for c in [dc]+sorted(allc-{dc},key=lambda c:COLOR_PREF.index(c) if c in COLOR_PREF else 99):
        for g in 'ABC':
            order+= [i for i in L if i['color']==c and i['grp']==g]
    # overrides: list of filenames to put first (main, hover)
    first=OVR.get(pid,{}).get('first',[])
    for f in reversed(first):
        m=[i for i in order if i['p'].endswith(f)]
        if m: order.remove(m[0]); order.insert(0,m[0])
    POS=json.load(open('/home/claude/sel/pos_overrides.json'))
    k=key.split('/')[-1]
    if k in POS:
        firsts=[order[i-1] for i in POS[k] if i-1<len(order)]
        order=firsts+[i for i in order if i not in firsts]
    excl=OVR.get(pid,{}).get('exclude',[])
    order=[i for i in order if not any(i['p'].endswith(e) for e in excl)]
    sel[pid]=dict(name=r[1],key=key,default_color=dc,colors=sorted(c for c in allc if c),images=order)
json.dump(sel,open('/home/claude/sel/selection.json','w'),ensure_ascii=False,indent=0)
n=[len(v['images']) for v in sel.values()]
print(len(sel),'produits | photos', sum(n), '| min',min(n),'max',max(n), '| multi-couleurs', sum(1 for v in sel.values() if len(v['colors'])>1))
print('main non-A:', [v['name'] for v in sel.values() if v['images'][0]['grp']!='A'])
