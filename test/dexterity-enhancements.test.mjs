import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const article=readFileSync('src/pages/dexterity/hyangmisa.astro','utf8');
test('Dexterity article owns a top-right counter, restrained emphasis and place card',()=>{
 assert.ok(article.indexOf('id="visitor-stats"')<article.indexOf('<h1>'));
 assert.doesNotMatch(article,/<h2>조회수<\/h2>|사진 · parcyun \/ 인물 사진 AI 비식별 편집/);
 assert.match(article,/class="naver-place"/);
 assert.match(article,/https:\/\/map.naver.com\/p\/search\//);
 const css=readFileSync('public/dexterity.css','utf8');
 assert.match(css,/#visitor-stats.article-visits\{[^}]*justify-content:flex-end;gap:24px/);
 assert.match(css,/\.prose \.pause\{font-size:22px;font-weight:600/);
});
