import { createMusicRotation } from "../music-rotation.js";
const preferenceKey='parcyunSpellGame_sound_v2';
let enabled=true;try{enabled=JSON.parse(localStorage.getItem(preferenceKey)??'true')!==false;}catch{}
const nextTrack=createMusicRotation(['exit-the-premises','edm-detection-mode','raving-energy','raving-energy-faster','cipher']);
const music=new Audio('/spell-drill/audio/'+nextTrack()+'.mp3');
music.id='spell-background-music';music.loop=false;music.preload='none';music.volume=.24;music.setAttribute('aria-hidden','true');document.body.append(music);
let soloPlaying=document.querySelector('#play')?.classList.contains('active')||false,battlePlaying=false,primed=false,priming=null;
music.addEventListener('ended',()=>{music.src='/spell-drill/audio/'+nextTrack()+'.mp3';primed=true;sync();});
const toggles=new Set();
function paint(){for(const button of toggles){button.classList.toggle('on',enabled);button.setAttribute('aria-pressed',String(enabled));button.setAttribute('aria-label',enabled?'소리 끄기':'소리 켜기');const label=button.querySelector('[data-spell-sound-label],#sound-label');if(label)label.textContent=enabled?'SOUND ON':'SOUND OFF';}}
function active(){return enabled&&!document.hidden;}
function sync(){if(active()&&primed){music.muted=false;music.play().catch(()=>{});}else if(!priming)music.pause();}
function prime(){if(!enabled||primed||priming)return;music.muted=true;priming=music.play().then(()=>{primed=true;priming=null;music.muted=false;sync();}).catch(()=>{priming=null;music.muted=false;});}
function setEnabled(value){const changed=enabled!==Boolean(value);enabled=Boolean(value);try{localStorage.setItem(preferenceKey,JSON.stringify(enabled));}catch{}paint();if(enabled)prime();sync();if(changed)window.dispatchEvent(new CustomEvent('ps-spell-sound-change',{detail:{enabled}}));}
function bindToggle(button,listen=true){if(!button)return;toggles.add(button);if(listen)button.addEventListener('click',()=>setEnabled(!enabled));paint();}
export const spellAudio={setEnabled,bindToggle,setSoloPlaying(value){soloPlaying=Boolean(value);if(soloPlaying)prime();sync();},setBattlePlaying(value){battlePlaying=Boolean(value);sync();}};
window.psSpellAudio=spellAudio;
bindToggle(document.querySelector('#sound-toggle'),false);bindToggle(document.querySelector('#solo-sound-toggle'));
document.addEventListener('pointerdown',prime,{capture:true});document.addEventListener('keydown',prime,{capture:true});
document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',()=>music.pause());
window.addEventListener('storage',event=>{if(event.key===preferenceKey){let value=true;try{value=JSON.parse(event.newValue??'true')!==false;}catch{}setEnabled(value);}});
