import http from 'node:http';
import {fileURLToPath} from 'node:url';
import legacySearch from './search.cjs';

export function createSearchServer({search=legacySearch,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 const allowedOrigins=new Set(['https://parcyun.github.io']);
 return http.createServer(async(req,res)=>{
  const origin=req.headers.origin;
  res.setHeader('Vary','Origin');
  res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));};
  if(origin&&!allowedOrigins.has(origin)){send(403,{message:'허용되지 않은 출처입니다.'});return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/health'&&req.method==='GET'){send(200,{ok:true});return;}
  if(url.pathname!=='/api/search'){send(404,{message:'Not found'});return;}
  if(req.method==='OPTIONS'){
   res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
   res.setHeader('Access-Control-Max-Age','3600');
   res.writeHead(204);res.end();return;
  }
  const word=url.searchParams.get('q')?.trim();
  if(req.method!=='GET'||typeof word!=='string'||!/^[가-힣ㄱ-ㅎㅏ-ㅣ ]{1,40}$/u.test(word)){
   send(400,{message:'한글 표준어를 입력해 주세요.'});return;
  }
  const cached=cache.get(word);
  if(cached&&cached.expires>now()){
   res.setHeader('Cache-Control','public, max-age=300');send(200,cached.body);return;
  }
  if(!pending.has(word)){
   if(pending.size>=8){res.setHeader('Retry-After','5');send(503,{message:'검색 요청이 많아요. 잠시 후 다시 검색해 주세요.'});return;}
   pending.set(word,(async()=>{
    let status=200,body;
    const response={setHeader:()=>{},status(value){status=value;return this;},json(value){body=value;return this;}};
    try{await search({method:'GET',query:{q:word}},response);}
    catch{status=502;body={message:'우리말샘 응답을 확인할 수 없습니다.'};}
    if(status===200&&body&&typeof body.groups==='object'&&Buffer.byteLength(JSON.stringify(body))<=250000){
     cache.delete(word);cache.set(word,{body,expires:now()+86400000});
     while(cache.size>64)cache.delete(cache.keys().next().value);
    }
    return {status,body:body||{message:'검색 결과를 확인할 수 없습니다.'}};
   })().finally(()=>pending.delete(word)));
  }
  const result=await pending.get(word);
  if(result.status===200)res.setHeader('Cache-Control','public, max-age=300');
  else res.setHeader('Cache-Control','no-store');
  send(result.status,result.body);
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const server=createSearchServer();
 server.listen(Number(process.env.PORT)||8080,'0.0.0.0',()=>console.log('Satury API ready'));
}
