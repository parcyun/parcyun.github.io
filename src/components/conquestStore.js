const API=(import.meta.env.PUBLIC_CONQUEST_API||'/api/conquest').replace(/\/$/,'');
let current,player,selection=null,landCheck=()=>false,credential,profileName='',connection='connecting',clockOffset=0,questionRequest=null,room=null,roundQueue=Promise.resolve(),connectionError='',activeParticipants=0;
const listeners=new Set();
export const currentRoom=()=>room;
export const activeCount=()=>activeParticipants;
export const listRooms=()=>request('rooms');
export const playerId=()=>player;
export const snapshot=()=>current;
export const selected=()=>selection;
export const nickname=()=>profileName;
export const lastConnectionError=()=>connectionError;
export const connectionState=()=>connection;
export const serverNow=()=>Date.now()+clockOffset;
function emit(){for(const fn of listeners)fn();}
export const subscribe=fn=>{listeners.add(fn);return()=>listeners.delete(fn);};
export function selectCell(id){selection=id;emit();}
export function setLandCheck(fn){landCheck=fn;}
export const isLand=id=>landCheck(id);
async function request(path,data){
  const response=await fetch(`${API}/${path}`,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json'}:{}),...(credential?{Authorization:`Bearer ${credential}`} : {}),...(room?{'X-Conquest-Room':room.key}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});
  const result=await response.json();if(!response.ok)throw Error(result.error||'서버 연결에 실패했어요.');return result;
}
function accept(result){if(Number.isInteger(result.activeParticipants))activeParticipants=result.activeParticipants;if(result.world&&room&&result.world.room.key!==room.key)return;if(result.world&&(!current||(result.world.revision||0)>=(current.revision||0)))current=result.world;if(result.player)player=result.player;if(result.nickname)profileName=result.nickname;if(result.serverTime)clockOffset=result.serverTime-Date.now();connection='connected';connectionError='';emit();}
export async function initialize(){
  let profile=null;try{profile=JSON.parse(localStorage.getItem('ps.browser-profile.v1')||'null');}catch{}
  const key='geoweb.conquest.profile.guest';
  credential=localStorage.getItem(key);
  try{
  if(!credential){const result=await request('profile',{nickname:profile?.nickname});credential=result.token;localStorage.setItem(key,credential);player=result.player;profileName=result.nickname;}
  try{room=JSON.parse(sessionStorage.getItem('geoweb.conquest.room')||'null');}catch{}
  if(profile?.nickname&&room)await request('nickname',{nickname:profile.nickname});
  if(room)await refresh();else{connection='connected';connectionError='';emit();}return current;
  }catch(e){connection='offline';connectionError=e.message;emit();throw e;}
}
// Simplification: visible clients poll their room. Upgrade to authenticated streaming before large public cohorts.
let refreshing=null;
export async function refresh(){if(!credential||!room)return;if(refreshing)return refreshing;refreshing=request('world').then(accept).catch(e=>{connection='offline';emit();throw e;}).finally(()=>{refreshing=null;});return refreshing;}
export async function dispatch(action){const result=await request('action',action);accept(result);return current;}
export function beginQuestion(question,mode,difficulty,round){questionRequest=roundQueue.catch(()=>{}).then(()=>request('question',{questionId:question.id,mode,difficulty,round}));roundQueue=questionRequest;questionRequest.catch(()=>{});}
export function answerQuestion(answer,battle){const pending=questionRequest;if(!pending)return Promise.reject(Error('서버 문제 연결을 기다려 주세요.'));const work=roundQueue.catch(()=>{}).then(async()=>{const {nonce}=await pending;let result;try{result=await request('answer',{nonce,answer,battle});}catch(error){if(error.name!=='TimeoutError'&&error.name!=='TypeError')throw error;result=await request('answer',{nonce,answer,battle});}accept(result);return result;});roundQueue=work;return work;}
export function resetCombo(){const work=roundQueue.catch(()=>{}).then(()=>request('reset',{}));roundQueue=work;work.catch(()=>{});return work;}

export async function chooseRoom(input){const result=await request('room',input);room=result.room;current=null;questionRequest=null;roundQueue=Promise.resolve();sessionStorage.setItem('geoweb.conquest.room',JSON.stringify(room));emit();await refresh();return room;}
export function openRoomSelector(){window.dispatchEvent(new Event('conquest-choose-room'));}
