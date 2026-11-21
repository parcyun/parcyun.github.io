import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const article=readFileSync('src/pages/dexterity/hyangmisa.astro','utf8');
test('Dexterity article uses shared bottom tools, restrained emphasis and place card',()=>{
 assert.match(article,/<DexterityControls showTheme\/>/);
 assert.doesNotMatch(article,/<h2>조회수<\/h2>|사진 · parcyun \/ 인물 사진 AI 비식별 편집/);
 assert.match(article,/class="naver-place"/);
 assert.match(article,/https:\/\/map.naver.com\/p\/search\//);
 const css=readFileSync('public/dexterity.css','utf8');
 const controls=readFileSync('src/components/DexterityControls.astro','utf8');
 assert.match(controls,/id="visitor-stats"/);
 assert.match(controls,/gap:16px/);
 assert.match(css,/\.prose \.pause\{font-size:22px;font-weight:600/);
});
