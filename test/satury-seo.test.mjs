import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync('public/satury/index.html','utf8');
test('Satury has truthful dictionary metadata, structured data and crawlable service copy',()=>{
 assert.match(html,/<title>표준국어대사전 · 방언 사전 검색 \| satury<\/title>/);
 const structured=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(structured['@type'],'WebApplication');
 assert.equal(structured.url,'https://parcyun.github.io/satury/');
 assert.equal(structured.creator.name,'parcyun studio');
 assert.match(html,/href="\/satury\/about\/"/);
 const sitemap=readFileSync('public/sitemap.xml','utf8');
 for(const route of ['/satury/','/satury/about/'])assert.ok(sitemap.includes('https://parcyun.github.io'+route));
 assert.doesNotMatch(html,/noindex/);
});
test('mobile dictionary defaults to a one-line disclosure directly after the search form in source order',()=>{
 assert.match(html,/<\/form>\s*<aside id="stdict-panel"/);
 assert.match(html,/id="stdict-toggle" aria-expanded="false" aria-controls="stdict-list"/);
 const script=readFileSync('public/satury/dictionary-panel.js','utf8');
 assert.match(script,/panel.dataset.collapsed='true'/);
 const css=readFileSync('public/satury/dictionary-panel.css','utf8');
 assert.match(css,/height:min\(360px,55dvh\)/);
 assert.match(css,/data-collapsed=true\]\{height:54px;min-height:54px/);
});
