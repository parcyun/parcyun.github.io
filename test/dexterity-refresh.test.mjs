import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source = readFileSync(new URL('../public/dexterity-refresh.js', import.meta.url), 'utf8');
function setup() {
  const handlers = new Map();
  const classes = new Set();
  const node = () => ({classList:{add(...values){values.forEach(v=>classes.add(v));},remove(...values){values.forEach(v=>classes.delete(v));},toggle(v,on){on?classes.add(v):classes.delete(v);}},style:{setProperty(){},removeProperty(){}},setAttribute(){},remove(){this.removed=true;},matches(){return false;}});
  const root=node(), body=node(), indicator=node();
  body.append=()=>{};
  let modal=false, coarse=true, reloads=0, cleanup;
  const window={scrollY:0,location:{reload(){reloads++;}},psPageLifecycle:{register(name,init){cleanup=init();}}};
  const document={documentElement:root,body,createElement:()=>indicator,querySelector:s=>s==='dialog[open]'?modal:{} ,addEventListener:(type,fn)=>handlers.set(type,fn),removeEventListener:type=>handlers.delete(type)};
  runInNewContext(source,{document,window,matchMedia:()=>({matches:coarse}),getComputedStyle:()=>({overflowY:'visible',overflowX:'visible'})});
  const touch=(x,y)=>({clientX:x,clientY:y});
  const fire=(type,x=0,y=0,extra={})=>{const event={target:body,touches:type==='touchend'?[]:[touch(x,y)],cancelable:true,preventDefault(){this.prevented=true;},...extra};handlers.get(type)?.(event);return event;};
  return {window,indicator,classes,fire,cleanup,handlers,reloads:()=>reloads,setModal:v=>modal=v,setCoarse:v=>coarse=v,node};
}
test('top downward pull reloads only on release and only once',()=>{
  const s=setup();s.fire('touchstart');const move=s.fire('touchmove',0,140);
  assert.equal(move.prevented,true);assert.equal(s.reloads(),0);assert.ok(s.classes.has('is-ready'));
  s.fire('touchend');s.fire('touchend');assert.equal(s.reloads(),1);
});
test('short pull, reversal, cancellation and horizontal gestures do not reload',()=>{
  for(const [x,y,cancel] of [[0,80,false],[160,130,false],[0,140,true],[0,-20,false]]){
    const s=setup();s.fire('touchstart');s.fire('touchmove',x,y);if(cancel)s.fire('touchcancel');s.fire('touchend');assert.equal(s.reloads(),0);
  }
  const s=setup();s.fire('touchstart');s.fire('touchmove',0,150);s.fire('touchmove',0,5);s.fire('touchend');assert.equal(s.reloads(),0);
});
test('scrolled page, modal, desktop, links and multitouch are excluded',()=>{
  for(const kind of ['scroll','modal','desktop','link','multitouch']){
    const s=setup();let extra={};
    if(kind==='scroll')s.window.scrollY=300;
    if(kind==='modal')s.setModal(true);
    if(kind==='desktop')s.setCoarse(false);
    if(kind==='link'){const link=s.node();link.matches=()=>true;extra.target=link;}
    if(kind==='multitouch')extra.touches=[{clientX:0,clientY:0},{clientX:20,clientY:0}];
    s.fire('touchstart',0,0,extra);s.fire('touchmove',0,160);s.fire('touchend');assert.equal(s.reloads(),0,kind);
  }
});
test('navigation cleanup removes listeners and indicator',()=>{
  const s=setup();s.cleanup();assert.equal(s.handlers.size,0);assert.equal(s.indicator.removed,true);assert.equal(s.classes.has('dexterity-refresh-enabled'),false);
});
