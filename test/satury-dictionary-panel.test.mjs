import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');

test('dictionary is isolated in a sticky viewport-fit panel with an internal sheet',async()=>{
 const [html,css,js]=await Promise.all(['public/satury/index.html','public/satury/dictionary-panel.css','public/satury/dictionary-panel.js'].map(read));
 assert.match(html,/id="stdict-panel"[^>]*hidden/);
 assert.match(html,/aria-modal="false"/);
 assert.match(css,/position:sticky/);
 assert.match(css,/100dvh - var\(--stdict-offset/);
 assert.match(css,/position:relative;top:auto/);
 assert.match(js,/querySelector\('\.satury-main-column form'\)\.after\(panel\)/);
 assert.match(js,/mobileLayout\.addEventListener\('change',positionPanel\)/);
 assert.match(css,/overflow:auto;overscroll-behavior:contain/);
 assert.match(js,/getBoundingClientRect\(\)\.top/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/list\.inert=true/);
 assert.match(js,/list\.inert=false/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('provider data is text-only, source-attributed, independently cancellable and key-free',async()=>{
 const [html,js,server]=await Promise.all(['public/satury/index.html','public/satury/dictionary-panel.js','scripts/satury-dictionary-local.mjs'].map(read));
 assert.match(html,/국립국어원 표준국어대사전/);
 assert.match(js,/stdict\.korean\.go\.kr\/search\/searchView\.do/);
 assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML/);
 assert.match(js,/number!==searchNumber/);
 assert.match(js,/number!==detailNumber/);
 assert.match(server,/filter\(x=>!x\.source\)/);
 assert.doesNotMatch(html+js+server,/[A-Fa-f0-9]{32}(?![A-Fa-f0-9])/);
 assert.match(server,/server\.listen\(Number\(process\.env\.PORT\)\|\|0,'127\.0\.0\.1'/);
});
