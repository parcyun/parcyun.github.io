// One-time owner consent. Never deploy this local-only callback server.
import http from 'node:http';
import {readFile,writeFile,chmod} from 'node:fs/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {OAuth2Client} from 'google-auth-library';

const [clientFile,outputFile]=process.argv.slice(2);
if(!clientFile||!outputFile)throw Error('Supply private client JSON and output paths');
const credentials=JSON.parse(await readFile(clientFile,'utf8')).web;
const redirect='http://127.0.0.1:57931/oauth/callback';
if(!credentials?.redirect_uris?.includes(redirect))throw Error('Unexpected callback registration');
const client=new OAuth2Client(credentials.client_id,credentials.client_secret,redirect);
const state=randomBytes(32).toString('hex');
const {codeVerifier,codeChallenge}=await client.generateCodeVerifierAsync();
let handled=false;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,redirect);
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'none'");
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Type','text/plain; charset=utf-8');
 if(url.pathname!=='/oauth/callback'){res.writeHead(404);res.end();return;}
 const received=Buffer.from(url.searchParams.get('state')||'');
 if(handled||received.length!==state.length||!timingSafeEqual(received,Buffer.from(state))){res.writeHead(400);res.end('Invalid authorization state');return;}
 handled=true;
 if(url.searchParams.has('error')){res.writeHead(400);res.end('연결이 승인되지 않았습니다.');server.close();return;}
 try{
  const {tokens}=await client.getToken({code:url.searchParams.get('code'),codeVerifier});
  if(!tokens.refresh_token)throw Error('Missing offline authorization');
  await writeFile(outputFile,JSON.stringify({client_id:credentials.client_id,client_secret:credentials.client_secret,refresh_token:tokens.refresh_token}),{mode:0o600,flag:'wx'});
  await chmod(outputFile,0o600);
  res.end('Gmail 발송 권한 연결이 완료되었습니다. 이 창을 닫고 Codex에 완료됐다고 알려주세요.');
  console.log('Authorization stored securely. No mail has been sent.');
 }catch{res.writeHead(500);res.end('권한 저장에 실패했습니다. Codex에서 상태를 확인해 주세요.');console.error('Authorization exchange failed; secrets omitted');}
 server.close();
});
server.listen(57931,'127.0.0.1',async()=>{
 const url=client.generateAuthUrl({access_type:'offline',prompt:'consent',scope:['https://www.googleapis.com/auth/gmail.send'],state,code_challenge:codeChallenge,code_challenge_method:'S256',login_hint:'pen.layered@gmail.com'});
 await writeFile(outputFile+'.url',url,{mode:0o600});
 console.log('Consent URL prepared; callback listening on 127.0.0.1:57931');
});
setTimeout(()=>{console.log('Authorization window expired.');server.close();},30*60*1000).unref();
