import json, csv, collections, re
A={x['p']:x for x in json.load(open('/home/claude/sel/analyse.json'))}
COLOR_PREF=['noir','argent','rouge','argent-rouge','noir-rouge','blanc-noir','noir-marron','jaune','']
def imgs_for(key):
    pre=key+'/'; out=[]
    for p in sorted(q for q in A if q.startswith(pre)):
        rest=p[len(pre):].split('/'); autres='_autres-visuels' in rest
        col=rest[0] if len(rest)>1 and not rest[0].startswith('_') else ''
        if not col:
            m=re.match(r'.+?-(noir|rouge|argent|argent-rouge|noir-rouge|blanc-noir|noir-marron|jaune)-\d+\.webp$',rest[-1])
            if m and not autres: col=m.group(1)
        x=A[p]; grp='C' if (autres or not x['bgwhite']) else ('B' if (x['touch']>=2 or x['fill']>0.88) else 'A')
        out.append(dict(p=p,color=col,grp=grp))
    return out
rows=list(csv.reader(open('/mnt/user-data/outputs/correspondance_site_photos.csv',encoding='utf-8-sig'),delimiter=';'))
i=[k for k,r in enumerate(rows) if r and r[0].startswith('RÉFÉRENCES PHOTOS')][0]
keys=[r[6] for r in rows[i+1:] if len(r)>6 and r[6]]
POS=json.load(open('/home/claude/sel/pos_overrides_new.json')) if __import__('os').path.exists('/home/claude/sel/pos_overrides_new.json') else {}
sel={}
for key in keys:
    L=imgs_for(key)
    cols=collections.Counter(x['color'] for x in L if x['grp']=='A'); allc=set(x['color'] for x in L)
    dc=sorted(allc,key=lambda c:(-cols.get(c,0),COLOR_PREF.index(c)))[0]
    order=[]
    for c in [dc]+sorted(allc-{dc},key=lambda c:COLOR_PREF.index(c)):
        for g in 'ABC': order+=[x for x in L if x['color']==c and x['grp']==g]
    k=key.split('/')[-1]
    if k in POS:
        firsts=[order[j-1] for j in POS[k] if j-1<len(order)]
        order=firsts+[x for x in order if x not in firsts]
    sel[key]=dict(name=k,key=key,default_color=order[0]['color'],colors=sorted(c for c in allc if c),images=order)
json.dump(sel,open('/home/claude/sel/selection_new.json','w'),ensure_ascii=False)
print(len(sel), sum(len(v['images']) for v in sel.values()))
