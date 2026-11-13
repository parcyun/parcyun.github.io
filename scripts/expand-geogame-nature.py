"""Expand named, real Natural Earth landforms and retain one connected main river path."""
import json,re,unicodedata,math,heapq,sys
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree
root=Path(sys.argv[1]);out=Path('public/lab-data/geoweb-landforms.json');old=json.loads((root/'landforms-baseline.json').read_text());regions=json.loads((root/'regions.json').read_text())['features'];rivers=json.loads((root/'rivers.json').read_text())['features']
normalize=lambda s:re.sub(r'[^a-z0-9가-힣]','',unicodedata.normalize('NFKC',s or '').lower())
groups={}
for f in old['features']:groups.setdefault(f['properties']['nameKo'],[]).append(f)
old_names=set(groups);source_names={normalize(f['properties'].get('sourceName','')) for f in old['features']};ko_names={normalize(n) for n in groups}
river_names=[('한강',['Han','Namhan'],'Han River (Korea)'),('낙동강',['Nakdong'],'Nakdong River'),('라인강',['Rhine','Rhein'],'Rhine'),('론강',['Rhône'],'Rhône'),('센강',['Seine'],'Seine'),('템스강',['Thames'],'Thames'),('엘베강',['Elbe'],'Elbe'),('오데르강',['Oder'],'Oder'),('루아르강',['Loire'],'Loire'),('나이저강',['Niger'],'Niger River'),('잠베지강',['Zambezi'],'Zambezi'),('림포포강',['Limpopo'],'Limpopo River'),('오렌지강',['Orange'],'Orange River'),('머리강',['Murray'],'Murray River'),('유콘강',['Yukon'],'Yukon River'),('매켄지강',['Mackenzie'],'Mackenzie River'),('컬럼비아강',['Columbia'],'Columbia River'),('콜로라도강',['Colorado'],'Colorado River'),('리오그란데강',['Rio Grande'],'Rio Grande'),('세인트로렌스강',['St. Lawrence'],'Saint Lawrence River'),('파라나강',['Paraná'],'Paraná River'),('오리노코강',['Orinoco'],'Orinoco'),('티그리스강',['Tigris'],'Tigris'),('유프라테스강',['Euphrates'],'Euphrates'),('브라마푸트라강',['Brahmaputra','Dihang'],'Brahmaputra River'),('아무르강',['Amur'],'Amur'),('살윈강',['Salween'],'Salween'),('압록강',['Yalu'],'Yalu River')]
base_aliases={'나일강':['Nile','Albert Nile','Victoria Nile','Bahr el Jebel','El Bahr el Abyad','El Bahr el Azraq','Abay'],'인더스강':['Indus'],'갠지스강':['Ganges'],'메콩강':['Mekong','Lancang'],'황허강':['Huang'],'양쯔강':['Yangtze','Chang Jiang','Jinsha'],'미시시피강':['Mississippi'],'아마존강':['Amazonas'],'콩고강':['Congo','Lualaba'],'다뉴브강':['Danube','Donau'],'볼가강':['Volga'],'오비강':['Ob'],'예니세이강':['Yenisey'],'레나강':['Lena']}
def feature(category,ko,en,geometry,source,**extra):return {'type':'Feature','properties':{'category':category,'nameKo':ko,'nameEn':en,'sourceName':source,'sourceScale':'10m','difficulty':'easy' if ko in old_names else 'hard',**extra},'geometry':geometry}
def connected_mainline(features):
 lines=[]
 for f in features:
  g=f['geometry'];lines.extend(g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']])
 lines=[l for l in lines if len(l)>1]
 if not lines:return None
 # Only nearby source endpoints are snapped; never bridge a missing long reach.
 ends=np.array([p for l in lines for p in (l[0],l[-1])]);parents=list(range(len(ends)))
 def find(i):
  while parents[i]!=i:parents[i]=parents[parents[i]];i=parents[i]
  return i
 for a,b in cKDTree(ends).query_pairs(.03):parents[find(b)]=find(a)
 pts={};
 for i,p in enumerate(ends):pts.setdefault(find(i),[]).append(p)
 centers={k:np.mean(v,axis=0).tolist() for k,v in pts.items()};adj={};edges={}
 for i,l in enumerate(lines):
  a,b=find(2*i),find(2*i+1)
  if a==b:continue
  coords=[centers[a],*l[1:-1],centers[b]];weight=sum(math.hypot((q[0]-p[0])*math.cos(math.radians((p[1]+q[1])/2)),q[1]-p[1]) for p,q in zip(coords,coords[1:]));adj.setdefault(a,[]).append((b,weight,i));adj.setdefault(b,[]).append((a,weight,i));edges[i]=coords
 if not adj:return {'type':'LineString','coordinates':max(lines,key=len)}
 def distances(first):
  dist={first:0};prev={};queue=[(0,first)]
  while queue:
   d,n=heapq.heappop(queue)
   if d!=dist[n]:continue
   for to,w,e in adj[n]:
    if d+w<dist.get(to,float('inf')):dist[to]=d+w;prev[to]=(n,e);heapq.heappush(queue,(d+w,to))
  return dist,prev
 seen=set();components=[]
 for n in adj:
  if n in seen:continue
  d,_=distances(n);seen.update(d);components.append(d)
 comp=max(components,key=lambda c:sum(w for n in c for _,w,_ in adj[n]));start=max(comp,key=comp.get);d,prev=distances(start);end=max(d,key=d.get);chain=[]
 while end!=start:
  parent,e=prev[end];chain.append((parent,end,e));end=parent
 coords=[]
 for a,b,e in reversed(chain):
  l=edges[e];l=l if l[0]==centers[a] else list(reversed(l));coords.extend(l if not coords else l[1:])
 return {'type':'LineString','coordinates':coords}
features=[f for f in old['features'] if f['properties']['category']!='rivers'];research=[]
for ko,aliases,title in [(ko,v,groups[ko][0]['properties']['nameEn']) for ko,v in base_aliases.items()]+river_names:
 matching=[f for f in rivers if f['properties'].get('name') in aliases and f['properties'].get('featurecla') in ['River','Lake Centerline']];geometry=connected_mainline(matching)
 if not geometry:raise ValueError('Missing real river geometry: '+ko)
 features.append(feature('rivers',ko,title,geometry,' / '.join(aliases),continuity='single connected mainstem; source endpoints snapped within0.03degree; disconnected components omitted'))
 research.append({'id':'rivers:'+ko,'name':ko,'title':title})
category={'Range/mtn':'mountains','Plateau':'plateaus','Plain':'plains','Lowland':'plains','Desert':'deserts'}
candidates=[]
for f in regions:
 p=f['properties'];ko=p.get('NAME_KO');en=p.get('NAME_EN') or p['NAME']
 if not ko or p['FEATURECLA'] not in category or normalize(ko) in ko_names or normalize(p['NAME']) in source_names or normalize(en) in source_names:continue
 candidates.append(f)
candidates.sort(key=lambda f:(f['properties'].get('SCALERANK',10),f['properties'].get('MIN_LABEL',10),f['properties']['NAME']))
count=len({f['properties']['nameKo'] for f in features});target=len(old_names)*3+40
for f in candidates:
 if count>=target:break
 p=f['properties'];ko=p['NAME_KO'];key=normalize(ko)
 if key in ko_names:continue
 ko_names.add(key);cat=category[p['FEATURECLA']];en=p.get('NAME_EN') or p['NAME'];features.append(feature(cat,ko,en,f['geometry'],p['NAME'],wikidata=p.get('WIKIDATAID'),spreadDegrees=.3 if cat!='rivers' else 0));research.append({'id':cat+':'+ko,'name':ko,'title':en,'wikidata':p.get('WIKIDATAID')});count+=1
for f in features:f['properties'].setdefault('difficulty','easy' if f['properties']['nameKo'] in old_names else 'hard')
out.write_text(json.dumps({**old,'source':'Natural Earth 50m/10m Physical Vectors; connected10m rivers and expanded regions','features':features},ensure_ascii=False,separators=(',',':'))+'\n');(root/'nature-research.json').write_text(json.dumps(research,ensure_ascii=False,indent=2));print('nature',len(old_names),'->',count,'rivers',sum(f['properties']['category']=='rivers' for f in features))
