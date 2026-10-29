// Editorial familiarity bands for Korean classroom play, not a measured popularity ranking.
const familiar = new Set('KR JP CN US GB FR DE IT ES CA AU NZ RU IN BR MX EG GR TR TH VN ID PH SG MY SA AE CH NL PT AR CL PE ZA SE NO FI DK AT BE IE IL KP'.split(' '));
const lessFamiliar = new Set('PL CZ HU RO BG UA HR RS SK SI IS EE LV LT LU MT CY AL BA GE AM AZ KZ UZ MN PK BD LK NP BT MV KH LA MM BN IR IQ JO LB QA KW OM BH MA TN DZ KE TZ ET GH NG CM SN CO EC UY PY BO VE CR PA CU JM DO GT'.split(' '));
export const COUNTRY_GAME_MODES = ['country','capital-easy','capital-hard','flag'];
export const DIFFICULTIES = [
  {id:'easy',label:'초급',description:'익숙한 국가가 더 자주 나와요.'},
  {id:'med',label:'중급',description:'조금 덜 알려진 국가가 더 자주 나와요.'},
  {id:'hard',label:'고급',description:'생소한 국가가 더 자주 나와요.'},
];
export const hasCountryDifficulty = mode => COUNTRY_GAME_MODES.includes(mode);
export const difficultyLabel = diff => DIFFICULTIES.find(item=>item.id===diff)?.label || '이전 기록';
export const countryFamiliarity = iso2 => familiar.has(iso2)?'easy':lessFamiliar.has(iso2)?'med':'hard';
export const gameRecordKey = (mode,diff) => hasCountryDifficulty(mode)?`${mode}_${diff}`:mode;
const weights = {easy:[.8,.17,.03],med:[.15,.7,.15],hard:[.05,.15,.8]};

export function difficultyDeck(pool,difficulty,previousId,random=Math.random) {
  const distribution=weights[difficulty];
  if(!distribution)throw new Error('Invalid difficulty');
  const groups=DIFFICULTIES.map(({id})=>pool.filter(question=>countryFamiliarity(question.country.iso2)===id));
  const deck=[];
  while(deck.length<Math.min(12,pool.length)) {
    const available=groups.map(group=>group.filter(q=>deck.length>0||pool.length===1||q.id!==previousId));
    const total=available.reduce((sum,group,i)=>sum+(group.length?distribution[i]:0),0);
    if(!total)break;
    let ticket=random()*total,groupIndex=0;
    for(;groupIndex<available.length-1;groupIndex++){ticket-=available[groupIndex].length?distribution[groupIndex]:0;if(ticket<0)break;}
    const group=available[groupIndex],question=group[Math.floor(random()*group.length)];
    deck.push(question);groups[groupIndex].splice(groups[groupIndex].indexOf(question),1);
  }
  return deck;
}
