import { COUNTRIES, COUNTRY_ALIASES } from './globeCountries.js';
import { geoCentroid } from 'd3-geo';
import additionalLandmarks from './geoGameLandmarksExpanded.json' with { type: 'json' };
import naturePhotos from './geoGameNaturePhotosExpanded.json' with { type: 'json' };
import answerAliases from './geoGameAliases.json' with { type: 'json' };
import countryAliases from './geoCountryAliases.json' with { type: 'json' };
import '../../public/spell-drill/scoring.js';

const aliasesFor=name=>Object.entries(answerAliases).filter(([key])=>normalizeAnswer(key)===normalizeAnswer(name)).flatMap(([,values])=>values);

export const scoring = globalThis.SpellScoring;
export const GAME_MODES = [
  { id:'country', title:'나라 이름 맞추기', tier:'easy', prompt:'', label:'나라 이름' },
  { id:'capital-easy', title:'수도 이름 · 쉬움', tier:'easy', prompt:'이 나라의 수도는?', label:'수도 이름' },
  { id:'capital-hard', title:'수도 이름 · 어려움', tier:'hard', prompt:'지도만 보고 수도를 맞혀 보세요', label:'수도 이름' },
  { id:'flag', title:'국기 맞추기', tier:'easy', prompt:'어느 나라의 국기일까요?', label:'나라 이름' },
  { id:'nature', title:'자연환경 이름 맞추기', tier:'med', prompt:'색칠된 자연환경의 이름은?', label:'강·산맥·고원·평원·사막 이름' },
  { id:'landmark', title:'인문환경 이름 맞추기', tier:'hard', prompt:'사진 속 랜드마크의 이름은?', label:'랜드마크 이름' },
];

// Public Wikipedia/Wikidata names and Commons photo licenses researched 2026-11-13; credits follow the active photograph.
export const LANDMARKS=additionalLandmarks.filter(q=>COUNTRIES.some(c=>c.iso2===q.iso2)).map(q=>({...q,id:`landmark-${q.iso2}-${q.name}`,country:COUNTRIES.find(c=>c.iso2===q.iso2),answers:[q.name,...q.aliases,...aliasesFor(q.name)]}));

export function normalizeAnswer(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
}
export function matchesAnswer(input, question) {
  const normalized=normalizeAnswer(input);
  return !!normalized && question.answers.some(answer=>normalizeAnswer(answer)===normalized);
}
const CAPITAL_ALIASES = { BO:['La Paz'], LK:['Colombo'], PS:['East Jerusalem'], SZ:['Lobamba'], YE:['Aden'], US:['워싱턴','워싱턴 디시','Washington DC','Washington'], KR:['서울','Seoul'], JP:['도쿄','동경','Tokyo'], CN:['베이징','북경','Beijing'], IN:['뉴델리','New Delhi'], KZ:['아스타나','Astana'], TR:['앙카라','Ankara'] };

export function buildGamePools(world, landforms) {
  const boundaries=new Map(world.features.map(f=>[f.properties.n,f]));
  const countries=COUNTRIES.filter(c=>boundaries.has(c.boundaryName)).map(country=>({
    id:country.iso2, country, name:country.name.ko,
    coordinates:geoCentroid(boundaries.get(country.boundaryName)),
    answers:[country.name.ko,country.name.en,country.officialName.ko,country.officialName.en,country.iso2,country.iso3,...(COUNTRY_ALIASES[country.iso2]||[]),...(countryAliases[country.iso2]||[])],
  }));
  const capitals=countries.filter(q=>q.country.capital.ko && q.country.capital.en).map(q=>({...q,
    name:q.country.capital.ko,answers:[...new Set([q.country.capital.ko,q.country.capital.en,...q.country.capital.ko.split(' · '),...q.country.capital.en.split(' · '),...(CAPITAL_ALIASES[q.id]||[])] .flatMap(name=>['CN','KP','KR','KW'].includes(q.id)&&/시$/.test(name)?[name,name.replace(/(?:특별시|광역시|시)$/,'')]:[name]))],
  }));
  const groups=new Map();
  for(const feature of landforms.features){
    const {nameKo,nameEn,category}=feature.properties;
    if(!nameKo)continue;
    const id=`${category}:${nameKo}`;
    if(!groups.has(id))groups.set(id,{id,name:nameKo,category,difficulty:feature.properties.difficulty||'easy',answers:[nameKo,nameEn,...aliasesFor(nameKo)],features:[]});
    groups.get(id).features.push(feature);
  }
  const nature=[...groups.values()].map(q=>({...q,...naturePhotos[q.id],name:naturePhotos[q.id]?.displayName||q.name,answers:[...new Set([...q.answers,...(naturePhotos[q.id]?.aliases||[]),...(naturePhotos[q.id]?.aliases||[]).flatMap(aliasesFor)])],coordinates:geoCentroid({type:'FeatureCollection',features:q.features})}));
  return {country:countries,'capital-easy':capitals,'capital-hard':capitals,
    flag:COUNTRIES.map(country=>({id:country.iso2,country,name:country.name.ko,answers:[country.name.ko,country.name.en,country.officialName.ko,country.officialName.en,country.iso2,country.iso3,...(COUNTRY_ALIASES[country.iso2]||[]),...(countryAliases[country.iso2]||[])]})),
    nature,landmark:LANDMARKS.map(q=>({...q,coordinates:boundaries.has(q.country.boundaryName)?geoCentroid(boundaries.get(q.country.boundaryName)):q.country.coordinates})),
  };
}

export function shuffledDeck(pool, previousId, random=Math.random,previousCountry) {
  const remaining=[...pool];
  for(let i=remaining.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[remaining[i],remaining[j]]=[remaining[j],remaining[i]];}
  const deck=[];let lastCountry=previousCountry;
  while(remaining.length){
    const counts=new Map();for(const q of remaining)counts.set(q.country?.iso2,(counts.get(q.country?.iso2)||0)+1);
    const eligible=remaining.map((q,i)=>({q,i})).filter(({q})=>(!q.country||q.country.iso2!==lastCountry)&&(deck.length||q.id!==previousId));
    const choices=eligible.length?eligible:remaining.map((q,i)=>({q,i})).filter(({q})=>deck.length||q.id!==previousId);
    const selected=(choices.length?choices:remaining.map((q,i)=>({q,i}))).sort((a,b)=>(counts.get(b.q.country?.iso2)||0)-(counts.get(a.q.country?.iso2)||0))[0];
    deck.push(selected.q);remaining.splice(selected.i,1);lastCountry=selected.q.country?.iso2;
  }
  return deck;
}
export function contentDeck(pool,difficulty,previous,random=Math.random){return shuffledDeck(pool.filter(q=>q.difficulty===difficulty),previous?.id,random,previous?.country?.iso2);}

export { scoreAnswer } from '../../public/spell-drill/geo-scoring.js';
