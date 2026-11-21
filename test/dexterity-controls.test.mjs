import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const controls=readFileSync('src/components/DexterityControls.astro','utf8');
const gallery=readFileSync('src/pages/dexterity/index.astro','utf8');
test('all five rendered Dexterity pages have exactly one counter, shared footer and top button',()=>{
 for(const path of ['','hyangmisa/','guidebook/geoweb/','guidebook/spell-drill/','guidebook/satury/']){
  const html=readFileSync('dist/dexterity/'+path+'index.html','utf8');
  assert.equal((html.match(/id="visitor-stats"/g)||[]).length,1,path);
  assert.equal((html.match(/class="dexterity-to-top"/g)||[]).length,1,path);
  assert.equal((html.match(/data-ps-footer/g)||[]).length,1,path);
  assert.match(html,/aria-label="상단으로 이동"/);
  assert.match(html,/scrollbar-width:none/);
 }
});
test('page tools retain native scrolling, safe-area spacing and reduced-motion behavior',()=>{
 assert.match(controls,/window.scrollTo\(\{top:0/);
 assert.match(controls,/prefers-reduced-motion:reduce/);
 assert.match(controls,/env\(safe-area-inset-bottom\)/);
 assert.match(controls,/position:static;left:auto;right:auto;bottom:auto/);
 assert.doesNotMatch(controls,/overflow:hidden/);
});
test('Dexterity opts into collaboration copy and responsive horizontal gutters',()=>{
 assert.match(controls,/contactLabel="협업 문의"/);
 assert.match(controls,/--dexterity-gutter:clamp\(20px,4vw,48px\)/);
 assert.match(controls,/padding-inline:16px/);
 for(const path of ['','hyangmisa/','guidebook/geoweb/','guidebook/spell-drill/','guidebook/satury/']){
  assert.match(readFileSync('dist/dexterity/'+path+'index.html','utf8'),/data-contact-label="협업 문의"/);
 }
 assert.match(readFileSync('src/components/PsFooter.astro','utf8'),/contactLabel = '커피 사주기'/);
});
test('homepage footer reserves actual tool height and docks the same element at the boundary',()=>{
 assert.match(readFileSync('public/share-widget.js','utf8'),/if\(\/\^\\\/dexterity\(\?:\\\/\|\$\)\/.test\(location.pathname\)\)return/);
 assert.match(readFileSync('src/components/StudioMusicPlayer.astro','utf8'),/aria-label="parcyun studio 메인홈으로 이동"/);
 assert.doesNotMatch(gallery,/class="dexterity-home-link"/);
 assert.match(gallery,/aria-label="Dexterity 하단 푸터"/);
 assert.match(gallery,/data-dexterity-footer-slot><DexterityControls\/>/);
 assert.match(controls,/slot.style.height=dock.offsetHeight/);
 assert.match(controls,/slot.getBoundingClientRect\(\).bottom<=innerHeight-inset/);
 assert.match(controls,/\.dexterity-dock.is-docked\{position:absolute/);
});
test('gallery reads actual page totals once without bumping visits on card exposure',()=>{
 assert.match(gallery,/list_page_visit_totals/);
 assert.match(gallery,/p_paths:visitPaths/);
 assert.match(gallery,/data-visit-path=\{post.href\}/);
 assert.match(gallery,/class="entry-views"/);
 assert.match(gallery,/linear-gradient\(180deg,transparent/);
 assert.match(gallery,/h3\{display:inline/);
 assert.doesNotMatch(gallery,/bump_visit|bump_resource/);
});
