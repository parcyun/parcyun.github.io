import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
test('all article theme toggles keep a stable name and reflect light mode',()=>{
 for(const path of ['hyangmisa/','guidebook/geoweb/','guidebook/spell-drill/','guidebook/satury/']){
  const html=read('dist/dexterity/'+path+'index.html');
  assert.match(html,/aria-label="밝은 화면" aria-pressed="false"/);
  const script=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes("const light=document.documentElement.dataset.theme"));
  let click;const attrs={};const root={dataset:{theme:'dark'}};
  const button={setAttribute:(key,value)=>attrs[key]=value,addEventListener:(_,fn)=>click=fn};
  vm.runInNewContext(script,{document:{documentElement:root,getElementById:()=>button,querySelector:()=>button}});
  for(const [theme,pressed] of [['light','true'],['dark','false'],['light','true']]){
   click.call(button);assert.equal(root.dataset.theme,theme,path);assert.equal(attrs['aria-pressed'],pressed,path);
  }
  assert.equal(attrs['aria-label'],undefined,'accessible name remains stable');
  assert.match(html,/class="article-back"[^>]*>[\s\S]*?href="\/dexterity\/#(?:category-3|guidebooks)"/);
 }
});
test('gallery omits descriptions and aligns the compact view count beside the title',()=>{
 const html=read('dist/dexterity/index.html');
 assert.doesNotMatch(html,/class="entry-description"/);
 const cards=[...html.matchAll(/<a\b[^>]*class="entry"[^>]*>([\s\S]*?)<\/a>/g)];
 assert.equal(cards.length,4);
 assert.doesNotMatch(cards.at(-1)[1],/entry-description/);
 assert.equal((html.match(/class="entry-caption"/g)||[]).length,4);
 assert.match(read('src/pages/dexterity/index.astro'),/align-items:flex-end/);
});
test('local learning and battle music attribution remain accessible but excluded from indexing',()=>{
 const sitemap=read('dist/sitemap.xml');
 for(const path of ['web-learning/index.html','geoweb-battle/music-credits.html']){
  assert.match(read('dist/'+path),/<meta name="robots" content="noindex"/);
  assert.doesNotMatch(sitemap,new RegExp(path.replace('index.html','').replaceAll('.','\\.')));
 }
});
