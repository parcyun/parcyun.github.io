import test from 'node:test';
import assert from 'node:assert/strict';
import {accountRecords} from '../public/personal-records.js';

test('Google records follow the owner across clients and disappear on browser-profile sign-in',async()=>{
  globalThis.window=new EventTarget();
  const docs=new Map(),listeners=new Set();
  const emit=()=>listeners.forEach(f=>f());
  function client(game){
    let auth;
    const dbApi={
      collection:(_, ...path)=>path.join('/'),doc:(path,key)=>path+'/'+key,
      onSnapshot:(path,fn)=>{
        const notify=()=>fn({docs:[...docs].filter(([key])=>key.startsWith(path+'/')).map(([key,data])=>({id:key.split('/').at(-1),data:()=>data}))});
        listeners.add(notify);notify();return ()=>listeners.delete(notify);
      },
      runTransaction:async(_,fn)=>{await fn({get:async ref=>({data:()=>docs.get(ref)}),set:(ref,data)=>docs.set(ref,data)});emit();}
    };
    const records=accountRecords({dbApi,authApi:{onAuthStateChanged:(_,fn)=>auth=fn}},game);
    return {records,login:(uid,providerId)=>auth({uid,providerData:[{providerId}]})};
  }
  for(const game of ['spell','geo']){
    const a=client(game),b=client(game);
    a.login('one','google.com'); b.login('one','google.com');
    const key=game==='spell'?'ko_easy_timer':'country_easy';
    const row=game==='spell'?{score:120,correct:1,total:1,combo:1,elapsedMs:1000,date:2,mode:'timer'}:{score:120,seconds:2};
    await a.records.save(key,row);
    assert.equal(game==='spell'?b.records.read().ko.easy[0].score:b.records.read()[key].score,120);
    b.login('guest','anonymous');await b.records.save(key,{score:999});assert.equal(b.records.read(),null);
    b.login('two','google.com');assert.equal(game==='spell'?b.records.read().ko.easy:b.records.read()[key],undefined);
  }
});
