import http from 'node:http';
import {createHmac} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {ContactLedger} from './ledger.mjs';
import {gmailSender} from './mail.mjs';

const productionOrigin='https://parcyun.github.io';
export function validate(value,today){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const {email,subject,message,id,website}=value;
 if(typeof email!=='string'||email.length>254||!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(email))return null;
 if(typeof subject!=='string'||!subject.trim()||subject.length>120||/[\r\n\x00-\x1f]/.test(subject))return null;
 if(typeof message!=='string'||!message.trim()||message.length>5000||message.includes('\0'))return null;
 if(typeof id!=='string'||!new RegExp(`^${today}_[a-f0-9-]{36}$`).test(id)||website)return null;
 return {email:email.trim(),subject:subject.trim(),message:message.trim(),id};
}

export function createContactServer({ledger,sendMail,hashKey,now=Date.now,origins=[productionOrigin]}={}){
 let active=0;
 const hash=(value)=>createHmac('sha256',hashKey).update(value).digest('hex');
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Vary','Origin');
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  const url=new URL(req.url,'http://localhost'),origin=req.headers.origin;
  if(url.pathname==='/health'&&req.method==='GET'){send(200,{ok:true});return;}
  if(url.pathname!=='/api/contact'){send(404,{sent:false});return;}
  if(!origins.includes(origin)){send(403,{sent:false});return;}
  res.setHeader('Access-Control-Allow-Origin',origin);
  if(req.method==='OPTIONS'){
   res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');
   res.setHeader('Access-Control-Max-Age','3600');res.writeHead(204);res.end();return;
  }
  if(req.method!=='POST'){send(405,{sent:false});return;}
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||'')){send(415,{sent:false});return;}
  if(active>=4){send(503,{sent:false,message:'요청이 많습니다. 잠시 후 다시 시도해 주세요.'});return;}
  active++;
  try{
   let size=0,parts=[];
   for await(const part of req.iterator({destroyOnReturn:false})){size+=part.length;if(size>20000){req.resume();send(413,{sent:false});return;}parts.push(part);}
   let input;try{input=JSON.parse(Buffer.concat(parts));}catch{send(400,{sent:false});return;}
   const today=new Date(now()).toISOString().slice(0,10),data=validate(input,today);
   if(!data){send(400,{sent:false,message:'이메일·제목·내용을 확인해 주세요. 오래된 작성 창은 새로 열어 주세요.'});return;}
   const fingerprint=hash(JSON.stringify([data.email,data.subject,data.message])),sender=hash(data.email.toLowerCase());
   const reserved=await ledger.update(today,(entries)=>{
    const old=entries.find(e=>e.id===data.id||e.fingerprint===fingerprint);
    if(old)return {write:false,kind:old.fingerprint===fingerprint?old.state:'conflict'};
    if(entries.length>=50||entries.filter(e=>e.at>now()-3600000).length>=20||entries.filter(e=>e.sender===sender&&e.at>now()-3600000).length>=3)return {write:false,kind:'limited'};
    entries.push({id:data.id,fingerprint,sender,at:now(),state:'pending'});
    return {write:true,kind:'reserved'};
   });
   if(reserved.kind==='sent'){send(200,{sent:true});return;}
   if(reserved.kind==='limited'){res.setHeader('Retry-After','3600');send(429,{sent:false,message:'발송 횟수 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.'});return;}
   if(reserved.kind!=='reserved'){send(409,{sent:false,message:'이미 처리 중이거나 발송 결과 확인이 필요한 문의입니다. 중복 발송을 막기 위해 다시 보내지 않았습니다.'});return;}
   try{
    await sendMail(data);
    await ledger.update(today,(entries)=>{entries.find(e=>e.id===data.id).state='sent';return {write:true};});
    send(200,{sent:true});
   }catch{
    // Keep the reservation: a timeout can occur after Gmail accepted the message.
    send(502,{sent:false,message:'발송 결과를 확인하지 못했습니다. 중복 발송을 막기 위해 자동 재전송하지 않습니다.'});
   }
  }catch{send(503,{sent:false,message:'메일 연결을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
  finally{active--;}
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const credentials=JSON.parse(await readFile(process.env.GMAIL_CREDENTIALS_FILE||'/secrets/gmail.json','utf8'));
 const server=createContactServer({ledger:new ContactLedger(process.env.CONTACT_STATE_BUCKET),sendMail:gmailSender(credentials),hashKey:credentials.client_secret});
 server.requestTimeout=20000;server.headersTimeout=10000;
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Studio contact API ready'));
}
