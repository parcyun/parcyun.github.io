import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../public/lab-data/geoweb-population-cartogram.json',import.meta.url)));
const points=name=>data.features.filter(f=>f.properties.n===name).flatMap(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat(2));
const mercator=lat=>Math.asinh(Math.tan(lat*Math.PI/180));
test('population cartogram keeps northern Asia out of the polar projection singularity',()=>{const china=points('China');assert.ok(Math.max(...china.map(p=>p[3]))<60,'China must not stretch from its population expansion into the Arctic');const russia=points('Russia');const height=Math.max(...russia.map(p=>mercator(p[3])))-Math.min(...russia.map(p=>mercator(p[3])));assert.ok(height<.5,'Russia must compress into a shallow northern band rather than a polar wall');});
