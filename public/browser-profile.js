import { isReservedNickname } from './spell-leaderboard.js?v=20261029-6';
export const BROWSER_PROFILE_KEY='ps.browser-profile.v1';
export function normalizeSchool(value) {
  if(!value)return null;
  const id=String(value.id||'').slice(0,60),name=String(value.name||'').trim().slice(0,60);
  if(!id||!name)return null;
  let homepage='';try{const url=new URL(value.homepage);if(['http:','https:'].includes(url.protocol)){url.protocol='https:';homepage=url.href.slice(0,300);}}catch{}
  return {id,name,address:String(value.address||'').trim().slice(0,200),homepage};
}
function fields(value){
  const nickname=String(value?.nickname||'').trim(),school=String(value?.school||'').trim(),photo=String(value?.photo||'');
  if(nickname.length<2||nickname.length>20||isReservedNickname(nickname))throw new Error('2~20자의 별명을 입력해 주세요. DEXTER와 parcyun이 포함된 별명은 사용할 수 없어요.');
  if(school.length>60||photo.length>90000||(photo&&!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(photo)))throw new Error('프로필 형식을 확인해 주세요.');
  const schoolInfo=normalizeSchool(value.schoolInfo);
  if(schoolInfo&&schoolInfo.name!==school)throw new Error('학교를 다시 선택해 주세요.');
  return {nickname,school,photo,...(schoolInfo?{schoolInfo}:{} )};
}
function restore(value){try{if(!/^[a-f0-9]{32}$/.test(value?.version)||!Number.isFinite(value.updatedAt))return null;const data=fields(value);if(data.schoolInfo)Object.freeze(data.schoolInfo);return Object.freeze({...data,version:value.version,updatedAt:value.updatedAt});}catch{return null;}}
export function createBrowserProfileStore({storage,eventTarget,channel,randomId=()=>crypto.randomUUID().replaceAll('-','')}={}) {
  let trusted=null;
  try{trusted=restore(JSON.parse(storage.getItem(BROWSER_PROFILE_KEY)||'null'));}catch{}
  const write=()=>{if(trusted)storage.setItem(BROWSER_PROFILE_KEY,JSON.stringify(trusted));else storage.removeItem(BROWSER_PROFILE_KEY);};
  const check=()=>{try{const expected=trusted?JSON.stringify(trusted):null;if(storage.getItem(BROWSER_PROFILE_KEY)!==expected)write();}catch{}};
  const receive=event=>{const next=restore(event.data);if(next&&(!trusted||next.updatedAt>trusted.updatedAt)){trusted=next;check();eventTarget?.dispatchEvent(new Event('ps-browser-profile-updated'));}};
  channel?.addEventListener('message',receive);
  eventTarget?.addEventListener('storage',check);eventTarget?.addEventListener('focus',check);
  const timer=eventTarget?.setInterval(check,100);check();
  return {
    current:()=>trusted,
    save(input){const next=fields(input),previous=trusted?fields(trusted):null;
      const version=previous&&JSON.stringify(previous)===JSON.stringify(next)?trusted.version:randomId();
      const candidate=restore({...next,version,updatedAt:Math.max(Date.now(),(trusted?.updatedAt||0)+1)});
      if(!candidate)throw new Error('프로필을 저장하지 못했어요.');
      storage.setItem(BROWSER_PROFILE_KEY,JSON.stringify(candidate));trusted=candidate;channel?.postMessage(trusted);return trusted;
    },
    check,
    destroy(){if(timer!==undefined)eventTarget.clearInterval(timer);eventTarget?.removeEventListener('storage',check);eventTarget?.removeEventListener('focus',check);channel?.removeEventListener('message',receive);channel?.close();}
  };
}
