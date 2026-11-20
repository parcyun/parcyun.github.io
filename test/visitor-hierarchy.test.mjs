import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

async function run(pathname, returning=false) {
  const calls=[];
  const nodes=new Map();
  const context={window:{},location:{hostname:'parcyun.github.io',pathname},
    localStorage:{getItem:()=>returning?'1':null,setItem(){}},
    document:{readyState:'complete',createElement:()=>({}),getElementById:id=>nodes.get(id),
      head:{appendChild:n=>nodes.set(n.id,n)},body:{appendChild:n=>nodes.set(n.id,n)}},
    fetch:async(url,options)=>{calls.push({url,...JSON.parse(options.body)});return {ok:true,json:async()=>url.endsWith('bump_visit')?{page_today:1,page_total:64,all_today:999,all_total:99999}:{today:10,total:197}}}};
  vm.runInNewContext(await readFile(new URL('../public/visitor-counter.js',import.meta.url),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  return {calls,html:nodes.get('visitor-stats')?.innerHTML};
}

for(const returning of [false,true]) {
  for(const [parent,children] of Object.entries({
    '/':['/satury/','/atlas-gears/','/works/masterclass/','/dexterity/hyangmisa/'],
    '/atlas-gears/':['/atlas-gears/','/satury/','/world-map/','/spell-drill/','/math-solid-volume/'],
    '/academica/':['/academica/','/llm-fundamentals/','/academica-parcyun-studio/'],
    '/works/':['/works/','/works/masterclass/','/works/mdbf/','/works/002-i-am-serif/'],
    '/dexterity/':['/dexterity/','/dexterity/hyangmisa/','/dexterity/guidebook/geoweb/','/dexterity/guidebook/spell-drill/','/dexterity/guidebook/satury/'],
  })) test(`${parent} aggregates descendants on ${returning?'repeat':'first'} visit`,async()=>{
    const {calls,html}=await run(parent,returning);
    const paths=calls.find(c=>c.url.endsWith('get_visit_totals'))?.p_paths;
    assert.ok(paths,'must read the same aggregate RPC on both entry paths');
    for(const child of children) assert.ok(paths.includes(child),`${parent} missing ${child}`);
    assert.equal(new Set(paths).size,paths.length);
    assert.match(html,/전체 <b>197<\/b>/);
    assert.ok(!paths.some(p=>/probe|battle|\/dev\/|__diag/.test(p)));
  });
}

test('leaf page and index.html alias count only that service',async()=>{
  for(const path of ['/satury/','/satury/index.html']) {
    const {calls}=await run(path);
    assert.deepEqual(JSON.parse(JSON.stringify(calls.find(c=>c.url.endsWith('get_visit_totals'))?.p_paths)),['/satury/']);
  }
});

test('all catalog services belong to both atlas and homepage totals',async()=>{
  const resources=await readFile(new URL('../src/data/resources.ts',import.meta.url),'utf8');
  const services=[...resources.matchAll(/visitPath: '([^']+)'/g)].map(match=>match[1]);
  for(const parent of ['/','/atlas-gears/']) {
    const {calls}=await run(parent,true);
    const paths=calls[0].p_paths;
    for(const service of services) assert.ok(paths.includes(service),`${parent} missing catalog service ${service}`);
  }
});
