import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {PLAYER_COLORS} from './conquestColors.js';
import * as store from './conquestStore.js';
export default function ConquestProfile(){
 const [host,setHost]=useState(null),[saved,setSaved]=useState(store.playerAppearance()),[draft,setDraft]=useState(null),[part,setPart]=useState('fill'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const resize=new ResizeObserver(()=>scan());let observed=null;
  const scan=()=>{const actions=document.querySelector('.ps-service-actions');if(actions&&observed!==actions){observed=actions;resize.observe(actions);}if(actions){const rect=actions.getBoundingClientRect();if(rect.height)document.querySelector('.conquest-dev')?.style.setProperty('--cq-footer-space',`${Math.max(24,innerHeight-rect.top+(matchMedia('(max-width:760px)').matches?16:24))}px`);}
  const icon=document.querySelector('.ps-account-trigger'),value=store.playerAppearance();if(icon&&value){icon.style.setProperty('--cq-player-fill',value.fill);icon.style.setProperty('--cq-player-border',value.border);icon.classList.add('cq-player-trigger');}const target=[...document.querySelectorAll('dialog.ps-account-dialog[open]')].find(n=>n.getAttribute('aria-label')==='내 프로필'||n.querySelector('#ps-nickname,#ps-local-start,#ps-google-login'));setHost(target||null);};
  const un=store.subscribe(()=>{const value=store.playerAppearance();setSaved(value);scan();});const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});window.addEventListener('resize',scan);scan();return()=>{un();observer.disconnect();resize.disconnect();window.removeEventListener('resize',scan);};
 },[]);
 useEffect(()=>{if(host){setDraft(saved);setMessage('');}else setDraft(null);},[host]);
 useEffect(()=>{if(host&&saved)setDraft(previous=>previous||saved);},[host,saved]);
 if(!host||!draft)return null;
 return createPortal(<section className="cq-profile-colors" aria-label="배틀 플레이어 색상"><h3>플레이어 색상</h3><p>서버에 저장되는 내 표시 색상입니다.</p><div className="cq-color-preview" style={{background:draft.fill,borderColor:draft.border}} aria-label="플레이어 색상 미리보기"/><div className="cq-color-pickers">{[['fill','내부 색상'],['border','테두리 색상']].map(([key,label])=><label key={key}>{label}<input type="color" aria-label={label} value={draft[key]} onFocus={()=>setPart(key)} onChange={e=>{setPart(key);setDraft({...draft,[key]:e.target.value});}}/></label>)}</div><div className="cq-color-tabs"><button type="button" aria-pressed={part==='fill'} onClick={()=>setPart('fill')}>내부 색상 추천</button><button type="button" aria-pressed={part==='border'} onClick={()=>setPart('border')}>테두리 색상 추천</button></div><div className="cq-color-chips" aria-label="추천 색상 24개">{PLAYER_COLORS.map(color=><button type="button" key={color} aria-label={`${color} 선택`} aria-pressed={draft[part].toUpperCase()===color} style={{background:color}} onClick={()=>setDraft({...draft,[part]:color})}/>)}</div><button type="button" className="cq-save-colors" disabled={busy} onClick={async()=>{setBusy(true);try{await store.saveAppearance(draft);setMessage('플레이어 색상을 저장했어요.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}}>플레이어 색상 저장</button><p role="status">{message}</p></section>,host);
}
