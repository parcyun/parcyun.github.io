import {geoDistance,geoInterpolate} from 'd3-geo';
import {cellAt,center,neighbors,nearestNationDistance,foundingTarget,environmentTargets} from './conquestEngine.js';
const mercator=([lon,lat])=>[lon*Math.PI/180,Math.log(Math.tan(Math.PI/4+Math.max(-84,Math.min(84,lat))*Math.PI/360))];
export function buildRiverEdges(landforms){
 const edges=new Map(),near=new Set();
 for(const f of landforms.features.filter(f=>f.properties.category==='rivers')){
  const lines=f.geometry.type==='LineString'?[f.geometry.coordinates]:f.geometry.type==='MultiLineString'?f.geometry.coordinates:[];
  for(const line of lines)for(let i=1;i<line.length;i++){
   const from=line[i-1],to=line[i],steps=Math.max(1,Math.ceil(geoDistance(from,to)/(.06*Math.PI/180))),at=geoInterpolate(from,to);
   for(let s=0;s<=steps;s++){
    const ll=at(s/steps);if(Math.abs(ll[1])>84)continue;const id=cellAt(...ll),p=mercator(ll),c=mercator(center(id));let adjacent=null,best=Infinity;
    for(const n of neighbors(id)){const q=mercator(center(n));let dx=q[0]-c[0];dx=Math.atan2(Math.sin(dx),Math.cos(dx));let px=p[0]-c[0];px=Math.atan2(Math.sin(px),Math.cos(px));const dy=q[1]-c[1],distance=Math.abs((dx*px+dy*(p[1]-c[1]))/Math.hypot(dx,dy)-Math.hypot(dx,dy)/2);if(distance<best){best=distance;adjacent=n;}}
    if(adjacent){const pair=[id,adjacent].sort(),key=pair.join('|');edges.set(key,pair);near.add(id);near.add(adjacent);}
   }
  }
 }
 return {edges:[...edges.values()],near};
}
export function foundingSuitability(w,id,{isLand,environment,nearRiver}){
 if(!isLand(id)||w.owners[id])return {cell:id,score:0,eligible:false};
 const terrain=environment(id),distance=nearestNationDistance(w,id),target=environmentTargets(foundingTarget(w,id),terrain).target;
 const coast=neighbors(id).some(n=>!isLand(n)),river=nearRiver(id),temperate=terrain.climate==='temperate',plain=terrain.kind==='plain';
 const lowCost=Math.max(0,Math.min(1,1-(target-200)/2400));
 let score=Math.round((distance>=4?30:distance/4*12)+25*lowCost+(coast?15:0)+(temperate&&plain?20:temperate||plain?8:0)+(river?10:0));
 if(distance<4)score=Math.min(score,35);
 return {cell:id,score:Math.max(0,Math.min(100,score)),eligible:true,target,distance:Number.isFinite(distance)?distance:null,coast,river,temperate,plain};
}
export function siteCells(root,radius=16){const seen=new Set([root]);let ring=[root];for(let r=0;r<radius;r++){ring=[...new Set(ring.flatMap(neighbors))].filter(id=>!seen.has(id));ring.forEach(id=>seen.add(id));}return [...seen];}
