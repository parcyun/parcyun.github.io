import { COUNTRIES, COUNTRY_ALIASES } from './globeCountries.js';
import { geoCentroid } from 'd3-geo';
import additionalLandmarks from './geoGameLandmarks.json' with { type: 'json' };
import naturePhotos from './geoGameNaturePhotos.json' with { type: 'json' };
import '../../public/spell-drill/scoring.js';

export const scoring = globalThis.SpellScoring;
export const GAME_MODES = [
  { id:'country', title:'나라 이름 맞추기', tier:'easy', prompt:'', label:'나라 이름' },
  { id:'capital-easy', title:'수도 이름 · 쉬움', tier:'easy', prompt:'이 나라의 수도는?', label:'수도 이름' },
  { id:'capital-hard', title:'수도 이름 · 어려움', tier:'hard', prompt:'지도만 보고 수도를 맞혀 보세요', label:'수도 이름' },
  { id:'flag', title:'국기 맞추기', tier:'easy', prompt:'어느 나라의 국기일까요?', label:'나라 이름' },
  { id:'nature', title:'자연환경 이름 맞추기', tier:'med', prompt:'색칠된 자연환경의 이름은?', label:'강·산맥·고원·평원·사막 이름' },
  { id:'landmark', title:'인문환경 이름 맞추기', tier:'hard', prompt:'사진 속 랜드마크의 이름은?', label:'랜드마크 이름' },
];

// Wikimedia Commons imageinfo metadata checked 2026-10-16. Credits remain visible during play.
export const LANDMARKS = [
  ['FR','에펠탑',['Eiffel Tower'],'f/ff/Eiffel_Tower_from_Champ-de-Mars_in_2014.jpg','Emily Vanderstraaten','3.0'],
  ['IN','타지마할',['Taj Mahal'],'1/1f/Taj_Mahal_N-UP-A28-a.jpg','Asitjain','3.0'],
  ['IT','콜로세움',['Colosseum','Coliseum'],'b/b8/2016_Rome_-_Colosseum_01.jpg','Jordiferrer','4.0'],
  ['CN','만리장성',['Great Wall of China','Great Wall'],'f/fa/Great_Wall_of_China_July_2006.JPG','Velatrix','CC0'],
  ['PE','마추픽추',['Machu Picchu'],'e/eb/Machu_Picchu%2C_Peru.jpg','Pedro Szekely','2.0'],
  ['EG','기자 피라미드',['피라미드','기자의 피라미드','Giza Pyramids','Pyramids'],'a/af/All_Gizah_Pyramids.jpg','Ricardo Liberato','2.0'],
  ['AU','시드니 오페라 하우스',['오페라 하우스','Sydney Opera House'],'4/40/Sydney_Opera_House_Sails.jpg','Roybb95~commonswiki','3.0'],
  ['US','자유의 여신상',['Statue of Liberty'],'a/a1/Statue_of_Liberty_7.jpg','Elcobbola','Public domain'],
].map(([iso2,name,aliases,path,author,license])=>({
  id:`landmark-${iso2}`, country:COUNTRIES.find(c=>c.iso2===iso2), name, answers:[name,...aliases],
  image:`https://upload.wikimedia.org/wikipedia/commons/thumb/${path}/960px-${path.split('/').at(-1)}`,
  source:`https://commons.wikimedia.org/wiki/File:${path.split('/').at(-1)}`, author,
  license:license.includes('.')?`CC BY-SA ${license}`:license,
  licenseUrl:license.includes('.')?`https://creativecommons.org/licenses/by-sa/${license}/`:license==='CC0'?'https://creativecommons.org/publicdomain/zero/1.0/':'https://creativecommons.org/publicdomain/mark/1.0/',
})).concat(additionalLandmarks.map(q=>({...q,id:`landmark-${q.iso2}-${q.name}`,country:COUNTRIES.find(c=>c.iso2===q.iso2),answers:[q.name,...q.aliases]})));

export function normalizeAnswer(value) {
  return String(value).normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
}
export function matchesAnswer(input, question) {
  const normalized=normalizeAnswer(input);
  return !!normalized && question.answers.some(answer=>normalizeAnswer(answer)===normalized);
}
const CAPITAL_ALIASES = { US:['워싱턴','워싱턴 디시','Washington DC','Washington'], KR:['서울','Seoul'], JP:['도쿄','동경','Tokyo'], CN:['베이징','북경','Beijing'], IN:['뉴델리','New Delhi'], KZ:['아스타나','Astana'], TR:['앙카라','Ankara'] };

export function buildGamePools(world, landforms) {
  const boundaries=new Map(world.features.map(f=>[f.properties.n,f]));
  const countries=COUNTRIES.filter(c=>boundaries.has(c.boundaryName)).map(country=>({
    id:country.iso2, country, name:country.name.ko,
    coordinates:geoCentroid(boundaries.get(country.boundaryName)),
    answers:[country.name.ko,country.name.en,country.officialName.ko,country.officialName.en,country.iso2,country.iso3,...(COUNTRY_ALIASES[country.iso2]||[])],
  }));
  const capitals=countries.filter(q=>q.country.capital.ko && q.country.capital.en).map(q=>({...q,
    name:q.country.capital.ko,answers:[q.country.capital.ko,q.country.capital.en,...(CAPITAL_ALIASES[q.id]||[])],
  }));
  const groups=new Map();
  for(const feature of landforms.features){
    const {nameKo,nameEn,category}=feature.properties;
    if(!nameKo)continue;
    const id=`${category}:${nameKo}`;
    if(!groups.has(id))groups.set(id,{id,name:nameKo,category,answers:[nameKo,nameEn],features:[]});
    groups.get(id).features.push(feature);
  }
  const nature=[...groups.values()].map(q=>({...q,...naturePhotos[q.id],coordinates:geoCentroid({type:'FeatureCollection',features:q.features})}));
  return {country:countries,'capital-easy':capitals,'capital-hard':capitals,
    flag:COUNTRIES.map(country=>({id:country.iso2,country,name:country.name.ko,answers:[country.name.ko,country.name.en,country.officialName.ko,country.officialName.en,country.iso2,country.iso3,...(COUNTRY_ALIASES[country.iso2]||[])]})),
    nature,landmark:LANDMARKS.map(q=>({...q,coordinates:boundaries.has(q.country.boundaryName)?geoCentroid(boundaries.get(q.country.boundaryName)):q.country.coordinates})),
  };
}

export function shuffledDeck(pool, previousId, random=Math.random) {
  const deck=[...pool];
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  if(deck.length>1 && deck[0].id===previousId)[deck[0],deck[1]]=[deck[1],deck[0]];
  return deck;
}

export function scoreAnswer(answer, elapsedSeconds, tier, comboCount) {
  let strokes=0;for(const ch of answer)strokes+=/[가-힣]/.test(ch)?2.5:1;
  const ratio=elapsedSeconds/(strokes/6+1.5);
  const speedBonus=ratio<=.9?100:ratio<=1.15?50:ratio<=1.5?20:0;
  return {...scoring.calculateCorrectGain({baseScore:scoring.baseScoreForDifficulty(tier),speedBonus,comboCount}),
    speedTag:speedBonus===100?'LIGHTNING':speedBonus===50?'FAST':speedBonus===20?'QUICK':''};
}
