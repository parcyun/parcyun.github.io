import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createContactServer,validate} from '../server/contact/server.mjs';
import {makeMessage,inbox} from '../server/contact/mail.mjs';

const now=Date.parse('2026-11-16T05:00:00Z'),day='2026-11-16';
const form=()=>({email:'visitor@example.com',subject:'교실 협업 제안',message:'함께 만들어요.',id:`${day}_${randomUUID()}`,website:''});
async function fixture(t,sendMail=async()=>{}){
 const entries=[],ledger={async update(_day,fn){return fn(entries);}};
 const server=createContactServer({ledger,sendMail,hashKey:'test-key',now:()=>now});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>{server.closeAllConnections();server.close();});
 const url=`http://127.0.0.1:${server.address().port}/api/contact`;
 const post=(body,headers={})=>fetch(url,{method:'POST',headers:{Origin:'https://parcyun.github.io','Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 return {entries,post,url};
}

test('fixed recipient and Reply-To with UTF-8 MIME subject/body',()=>{
 const data=form(),raw=makeMessage(data);
 assert.match(raw,new RegExp(`To: ${inbox.replaceAll('.','\\.')}`));
 assert.match(raw,/Reply-To: visitor@example.com/);
 assert.match(raw,/Content-Transfer-Encoding: base64/);
 assert.doesNotMatch(raw,/(?:^|\r\n)To: visitor@example.com/);
 for(const line of raw.split('\r\n'))assert.ok(line.length<=100);
});
test('rejects header injection, invalid email, old request, honeypot and oversize fields',()=>{
 for(const patch of [{email:'bad\r\nBcc: bad@example.com'},{subject:'a\nBcc: bad@example.com'},{message:'x'.repeat(5001)},{website:'spam'},{id:`2026-11-15_${randomUUID()}`},{email:'<test@example.com>'}])assert.equal(validate({...form(),...patch},day),null);
});
test('requires allowed Origin, JSON, valid body and supports preflight',async t=>{
 const f=await fixture(t);
 assert.equal((await f.post(form(),{Origin:'https://bad.example'})).status,403);
 assert.equal((await f.post(form(),{Origin:''})).status,403);
 assert.equal((await f.post(form(),{'Content-Type':'text/plain'})).status,415);
 assert.equal((await f.post({})).status,400);
 assert.equal((await f.post({...form(),message:'x'.repeat(22000)})).status,413);
 const r=await fetch(f.url,{method:'OPTIONS',headers:{Origin:'https://parcyun.github.io'}});
 assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),'https://parcyun.github.io');
 assert.equal(f.entries.length,0);
});
test('one successful send, retries deduplicated, changed payload rejected, no PII persisted',async t=>{
 let sent=0;const f=await fixture(t,async()=>{sent++;}),data=form();
 assert.deepEqual(await(await f.post(data)).json(),{sent:true});
 assert.deepEqual(await(await f.post(data)).json(),{sent:true});
 assert.equal((await f.post({...data,message:'changed'})).status,409);
 assert.equal(sent,1);
 assert.doesNotMatch(JSON.stringify(f.entries),/visitor|example|함께|교실/);
});
test('ambiguous delivery is never automatically resent',async t=>{
 let sent=0;const f=await fixture(t,async()=>{sent++;throw Error('timeout');}),data=form();
 assert.equal((await f.post(data)).status,502);
 assert.equal((await f.post(data)).status,409);
 assert.equal(sent,1);
});
test('sender hourly cap is enforced',async t=>{
 const f=await fixture(t);
 for(let i=0;i<3;i++)assert.equal((await f.post({...form(),subject:`문의 ${i}`})).status,200);
 assert.equal((await f.post({...form(),subject:'추가 문의'})).status,429);
});
test('global hourly and daily caps apply even with rotating emails',async t=>{
 const f=await fixture(t);
 for(let i=0;i<20;i++)assert.equal((await f.post({...form(),email:`v${i}@example.com`})).status,200);
 assert.equal((await f.post({...form(),email:'other@example.com'})).status,429);
 f.entries.forEach(e=>e.at=now-7200000);
 while(f.entries.length<50)f.entries.push({id:randomUUID(),sender:'earlier',at:now-7200000,state:'sent'});
 assert.equal((await f.post({...form(),email:'another@example.com'})).status,429);
});
