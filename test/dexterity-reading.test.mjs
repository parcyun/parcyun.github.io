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
 assert.match(read('src/pages/dexterity/index.astro'),/h3\{display:inline/);
 for(const title of ['지오웹 · 세계 지도와 지리 퀴즈','스펠 드릴 · 맞춤법 퀴즈','사투리 · 지역별 방언 찾기','경주 향미사 · 커피와 원두']) assert.ok(html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').includes(title));
 assert.equal((html.match(/class="entry-tail"/g)||[]).length,4);
 assert.match(read('src/pages/dexterity/index.astro'),/ResizeObserver\(alignViewCounts\)/);
 assert.match(read('src/pages/dexterity/index.astro'),/translateX\(var\(--views-shift,0px\)\)/);
});
test('local learning and battle music attribution remain accessible but excluded from indexing',()=>{
 const sitemap=read('dist/sitemap.xml');
 for(const path of ['web-learning/index.html','geoweb-battle/music-credits.html']){
  assert.match(read('dist/'+path),/<meta name="robots" content="noindex"/);
  assert.doesNotMatch(sitemap,new RegExp(path.replace('index.html','').replaceAll('.','\\.')));
 }
});

test('Hyangmisa preserves its editorial body, crops and captions in the built article',()=>{
 const html=read('dist/dexterity/hyangmisa/index.html');
 const source=read('src/pages/dexterity/hyangmisa.astro');
 assert.match(source,/\.prose\{font-size:15px;line-height:2;/);
 assert.equal((source.match(/\.prose\{font-size:/g)||[]).length,1,'body size is identical on desktop and mobile');
 assert.match(source,/\.prose p\{margin:0 0 30px\}/);
 assert.match(source,/figcaption\{font-size:13px;color:var\(--ps-text-secondary\)/);
 const figures=[...html.matchAll(/<figure><a [^>]+><img ([^>]+)>/g)].map(m=>m[1]);
 assert.equal(figures.length,9);
 assert.equal((html.match(/<figcaption>/g)||[]).length,2);
 const crops=[75,45,55,80,70,null,85,null,65];
 for(const [i,crop] of crops.entries()){
  if(crop!==null){
   assert.match(figures[i],/class="photo-square"/);
   assert.ok(figures[i].includes('object-position:50% '+crop+'%'));
  }else{
   assert.doesNotMatch(figures[i],/photo-square|object-position/);
   assert.match(figures[i],/width="2880" height="3840"/);
  }
 }
});
