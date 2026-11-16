// Local-only preview. Reuses the configured stdict MCP so its key never enters this repo/browser.
import http from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';

const root=resolve(fileURLToPath(new URL('../public/',import.meta.url)));
const mcp=spawn('/opt/homebrew/bin/python3',['/Users/parcyun/Downloads/Codex/Tools/stdict-mcp/server.py'],{stdio:['pipe','pipe','ignore']});
const pending=new Map();let nextId=0,active=0;
createInterface({input:mcp.stdout}).on('line',line=>{
 try{const result=JSON.parse(line),request=pending.get(result.id);if(!request)return;clearTimeout(request.timer);pending.delete(result.id);if(result.error||result.result?.isError)request.reject(Error('사전 API 응답을 확인하지 못했어요.'));else request.resolve(result.result?.structuredContent||result.result);}catch{}
});
mcp.on('exit',()=>{for(const r of pending.values()){clearTimeout(r.timer);r.reject(Error('로컬 사전 연결이 종료됐어요.'));}pending.clear();});
function rpc(method,params){
 return new Promise((resolve,reject)=>{
  const id=++nextId,timer=setTimeout(()=>{pending.delete(id);reject(Error('사전 응답이 지연되고 있어요.'));},25000);
  pending.set(id,{resolve,reject,timer});mcp.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');
 });
}
await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'satury-local-preview',version:'1'}});
const many=x=>Array.isArray(x)?x:x?[x]:[];
export function searchResult(data){return {total:Number(data.channel?.total)||0,items:many(data.channel?.item).map(item=>({word:item.word,number:item.sup_no,code:item.target_code,pos:item.pos||'',origin:item.origin||'',definition:item.sense?.definition||''}))};}
export function detailResult(data){
 const word=many(data.channel?.item)[0]?.word_info||{};
 return {word:word.word||'',origin:many(word.original_language_info).map(x=>x.original_language).filter(Boolean).join(', '),origins:many(word.original_language_info).filter(x=>x.original_language).map(x=>({text:x.original_language,language:x.language_type||''})),pronunciation:many(word.pronunciation_info).flatMap(x=>many(x.pronunciation)).filter(Boolean),groups:many(word.pos_info).map(pos=>({pos:pos.pos,senses:many(pos.comm_pattern_info).flatMap(pattern=>many(pattern.sense_info)).map(sense=>({definition:sense.definition||'',examples:many(sense.example_info).filter(x=>!x.source).map(x=>x.example).filter(Boolean)}))}))};
}
const cache=new Map();
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const url=new URL(req.url,'http://localhost');
 if(!['GET','HEAD'].includes(req.method)){send(405,{message:'허용되지 않은 요청입니다.'});return;}
 if(req.headers.host!==`127.0.0.1:${server.address().port}`){send(403,{message:'로컬 미리보기만 허용합니다.'});return;}
 if(url.pathname==='/api/dialect/search'){
  const q=url.searchParams.get('q')||'';
  if(!/^[가-힣ㄱ-ㅎㅏ-ㅣ ]{1,40}$/u.test(q)){send(400,{message:'검색어를 확인해 주세요.'});return;}
  try{const response=await fetch('https://satury-api-1093702239224.asia-northeast3.run.app/api/search?q='+encodeURIComponent(q),{headers:{Origin:'https://parcyun.github.io'},signal:AbortSignal.timeout(20000)});send(response.status,await response.json());}catch{send(502,{message:'우리말샘 응답이 지연되고 있어요.'});}
  return;
 }
 if(url.pathname.startsWith('/api/stdict/')){
  const detail=url.pathname==='/api/stdict/detail',search=url.pathname==='/api/stdict/search';
  const value=url.searchParams.get(detail?'code':'q')||'';
  if((!detail&&!search)||!(detail?/^[0-9]{1,12}$/:/^[가-힣ㄱ-ㅎㅏ-ㅣ ]{1,40}$/u).test(value)){send(400,{message:'검색어를 확인해 주세요.'});return;}
  const key=detail?'detail:'+value:'search:'+value,old=cache.get(key);
  if(old){send(200,old);return;}
  if(active>=3){send(503,{message:'조회가 많아요. 잠시 후 다시 검색해 주세요.'});return;}
  active++;
  try{
   const data=await rpc('tools/call',{name:detail?'stdict_detail':'stdict_search',arguments:detail?{target_code:value}:{query:value,method:'exact',num:100}});
   const result=detail?detailResult(data):searchResult(data);cache.set(key,result);while(cache.size>128)cache.delete(cache.keys().next().value);send(200,result);
  }catch(error){send(502,{message:error.message});}finally{active--;}
  return;
 }
 try{
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!path.startsWith(root+sep)&&path!==root){send(403,{});return;}
  const info=await stat(path),file=info.isDirectory()?resolve(path,'index.html'):path;
  const content=await readFile(file),type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream';
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:content);
 }catch{send(404,{message:'페이지를 찾을 수 없습니다.'});}
});
server.listen(Number(process.env.PORT)||0,'127.0.0.1',()=>console.log(`Local Satury dictionary preview: http://127.0.0.1:${server.address().port}/satury/`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{mcp.kill();server.close();process.exit();});
