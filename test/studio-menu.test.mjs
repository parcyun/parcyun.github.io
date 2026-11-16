import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
test('all game accounts reuse the independent shared studio menu',async()=>{
 const account=await readFile(new URL('public/game-account.js',root),'utf8');
 const menu=await readFile(new URL('public/studio-menu.js',root),'utf8');
 assert.match(account,/import \{createStudioMenu\}/);
 assert.match(account,/const studio = createStudioMenu\(\)/);
 assert.doesNotMatch(account,/menuAction\('기능 개선 요청'/);
 assert.match(menu,/grid-template-columns:1fr 1fr/);
 assert.match(menu,/ps-studio-about/);
 assert.match(menu,/text-align:center/);
 assert.match(menu,/교육 활동 자료 더보기/);
 assert.match(menu,/new URL\('atlas-gears\//);
 assert.match(menu,/ps-menu-action\[hidden\]\{display:none/);
 assert.doesNotMatch(menu,/firebase|loadSdk/);
});
test('satury is an interactive resource with a separate lifetime visit count',async()=>{
 const resources=await readFile(new URL('src/data/resources.ts',root),'utf8');
 const item=resources.slice(resources.indexOf("id: 'satury'"),resources.indexOf("id: 'satury'")+850);
 assert.match(item,/url: '\/satury\/'/);
 assert.match(item,/visitPath: '\/satury\/'/);
 assert.match(item,/type: '인터랙티브'/);
});
