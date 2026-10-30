import {test} from 'node:test';import assert from 'node:assert/strict';
import sharp from 'sharp';import {readFile} from 'node:fs/promises';
import {createEnvironment,ENVIRONMENTS,environmentExplanation} from '../src/components/conquestEnvironment.js';
import {environmentTargets,operationTarget,cellAt,neighbors,initialWorld,applyAction,settle} from '../src/components/conquestEngine.js';
import {missileRoute,trailColor} from '../src/components/conquestMissiles.js';
test('coast and near sea follow actual land, independent of national claims',()=>{
 const root=cellAt(0,0);const distances=new Map([[root,0]]);let frontier=[root];for(let d=1;d<=4;d++){frontier=[...new Set(frontier.flatMap(neighbors))].filter(c=>!distances.has(c));for(const c of frontier)distances.set(c,d);}
 const env=createEnvironment({isLand:c=>c===root,biomeAt:()=>4,climateAt:()=>null,landforms:{features:[]}});
 for(const [id,d] of distances)if(d)assert.equal(env(id).kind,d===1?'coast':d<=3?'nearSea':'openSea');
});
test('environment multipliers and both winning thresholds are authoritative, legacy targets stay unchanged',()=>{
 assert.deepEqual(environmentTargets(1000,ENVIRONMENTS.mountain),{target:1500,defenseTarget:750,baseTarget:1000,environment:ENVIRONMENTS.mountain});
 assert.equal(operationTarget({target:1000},true),1000);assert.match(environmentExplanation(ENVIRONMENTS.mountain,true),/−25%/);
 const w=initialWorld(),cell=Object.keys(w.owners).filter(c=>w.owners[c]==='amber').flatMap(neighbors).find(c=>!w.owners[c]);applyAction(w,'a',{type:'join',nation:'amber'},1);applyAction(w,'a',{type:'plan',id:'terrain',cell},2,()=>true,()=>ENVIRONMENTS.mountain);let b=w.battles[0];assert.equal(b.target,1500);assert.equal(b.defenseTarget,750);b.defense=749;settle(w,3);assert.equal(b.status,'active');b.defense=750;settle(w,4);assert.equal(b.status,'defended');
 const attackWorld=initialWorld();applyAction(attackWorld,'a',{type:'join',nation:'amber'},1);applyAction(attackWorld,'a',{type:'plan',id:'attack',cell},2,()=>true,()=>ENVIRONMENTS.mountain);attackWorld.battles[0].attack=1499;settle(attackWorld,3);assert.equal(attackWorld.battles[0].status,'active');attackWorld.battles[0].attack=1500;settle(attackWorld,4);assert.equal(attackWorld.owners[cell],'amber');
 const rebellion=initialWorld(),inside=Object.keys(rebellion.owners).find(c=>rebellion.owners[c]==='amber');applyAction(rebellion,'rebel',{type:'rebel',id:'rebel',cell:inside,name:'독립국'},2,()=>true,()=>ENVIRONMENTS.mountain);assert.equal(rebellion.campaigns[0].target,1800);assert.equal(rebellion.campaigns[0].defenseTarget,900);rebellion.campaigns[0].defense=900;settle(rebellion,3);assert.equal(rebellion.campaigns[0].status,'defended');
 const legacy=initialWorld();legacy.battles.push({status:'active',target:1000,attack:0,defense:800,endsAt:999});settle(legacy,10);assert.equal(legacy.battles[0].status,'active');
});
test('source raster identifies distant real biomes instead of filling the globe with one polygon',async()=>{
 const {data,info}=await sharp('public/lab-data/conquest-biomes.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});const at=(lon,lat)=>data[(Math.floor((90-lat)/180*info.height)*info.width+Math.floor((lon+180)/360*info.width))*4];
 assert.equal(at(127,37),4);assert.equal(at(20,25),13);assert.equal(at(-60,-5),1);
 const lf=JSON.parse(await readFile('public/lab-data/geoweb-landforms.json','utf8'));const env=createEnvironment({isLand:()=>true,biomeAt:at,climateAt:()=>null,landforms:lf});assert.equal(env(cellAt(20,25)).kind,'desert');assert.equal(env(cellAt(-60,-5)).kind,'jungle');assert.equal(env(cellAt(8,46)).kind,'mountain');
});
test('missiles reroll routes, choose land three times as often and blend trail into head',()=>{
 let seed=1234;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};let land=0;let previous;for(let i=0;i<2000;i++){const route=missileRoute(([,lat])=>lat>0,random);assert.equal(route.b[1]>0,route.land);land+=Number(route.land);if(previous)assert.notDeepEqual(route.b,previous);previous=route.b;}assert.ok(land>1420&&land<1580,land);assert.equal(trailColor('255,180,70','100,200,250',0),'255,180,70');assert.equal(trailColor('255,180,70','100,200,250',1),'100,200,250');
});
