import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash,randomBytes,randomUUID,randomInt } from 'node:crypto';
import { resolve,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { geoContains,geoPath,geoEquirectangular } from 'd3-geo';
import sharp from 'sharp';
import {createStorage} from './storage.mjs';
import {initialWorld,applyAction,rebuildWaters,settle,center,COLS,ROWS,GLOBAL_ROOMS,rulesForRoom} from '../../src/components/conquestEngine.js';
import {buildGamePools,matchesAnswer,scoreAnswer,GAME_MODES} from '../../src/components/geoGameData.js';
const ROOT=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const world=JSON.parse(await readFile(resolve(ROOT,'public/lab-data/world.json'),'utf8'));
const vatican=JSON.parse(await readFile(resolve(ROOT,'public/lab-data/conquest-vatican.json'),'utf8'));world.features.push(vatican);
const pools=buildGamePools(world,JSON.parse(await readFile(resolve(ROOT,'public/lab-data/geoweb-landforms.json'),'utf8')));
const path=geoPath(geoEquirectangular().scale(2048/(2*Math.PI)).translate([1024,512]));
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1024"><path fill="white" d="${path(world)}"/></svg>`;
const {data:mask,info}=await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const cache=new Map();
function isLand(id){if(cache.has(id))return cache.get(id);const [lon,lat]=center(id),x=Math.max(0,Math.min(2047,Math.floor((lon+180)/360*2048))),y=Math.max(0,Math.min(1023,Math.floor((90-lat)/180*1024)));const land=mask[(y*2048+x)*info.channels+info.channels-1]>127;cache.set(id,land);return land;}
function preciseLand(id){return world.features.some(f=>geoContains(f,center(id)));}
const storage=await createStorage();
const refresh=w=>{w.rules=rulesForRoom(w.room);return rebuildWaters(settle(w),isLand);};
const presenceWindow=120_000;
async function presence(roomKey,player){
 const key=`presence-${roomKey}`,now=Date.now();
 const previous=await storage.get(key)||{};
 if(player&&now-(previous[player]||0)>30_000)return storage.transaction([key],values=>{const active=Object.fromEntries(Object.entries(values[key]||{}).filter(([,at])=>now-at<presenceWindow));active[player]=now;values[key]=active;return Object.keys(active).length;});
 return Object.values(previous).filter(at=>now-at<presenceWindow).length;
}
const hash=token=>createHash('sha256').update(token).digest('hex');
const allowed=new Set((process.env.CONQUEST_ORIGINS||'http://127.0.0.1:47585,http://localhost:47585,https://parcyun.github.io').split(','));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.mp4':'video/mp4'};
function validCell(id){if(typeof id!=='string'||!/^\d{1,5}:\d{1,5}$/.test(id))return false;const [c,r]=id.split(':').map(Number);return c>=0&&c<COLS&&r>=0&&r<ROWS;}
async function body(req){let raw='';for await(const c of req){raw+=c;if(Buffer.byteLength(raw)>16384)throw Error('요청이 너무 큽니다.');}return JSON.parse(raw||'{}');}
const limit=new Map();function rate(key,max,period){const now=Date.now(),record=limit.get(key);if(!record||now-record.start>=period){limit.set(key,{start:now,n:1});return;}if(++record.n>max)throw Error('잠시 후 다시 시도하세요.');if(limit.size>10000)for(const [k,v] of limit)if(now-v.start>3600000)limit.delete(k);}
const server=createServer(async(req,res)=>{
  const receivedAt=Date.now();
  const origin=req.headers.origin;let sameOrigin=false;try{sameOrigin=!!origin&&new URL(origin).host===req.headers.host;}catch{}res.setHeader('X-Content-Type-Options','nosniff');
  if(origin&&(allowed.has(origin)||sameOrigin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','authorization,content-type,x-conquest-room');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');}
  const send=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname.startsWith('/api/conquest/')){
      if(origin&&!allowed.has(origin)&&!sameOrigin)return send(403,{error:'허용되지 않은 출처입니다.'});
      if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
      if(url.pathname==='/api/conquest/health')return send(200,{ok:true,storage:storage.mode});
      if(url.pathname==='/api/conquest/profile'&&req.method==='POST'){
        rate(`new:${req.socket.remoteAddress}`,2000,3600000);const input=await body(req),token=randomBytes(32).toString('hex'),id=randomUUID();
        const nickname=String(input.nickname||`탐험가 ${randomBytes(2).toString('hex')}`).trim().slice(0,20);
        const profile={id,nickname,createdAt:Date.now(),challenge:null,combo:0,rooms:{}};
        await storage.transaction([`profile-${hash(token)}`],values=>{values[`profile-${hash(token)}`]=profile;});
        return send(201,{token,player:id,nickname});
      }
      const token=req.headers.authorization?.replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(token||''))return send(401,{error:'브라우저 프로필을 연결해 주세요.'});
      const key=`profile-${hash(token)}`,profile=await storage.get(key);if(!profile)return send(401,{error:'프로필 연결을 찾지 못했어요.'});
      rate(key,300,60000);
      if(req.method==='GET'&&url.pathname==='/api/conquest/rooms')return send(200,{global:await Promise.all(GLOBAL_ROOMS.map(async room=>({...room,activeParticipants:await presence(room.key)})))});
      if(req.method==='POST'&&url.pathname==='/api/conquest/room'){
        const input=await body(req);
        if(input.type==='global'){const room=GLOBAL_ROOMS.find(r=>r.key===input.key);if(!room)throw Error('서버를 선택하세요.');return send(200,{room});}
        if(input.type==='create'){
          const name=String(input.name||'').trim();if(!name||name.length>40)throw Error('서버 이름은 1~40자로 입력하세요.');
          for(let attempt=0;attempt<10;attempt++){
            const code=String(randomInt(100000,1000000)),room={key:`class-${randomUUID()}`,name,kind:'class',code,creator:profile.id,createdAt:Date.now()};
            const result=await storage.transaction([`room-${code}`,key],values=>{if(values[`room-${code}`])return null;values[`room-${code}`]=room;values[key].rooms??={};values[key].rooms[room.key]=room;return room;});if(result)return send(201,{room:result});
          }throw Error('코드를 만들지 못했어요. 다시 시도해 주세요.');
        }
        if(input.type==='join'){
          if(!/^\d{6}$/.test(String(input.code||'')))throw Error('여섯 자리 숫자 코드를 입력하세요.');
          const room=await storage.transaction([`room-${input.code}`,key],values=>{const room=values[`room-${input.code}`];if(!room)throw Error('해당 코드를 찾을 수 없어요.');values[key].rooms??={};values[key].rooms[room.key]=room;return room;});return send(200,{room});
        }throw Error('서버 입장 방법을 선택하세요.');
      }
      const roomKey=String(req.headers['x-conquest-room']||'');
      const room=GLOBAL_ROOMS.find(r=>r.key===roomKey)||profile.rooms?.[roomKey];
      if(!room)return send(400,{error:'글로벌 서버 또는 우리반 서버를 먼저 선택하세요.'});
      // Simplification: one transactional world document per room. Shard territory and operations before a room approaches 850 KB or sustained classroom-wide contention.
      const worldKey=`world-${room.key}`;
      if(req.method==='GET'&&url.pathname==='/api/conquest/world'){
        const w=refresh((await storage.get(worldKey))||initialWorld(room));return send(200,{world:w,activeParticipants:await presence(room.key,profile.id),player:profile.id,nickname:profile.nickname,serverTime:Date.now()});
      }
      if(req.method!=='POST')return send(404,{error:'요청을 찾지 못했어요.'});
      const input=await body(req);
      if(url.pathname==='/api/conquest/nickname'){const nickname=String(input.nickname||'').trim();if(nickname.length<2||nickname.length>20)throw Error('별명은 2~20자로 입력하세요.');await storage.transaction([key],values=>{values[key].nickname=nickname;});return send(200,{ok:true});}
      if(url.pathname==='/api/conquest/question'){
        const question=pools[input.mode]?.find(q=>q.id===input.questionId);if(!question)throw Error('게임 문제를 확인할 수 없어요.');
        const tier=['easy','med','hard','expert'].includes(input.difficulty)?(input.difficulty==='expert'?'hard':input.difficulty):GAME_MODES.find(m=>m.id===input.mode)?.tier;
        const nonce=randomUUID();await storage.transaction([key],values=>{const p=values[key];if(p.round!==String(input.round||''))p.combo=0;p.round=String(input.round||'').slice(0,64);p.challenge={roomKey:room.key,nonce,questionId:question.id,mode:input.mode,tier,startedAt:Date.now(),expert:input.difficulty==='expert'};});return send(200,{nonce});
      }
      if(url.pathname==='/api/conquest/reset'){await storage.transaction([key],values=>{values[key].combo=0;});return send(200,{ok:true});}
      if(!['/api/conquest/action','/api/conquest/answer'].includes(url.pathname))return send(404,{error:'요청을 찾지 못했어요.'});
      const result=await storage.transaction([worldKey,key],values=>{
        const w=refresh(values[worldKey]||initialWorld(room)),p=values[key];let points=0;
        if(url.pathname.endsWith('/answer')){
          const previous=p.receipts?.find(r=>r.nonce===input.nonce&&r.roomKey===room.key&&r.operation===input.battle);if(previous){values[worldKey]=w;return {world:w,player:p.id,nickname:p.nickname,points:previous.points,completed:previous.completed,replayed:true,serverTime:Date.now()};}
          const q=p.challenge;if(!q||q.nonce!==input.nonce||q.roomKey!==room.key)throw Error('이미 처리했거나 만료된 문제예요.');
          const question=pools[q.mode]?.find(item=>item.id===q.questionId);const elapsed=(receivedAt-q.startedAt)/1000;p.challenge=null;
          if(elapsed>600||q.expert&&elapsed>7||!matchesAnswer(String(input.answer||''),question)){p.combo=0;values[worldKey]=w;return {error:'정답과 제한 시간을 확인하세요.',invalid:true};}
          p.combo++;points=scoreAnswer(String(input.answer),Math.max(.5,elapsed),q.tier,p.combo).total;
          const operation=[...w.battles,...w.campaigns].find(b=>b.id===input.battle);if(!operation||!operation.participants.includes(p.id))throw Error('참여한 작전을 선택하세요.');
          const completed=operation.status!=='active';if(completed)points=0;else applyAction(w,p.id,{type:'contribute',id:input.battle,points},receivedAt,isLand);
          p.receipts=[...(p.receipts||[]),{nonce:input.nonce,roomKey:room.key,operation:input.battle,points,completed}].slice(-20);
        }else{
          if(!['found','rebel','join','leave','plan','participate','propose','proposeCapital','vote','voyage'].includes(input.type))throw Error('허용되지 않은 행동입니다.');
          if(['found','rebel','plan','voyage','proposeCapital'].includes(input.type)&&!validCell(input.cell))throw Error('블록을 확인해 주세요.');
          if(['found','rebel'].includes(input.type)&&!preciseLand(input.cell))throw Error('육지 블록에서 시작하세요.');
          applyAction(w,p.id,{...input,id:['found','rebel','plan','propose','proposeCapital','voyage'].includes(input.type)?randomUUID():input.id},Date.now(),isLand);
        }
        w.revision=(w.revision||0)+1;values[worldKey]=w;return {world:w,player:p.id,nickname:p.nickname,points,completed:url.pathname.endsWith('/answer')&&!!p.receipts?.at(-1)?.completed,serverTime:Date.now()};
      });return send(result.invalid?400:200,result);
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
    let filename=resolve(ROOT,'dist',`.${decodeURIComponent(url.pathname)}`),base=resolve(ROOT,'dist');if(!filename.startsWith(base+sep)&&filename!==base){res.writeHead(403);return res.end();}
    if((await stat(filename)).isDirectory())filename=resolve(filename,'index.html');res.writeHead(200,{'Content-Type':mime[extname(filename)]||'application/octet-stream'});if(req.method==='HEAD')return res.end();createReadStream(filename).pipe(res);
  }catch(e){if(e.code==='ENOENT'){res.writeHead(404);res.end('Not found');}else send(400,{error:e.message||'요청을 처리하지 못했어요.'});}
});
const port=Number(process.env.PORT||47585);server.listen(port,process.env.CONQUEST_HOST||'127.0.0.1',()=>console.log(`GeoWeb conquest: http://127.0.0.1:${port}/world-map/dev/ (${storage.mode})`));
