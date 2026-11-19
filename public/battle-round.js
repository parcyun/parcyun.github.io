import './spell-drill/scoring.js';
import './spell-drill/context-hints.js';
import {scoreAnswer} from './spell-drill/geo-scoring.js';

export const roundFields=['index','score','roundScore','earnedScore','combo','maxCombo','passesRemaining','passCount','wrongCount','hintUsed','questionStartedAt','lastAnswer','focusPausedAt','focusWarned'];
const normalize=(value,game)=>game==='spell'?String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim():String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
export function tickRound(pack,at){
 const s=pack.state;
 if(at>=pack.deadline)return;
 if(pack.settings.level==='expert'&&s.focusPausedAt==null&&s.questionStartedAt!=null){
  while(at-s.questionStartedAt>=5000){s.index++;s.combo=0;s.hintUsed=false;s.questionStartedAt+=5000;s.lastAnswer=null;}
 }
 if(s.questionStartedAt==null)s.questionStartedAt=at;
}
export function applyRoundEvent(pack,event){
 const {at,type,index}=event,s=pack.state;
 if(!Number.isFinite(at)||at<pack.issuedAt||(at>=pack.deadline&&type!=='focus'))throw Error('라운드 시간이 종료됐어요.');
 tickRound(pack,at);
 if(type==='focus'){
  if(event.paused){s.focusWarned=true;s.focusPausedAt??=at;}
  else if(s.focusPausedAt!=null){s.questionStartedAt+=at-s.focusPausedAt;s.focusPausedAt=null;}
  return {};
 }
 if(s.focusPausedAt!=null)throw Error('게임을 계속한 뒤 답을 제출해 주세요.');
 if(index!==s.index)throw Error('이미 처리된 문제예요.');
 const q=pack.questions[s.index%pack.questions.length],scoring=globalThis.SpellScoring;
 if(type==='hint'){s.hintUsed=true;return {};}
 if(type==='pass'){
  const penalty=scoring.takePass(s);if(penalty===null)throw Error('사용할 수 있는 패스가 없어요.');
  s.locked=false;s.roundScore-=penalty;s.combo=0;s.index++;s.hintUsed=false;s.questionStartedAt=at;s.lastAnswer=null;return {passed:true,penalty};
 }
 if(type!=='answer'||typeof event.answer!=='string'||event.answer.length>500)throw Error('답안을 확인해 주세요.');
 const answers=pack.game==='spell'?[q.correct]:q.answers;
 if(!normalize(event.answer,pack.game)||!answers.some(answer=>normalize(answer,pack.game)===normalize(event.answer,pack.game))){
  s.combo=0;const penalty=scoring.takeWrongAnswer(s);s.roundScore-=penalty;return {correct:false,penalty};
 }
 scoring.resetWrongAnswerStreak(s);s.combo++;s.maxCombo=Math.max(s.maxCombo||0,s.combo);
 const elapsedMs=Math.max(0,at-s.questionStartedAt);
 const speed=pack.game==='spell'?scoring.speedForAnswer(q.correct,elapsedMs):{};
 const gain=pack.game==='spell'?scoring.calculateCorrectGain({baseScore:scoring.baseScoreForDifficulty(q.difficulty),speedBonus:speed.speedBonus,comboCount:s.combo,hintUsed:s.hintUsed}):scoreAnswer(event.answer,elapsedMs/1000,pack.settings.level==='expert'?'hard':pack.settings.level||'easy',s.combo,s.hintUsed);
 s.score+=gain.total;s.roundScore+=gain.total;scoring.addEarnedScore(s,gain.total);
 s.lastAnswer={...speed,...gain,elapsedMs,combo:s.combo,hintUsed:!!s.hintUsed};s.index++;s.hintUsed=false;s.questionStartedAt=at;
 return {correct:true,points:gain.total,details:s.lastAnswer};
}
export function questionFor(pack,index=pack.state.index){
 const q=pack.questions[index%pack.questions.length],s=pack.state;
 const common={index,startedAt:s.questionStartedAt,hintUsed:!!s.hintUsed};
 if(pack.game==='spell')return {...common,wrong:q.wrong,difficulty:q.difficulty,context:globalThis.SpellContextHints.contextFor(q),hint:s.hintUsed?globalThis.SpellContextHints.hintFor(q):''};
 return {...common,id:q.id,mode:q.mode,prompt:q.prompt,image:q.image,coordinates:q.coordinates,cue:q.mode==='capital-easy'?q.country:'',difficulty:pack.settings.difficulty,hint:s.hintUsed?String(q.answers[0]).slice(0,1)+'…':''};
}
