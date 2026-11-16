import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('list meanings are clamped but original language and full detail are not',async()=>{
 const [js,css]=await Promise.all(['public/satury/dictionary-panel.js','public/satury/dictionary-panel.css'].map(read));
 assert.match(js,/if\(item\.origin\)add\(button,'span',item\.origin,'stdict-origin'\)/);
 assert.match(js,/for\(const origin of data\.origins\)/);
 assert.match(css,/\.stdict-definition\{[^}]*-webkit-line-clamp:2/);
 assert.doesNotMatch(css,/\.stdict-origin\{[^}]*(?:line-clamp|text-overflow|hidden)/);
 assert.match(js,/add\(ol,'li',sense\.definition\)/);
});
test('only the remaining random recommendations exist and their choices exclude current/previous words',async()=>{
 const html=await read('public/satury/index.html');
 assert.doesNotMatch(html,/다른 말도 찾아보세요|word-recommendations|function recommend\(/);
 assert.match(html,/randomWords\(3,\[q,\.\.\.previous\]\)/);
 assert.match(html,/\.satury-examples'\)\.addEventListener\('click',event/);
 const fn=html.match(/function randomWords\(count,exclude=\[\]\)\{[\s\S]*?\n\}/)[0];
 const dictionary=Object.fromEntries(['하나','둘','셋','넷','다섯','여섯'].map(w=>[w,{}]));
 const run=random=>Array.from(vm.runInNewContext(fn+';randomWords(3,["하나"])',{dictionary,Math:{random:()=>random,floor:Math.floor}}));
 const a=run(0),b=run(.999);
 assert.equal(a.length,3);assert.equal(new Set(a).size,3);assert.ok(!a.includes('하나'));assert.notDeepEqual(a,b);
});
