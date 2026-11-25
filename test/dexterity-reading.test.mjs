import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(p,'utf8');
test('theme colors ease over 300ms and respect reduced motion',()=>{
 const controls=read('src/components/DexterityControls.astro');
 assert.match(controls,/transition:background-color \.3s ease,color \.3s ease,border-color \.3s ease/);
 assert.match(controls,/@media\(prefers-reduced-motion:reduce\)\{body:has\(\[data-dexterity-theme\]\)/);
});
test('article theme controls are shared, positioned before counts and remembered safely',()=>{
 const source=read('public/dexterity-theme.js');
 const storage=new Map(),events={},attrs={},root={dataset:{}},window={};
 const button={setAttribute:(key,value)=>attrs[key]=value};
 const document={documentElement:root,querySelectorAll:()=>[button],querySelector:()=>button,addEventListener:(name,fn)=>events[name]=fn};
 const context={window,document,localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}};
 vm.runInNewContext(source,context);
 assert.equal(root.dataset.theme,'dark');
 events.click({target:{closest:()=>button}});
 assert.equal(root.dataset.theme,'light');assert.equal(attrs['aria-label'],'다크 모드로 전환');
 root.dataset.theme='dark';vm.runInNewContext(source,context);assert.equal(root.dataset.theme,'light');
 events.click({target:{closest:()=>button}});assert.equal(root.dataset.theme,'dark');
 assert.equal(storage.get('ps-dexterity-theme-v1'),'dark');
 assert.doesNotThrow(()=>vm.runInNewContext(source,{window:{},document,localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}}}));
 for(const path of ['hyangmisa/','guidebook/geoweb/','guidebook/spell-drill/','guidebook/satury/']){
  const html=read('dist/dexterity/'+path+'index.html');
  assert.match(html,/dexterity-theme.js/);
  assert.ok(html.indexOf('data-dexterity-theme')<html.indexOf('id="visitor-stats"'));
  assert.doesNotMatch(html.match(/<header class="dexterity-(?:article-)?header">[\s\S]*?<\/header>/)[0],/id="theme"|game-guide-theme/);
  assert.match(html,/class="article-back"[^>]*>[\s\S]*?href="\/dexterity\/#(?:category-3|guidebooks)"/);
 }
});
test('gallery omits descriptions and aligns the compact view count beside the title',()=>{
 const html=read('dist/dexterity/index.html');
 assert.doesNotMatch(html,/class="entry-description"/);
 const cards=[...html.matchAll(/<a\b[^>]*class="entry"[^>]*>([\s\S]*?)<\/a>/g)];
 assert.equal(cards.length,6);
 assert.doesNotMatch(cards.at(-1)[1],/entry-description/);
 assert.equal((html.match(/class="entry-caption"/g)||[]).length,6);
 assert.match(read('src/pages/dexterity/index.astro'),/h3\{display:inline/);
 for(const title of ['지오웹 · 세계 지도와 지리 퀴즈','스펠 드릴 · 맞춤법 퀴즈','사투리 · 지역별 방언 찾기','경주 향미사 · 커피와 원두']) assert.ok(html.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').includes(title));
 assert.equal((html.match(/class="entry-tail"/g)||[]).length,6);
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

test('cooking links the recipe and its card art from the gallery and feeds',()=>{
 const url='/dexterity/oyster-sauce-pork-shoulder/';
 const gallery=read('dist/dexterity/index.html');
 assert.ok(gallery.match(/<section[^>]+aria-label="요리"[^>]*>[\s\S]*?<\/section>/)?.[0].includes('href="'+url+'"'));
 const article=read('dist'+url+'index.html');
 assert.ok(article.includes('href="/dexterity/#category-11"'));
 assert.ok(article.includes('굴소스 5 : 멸치액젓 1 : 케첩 3 : 발사믹 식초 1.'));
 assert.ok(article.includes('마지막 2~3분'));
 assert.ok(article.includes('깨를 뿌린다'));
 assert.ok(read('dist/dexterity/feed.xml').includes(url));
 assert.ok(read('dist/sitemap.xml').includes(url));
 assert.match(read('dist/images/dexterity/cooking/oyster-sauce-pork-shoulder.svg'),/<svg /);
});
