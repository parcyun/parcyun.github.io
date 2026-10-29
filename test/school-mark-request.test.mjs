import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optimizeSchoolMark,submitSchoolMarkRequest} from '../public/school-mark-request.js';
test('school image uploads reject active formats and preserve emblem aspect ratio while optimizing',async()=>{
 await assert.rejects(()=>optimizeSchoolMark({type:'image/svg+xml',size:20}),/PNG/);
 await assert.rejects(()=>optimizeSchoolMark({type:'image/png',size:9*1024*1024}),/8MB/);
 let closed=false,canvas={getContext:()=>({drawImage:()=>{}}),toDataURL:()=> 'data:image/webp;base64,UklGRabc'};
 const image=await optimizeSchoolMark({type:'image/png',size:20},{createBitmap:async()=>({width:1000,height:500,close:()=>closed=true}),createCanvas:()=>canvas});
 assert.equal(canvas.width,256);assert.equal(canvas.height,128);assert.equal(closed,true);assert.match(image,/image\/webp/);
});
test('school image request saves only school identity and pending image, and refuses duplicates',async()=>{
 const stored=new Map();const dbApi={doc:(_,collection,id)=>collection+'/'+id,serverTimestamp:()=>1,runTransaction:async(_,fn)=>fn({get:async ref=>({exists:()=>stored.has(ref)}),set:(ref,value)=>stored.set(ref,value)})};
 const input={s:{db:{},dbApi},user:{uid:'owner'},school:{id:'J10:7751396',name:'고진중학교',address:'학교 주소'},image:'data:image/webp;base64,UklGRabc'};
 await submitSchoolMarkRequest(input);const row=[...stored.values()][0];assert.equal(row.status,'pending');assert.equal(row.schoolName,'고진중학교');assert.equal(row.ownerUid,'owner');assert.ok(!('nickname' in row));assert.ok(!('profile' in row));
 await assert.rejects(()=>submitSchoolMarkRequest(input),/이미 보냈어요/);
 await assert.rejects(()=>submitSchoolMarkRequest({...input,user:null}),/확인/);
 await assert.rejects(()=>submitSchoolMarkRequest({...input,image:'data:image/svg+xml;base64,AAAA'}),/확인/);
});
