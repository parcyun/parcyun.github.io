import {readFile,writeFile} from 'node:fs/promises';
import {buildGamePools,GAME_MODES} from '../src/components/geoGameData.js';

const root=new URL('../public/lab-data/',import.meta.url);
const world=JSON.parse(await readFile(new URL('world.json',root)));
const landforms=JSON.parse(await readFile(new URL('geoweb-landforms.json',root)));
const pools=buildGamePools(world,landforms);
const questions=Object.fromEntries(GAME_MODES.map(mode=>[mode.id,pools[mode.id].map(q=>({
 id:q.id,mode:mode.id,prompt:mode.prompt||mode.title,answers:q.answers,
 country:q.country?.name?.ko||'',image:mode.id==='flag'?q.country?.flag:q.image||'',
 coordinates:q.coordinates||null,name:q.name,
}))]));
await writeFile(new URL('../server/geoweb-battle/corpus.json',import.meta.url),JSON.stringify(questions));
console.log(Object.fromEntries(Object.entries(questions).map(([mode,items])=>[mode,items.length])));
