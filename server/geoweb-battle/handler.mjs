import {readFile} from 'node:fs/promises';
import {storage} from './storage.mjs';
import {inviteQr} from '../spell-battle/qr.mjs';

const corpus=JSON.parse(await readFile(new URL('./corpus.json',import.meta.url)));
const store=await storage(corpus);

export async function handleGeoWeb(req,res,{url,cloud,lan,port,json,body,mascot}){
 const path=url.pathname;
 if(path==='/api/geoweb-battle/info')return json(res,200,{inviteBase:cloud?'https://parcyun.github.io':`http://${lan}:${port}`,localOnly:!cloud});
 if(path==='/api/geoweb-battle/session'&&req.method==='POST'){
  const session=await store.identity(await body(req));
  return json(res,200,{id:session.id,token:session.token,name:session.name,kind:session.kind,legacyId:session.legacyId,photo:session.photo});
 }
 const identity=store.verify(req.headers.authorization?.replace(/^Bearer /,''));
 if(!identity)return json(res,401,{error:'계정을 다시 확인해 주세요.'});
 const input=req.method==='POST'?await body(req):{};
 if(path==='/api/geoweb-battle/rooms'&&req.method==='POST')return json(res,200,await store.create(store.withPhoto(identity,input.photo),input.teamCount,input.mode));
 const parts=path.split('/').filter(Boolean),code=parts[3],action=parts[4];
 if(!/^\d{6}$/.test(code||''))throw Error('여섯 자리 코드를 입력해 주세요.');
 const result=await store.run(code,identity.id,(battle,room)=>{
  if(req.method==='GET'){battle.member(room,identity.id);return;}
  switch(action){
   case 'join':battle.join(code,store.withPhoto(identity,input.photo));break;
   case 'presence':battle.presence(code,identity.id,input.connected);return {presenceUpdated:true};
   case 'end':battle.end(code,identity.id);break;
   case 'leave':return battle.leave(code,identity.id);
   case 'settings':battle.configure(code,identity.id,input);break;
   case 'teams':battle.resize(code,identity.id,input.teamCount);break;
   case 'name':battle.rename(code,identity.id,input.name);break;
   case 'pass':return battle.pass(code,identity.id,input.index);
   case 'hint':battle.hint(code,identity.id,input.index);break;
   case 'ready':battle.ready(code,identity.id,input.ready);break;
   case 'move':battle.move(code,identity.id,input.playerId,input.team);break;
   case 'kick':battle.kick(code,identity.id,input.playerId);break;
   case 'rematch':battle.rematch(code,identity.id);break;
   case 'start':battle.start(code,identity.id);break;
   case 'answer':{
    const answer=battle.answer(code,identity.id,input.answer,input.index);
    return {correct:answer.correct,points:answer.points,details:answer.details,penalty:answer.penalty};
   }
   default:throw Error('지원하지 않는 요청입니다.');
  }
 });
 if(action==='qr'){
  const link=(cloud?'https://parcyun.github.io':`http://${lan}:${port}`)+'/world-map/?geoBattle='+code;
  return json(res,200,{link,image:inviteQr(link,mascot)});
 }
 return json(res,200,['answer','leave','pass','presence'].includes(action)?result:result.room);
}
