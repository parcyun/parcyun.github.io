import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const html=readFileSync(new URL('../public/spell-drill/index.html',import.meta.url),'utf8');
const source=html.match(/function compareRankRecords\(a,b\)\{[\s\S]*?\n\}/)[0];
const compare=runInNewContext(`(${source})`);
test('ranking prioritizes score, then shorter precise time',()=>{
  const rows=[{score:100,elapsedMs:100},{score:200,elapsedMs:2000},{score:200,elapsedMs:1000}];
  rows.sort(compare);
  assert.deepEqual(rows.map(r=>r.elapsedMs),[1000,2000,100]);
});
test('legacy minute-second records remain sortable',()=>{
  assert.ok(compare({score:100,time:'0:59'},{score:100,time:'1:00'})<0);
});
