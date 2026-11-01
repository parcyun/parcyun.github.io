import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
for(const [path,file,image] of [['spell-drill','public/spell-drill/index.html','spell-drill'],['world-map','src/pages/world-map.astro','geoweb']]){
 test(`${path} has crawlable identity, canonical, structured data and a wide share image`,async()=>{
  const html=readFileSync(file,'utf8');
  assert.ok(html.includes(`rel="canonical" href="https://parcyun.github.io/${path}/"`));
  assert.match(html,/index,follow,max-image-preview:large/);
  const json=JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)[1]);
  assert.equal(json['@type'],'WebApplication');assert.equal(json.url,`https://parcyun.github.io/${path}/`);assert.equal(json.offers.price,'0');assert.ok(!json.aggregateRating);
  assert.equal(json.image,`https://parcyun.github.io/images/og/${image}-20261101${path==='world-map'?'-v3':''}.png`);
  assert.match(html,/summary_large_image/);assert.match(html,/og:image:alt/);
  const meta=await sharp(`public/images/og/${image}-20261101${path==='world-map'?'-v3':''}.png`).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);
  assert.match(html,/id="ps-game-intro"/);assert.match(html,/game-intro\.css/);assert.match(html,/game-intro\.js/);
  assert.ok(readFileSync('public/sitemap.xml','utf8').includes(`https://parcyun.github.io/${path}/about/`));
 });
}
test('intro is bounded and motion preference is respected without blocking game boot',()=>{
 const css=readFileSync('public/game-intro.css','utf8'),js=readFileSync('public/game-intro.js','utf8');
 assert.match(css,/psIntroVeil 2s/);assert.match(css,/prefers-reduced-motion/);assert.match(js,/2000/);assert.match(js,/el.inert=false/);assert.doesNotMatch(js,/localStorage|fetch\(/);
});
