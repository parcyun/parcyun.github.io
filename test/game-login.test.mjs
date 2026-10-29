import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('signed-out Google login opens authentication without a profile nickname',async()=>{
 const source=readFileSync(new URL('../public/game-account.js',import.meta.url),'utf8');
 const handler=source.match(/body\.querySelector\('#ps-google-login'\)\.onclick = (async e => \{[\s\S]*?\n    \});/)[1];
 let popupCalls=0;const messages=[];const button={disabled:false};
 const auth={};class GoogleAuthProvider{setCustomParameters(value){assert.equal(value.prompt,'select_account')}}
 const context={isReservedNickname:()=>false,body:{querySelector:()=>button},message:text=>messages.push(text),loadSdk:async()=>({auth,authApi:{GoogleAuthProvider,signInWithPopup:async(a,p)=>{assert.equal(a,auth);assert.ok(p instanceof GoogleAuthProvider);popupCalls++}}})};
 await vm.runInNewContext(`(${handler})`,context)({currentTarget:button});
 assert.equal(popupCalls,1);assert.equal(button.disabled,false);assert.match(messages[0],/로그인 창/);
});
