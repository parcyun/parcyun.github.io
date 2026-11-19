/**
 * Offline cartogram build. Requires the pinned npm go-cart-wasm@0.5.0 package.
 * GO_CART_PACKAGE=/path/to/extracted/package node scripts/build-population-cartogram.mjs /path/to/population.csv
 * Data: OWID population.csv, 2023 rows (UN World Population Prospects 2024).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {COUNTRIES,countryByBoundaryName} from '../src/components/globeCountries.js';
import {COUNTRY} from '../src/components/globeCountryData.js';
const require=createRequire(import.meta.url),root=path.resolve(new URL('..',import.meta.url).pathname);
const solverRoot=process.env.GO_CART_PACKAGE;if(!solverRoot)throw Error('Set GO_CART_PACKAGE to extracted go-cart-wasm@0.5.0 package');
const csvPath=process.argv[2];if(!csvPath)throw Error('Pass the downloaded OWID population.csv path');
const csv=fs.readFileSync(csvPath,'utf8'),world=JSON.parse(fs.readFileSync(path.join(root,'public/lab-data/world.json'),'utf8'));
const rows=csv.trim().split(/\r?\n/).slice(1).map(line=>line.match(/(?:"(?:[^"]|"")*"|[^,])+/g).map(x=>x.replace(/^"|"$/g,'').replaceAll('""','"'))).filter(row=>row[2]==='2023');
const byCode=new Map(rows.map(row=>[row[1],{entity:row[0],code:row[1],value:+row[3]}])),byName=new Map(rows.map(row=>[row[0],{entity:row[0],code:row[1],value:+row[3]}]));
// Explicit Natural Earth → ISO/OWID aliases; no fuzzy country-name matching.
const aliases={'eSwatini':'SWZ','The Bahamas':'BHS','Taiwan':'TWN','Kosovo':'OWID_KOS','Hong Kong S.A.R.':'HKG','Macao S.A.R':'MAC','São Tomé and Principe':'STP','Cabo Verde':'CPV','Federated States of Micronesia':'FSM','Western Sahara':'ESH','Saint Martin':'MAF','Sint Maarten':'SXM','Greenland':'GRL','New Caledonia':'NCL','Curaçao':'CUW','Aruba':'ABW','Turks and Caicos Islands':'TCA','Saint Pierre and Miquelon':'SPM','French Polynesia':'PYF','Montserrat':'MSR','United States Virgin Islands':'VIR','Saint Barthelemy':'BLM','Puerto Rico':'PRI','Anguilla':'AIA','British Virgin Islands':'VGB','Cayman Islands':'CYM','Bermuda':'BMU','Saint Helena':'SHN','Faroe Islands':'FRO','Cook Islands':'COK','Wallis and Futuna':'WLF','Falkland Islands':'FLK','Niue':'NIU','American Samoa':'ASM','Guam':'GUM','Northern Mariana Islands':'MNP','Gibraltar':'GIB','Isle of Man':'IMN'};
const lookup=name=>{const known=countryByBoundaryName(name),iso=known?.iso3||COUNTRIES.find(c=>c.iso2===COUNTRY[name]?.iso2)?.iso3;return byCode.get(aliases[name]||iso)||byName.get(name)||null;};
const radians=Math.PI/180;
const densify=ring=>{const result=[];for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1],steps=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))));for(let k=0;k<steps;k++)result.push([a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps]);}result.push([...ring.at(-1)]);return result;};
const project=p=>[p[0]*radians,Math.sin(p[1]*radians)];
const ringArea=ring=>{let sum=0;for(let i=0;i<ring.length-1;i++)sum+=ring[i][0]*ring[i+1][1]-ring[i+1][0]*ring[i][1];return Math.abs(sum/2);};
const polygonArea=p=>Math.max(0,ringArea(p[0])-p.slice(1).reduce((a,r)=>a+ringArea(r),0));
const groups=new Map(),sources=[];
for(let index=0;index<world.features.length;index++){const f=world.features[index],name=f.properties.n,pop=lookup(name),polygons=(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).map(p=>p.map(densify));const projected=polygons.map(p=>p.map(r=>r.map(project)));let group=groups.get(name);if(!group){group={name,pop,polygons:[],parts:[],area:0};groups.set(name,group);}group.parts.push({index,start:group.polygons.length,count:polygons.length});group.polygons.push(...projected);group.area+=projected.reduce((sum,p)=>sum+polygonArea(p),0);sources[index]={feature:f,polygons,pop};}
const known=[...groups.values()].filter(g=>g.pop),totalPopulation=known.reduce((s,g)=>s+g.pop.value,0),totalKnownArea=known.reduce((s,g)=>s+g.area,0),backgroundDensity=totalPopulation/totalKnownArea;
const grouped=[...groups.values()];
const input={type:'FeatureCollection',features:grouped.map((g,index)=>({type:'Feature',properties:{n:g.name,originalGroup:index,population:g.pop?.value??null,solverWeight:g.pop?.value??g.area*backgroundDensity},geometry:{type:'MultiPolygon',coordinates:g.polygons}}))};
const init=require(path.join(solverRoot,'dist/go-cart.cjs'));
const wasm=fs.readFileSync(path.join(solverRoot,'dist/cart.wasm'));
// Upstream 0.5.0 hardcodes use_perimeter_threshold=TRUE in doCartogram.
// This pinned one-byte patch is equivalent to the original MIT C solver's -n flag:
// main.c:97 use_perimeter_threshold = FALSE. No runtime WASM is distributed.
const expectedWasmSha='032835c6b30e3cd408e2420fde9d97bf4519f10cae5f63ab9dc7474d36a3e0a6';
if(crypto.createHash('sha256').update(wasm).digest('hex')!==expectedWasmSha)throw Error('Unexpected go-cart-wasm binary checksum');
const needle=Buffer.from([0x41,0xb4,0xd9,0x02,0x41,0x01,0x36,0x02,0x00]);
const address=wasm.indexOf(needle);if(address<0||wasm.indexOf(needle,address+1)>=0)throw Error('Unexpected solver binary: threshold patch is not unique');
wasm[address+5]=0;
const solver=await init({wasmBinary:wasm,print:()=>{},printErr:()=>{}});
const result=solver.makeCartogram(input,'solverWeight');
let xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
for(const f of result.features)for(const p of (f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates))for(const r of p)for(const [x,y] of r){xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}
const scale=Math.min(2*Math.PI/(xMax-xMin),1.98/(yMax-yMin)),cx=(xMin+xMax)/2,cy=(yMin+yMax)/2;
const round=n=>Math.round(n*1e6)/1e6;
const outputFeatures=Array(world.features.length);
for(let i=0;i<grouped.length;i++){const group=grouped[i],target=result.features[i];if(target.properties.originalGroup!==i)throw Error('Solver reordered features');const targetPolys=target.geometry.type==='Polygon'?[target.geometry.coordinates]:target.geometry.coordinates;if(targetPolys.length!==group.polygons.length)throw Error('Solver changed polygon count');for(const part of group.parts){const source=sources[part.index],polygons=source.polygons.map((p,pi)=>p.map((r,ri)=>{const dest=targetPolys[part.start+pi][ri];if(dest.length!==r.length)throw Error('Solver changed vertex correspondence');return r.map(([lon,lat],vi)=>[round(lon),round(lat),round((dest[vi][0]-cx)*scale/radians),round(Math.atan(Math.sinh((dest[vi][1]-cy)*scale))/radians)]);}));outputFeatures[part.index]={type:'Feature',index:part.index,properties:{...source.feature.properties,iso3:group.pop?.code??null,population:group.pop?.value??null,populationYear:group.pop?2023:null,populationEntity:group.pop?.entity??null,weightPolicy:group.pop?'observed-country-total':'background-area-not-population',areaError:target.properties.area_error},geometry:{type:source.feature.geometry.type,coordinates:source.feature.geometry.type==='Polygon'?polygons[0]:polygons}};}}
// Validate the final rounded geometry, not only the solver's unrounded targets.
const areas=new Map();
for(const f of outputFeatures){const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;const area=polygons.reduce((sum,p)=>sum+polygonArea(p.map(r=>r.map(q=>[q[2]*radians,Math.asinh(Math.tan(q[3]*radians))]))),0);areas.set(f.properties.n,(areas.get(f.properties.n)||0)+area);}
const knownArea=known.reduce((sum,g)=>sum+areas.get(g.name),0),commonAreaPerPerson=knownArea/totalPopulation;
for(const f of outputFeatures){f.properties.solverAreaError=f.properties.areaError;f.properties.areaError=f.properties.population===null?null:areas.get(f.properties.n)/(f.properties.population*commonAreaPerPerson)-1;}
const weightedMeanError=known.reduce((sum,g)=>sum+g.pop.value*Math.abs(areas.get(g.name)/(g.pop.value*commonAreaPerPerson)-1),0)/totalPopulation;
const output={type:'FeatureCollection',version:2,year:2023,generatedAt:new Date().toISOString().slice(0,10),method:'Gastner–Seguy–More 2018 contiguous flow-based cartogram',solver:'go-cart-wasm@0.5.0',solverOptions:{perimeterMinimumArea:false,patch:'one-byte pinned-binary equivalent of original C -n flag'},projection:'Equal-area solver plane; shared uniform affine normalization; target latitude encodes solver Y through inverse Mercator atan(sinh(Y)) so flat rendering preserves planar population areas',pointFormat:['sourceLongitude','sourceLatitude','targetLongitude','targetLatitude'],normalization:{scale,cx,cy},sources:{population:'https://ourworldindata.org/grapher/population.csv',populationMetadata:'https://ourworldindata.org/grapher/population.metadata.json',populationBasis:'UN World Population Prospects 2024, historical population for 2023',populationCsvSha256:crypto.createHash('sha256').update(csv).digest('hex'),geometry:'Existing public/lab-data/world.json (Natural Earth)',algorithm:'https://github.com/riatelab/go-cart-wasm',paper:'https://doi.org/10.1073/pnas.1712674115'},quality:{populationWeightedMeanAbsoluteAreaError:weightedMeanError,areaErrorReference:'Final rounded Mercator-decoded solver-plane geometry, normalized by total known-population area'},coverage:{totalFeatures:outputFeatures.length,knownGroups:known.length,totalGroups:grouped.length,unknownGroups:grouped.filter(g=>!g.pop).map(g=>g.name),representedPopulation:totalPopulation},limitations:['Population area ratios are preserved in the flat Mercator display plane; lens/globe views reproject that plane and do not preserve exact screen-area ratios.','Unknown-population territories, including Antarctica, use explicit background-area solver weights; these are not population estimates.','Tiny territories may exceed the solver area-error tolerance; see per-feature areaError.'],features:outputFeatures};
const out=path.join(root,'public/lab-data/geoweb-population-cartogram.json');fs.writeFileSync(out,JSON.stringify(output));console.log(JSON.stringify({output:out,bytes:fs.statSync(out).size,groups:grouped.length,known:known.length,unknown:output.coverage.unknownGroups,maxKnownAreaError:Math.max(...result.features.filter(f=>f.properties.population!==null).map(f=>Math.abs(f.properties.area_error||0)))}));
