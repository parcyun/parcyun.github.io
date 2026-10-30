import {geoContains} from 'd3-geo';
import {center,neighbors} from './conquestEngine.js';
// Percentages are game balance; geographic sources determine only the environment.
export const ENVIRONMENTS={
 plain:{name:'평야',attack:0,defense:0,reason:'평탄한 지형이라 이동과 보급이 수월해'},
 forest:{name:'숲',attack:20,defense:10,reason:'나무가 이동을 막고 방어할 엄폐물을 제공해'},
 taiga:{name:'침엽수림',attack:30,defense:15,reason:'울창한 숲과 긴 추위가 진입을 어렵게 해'},
 mountain:{name:'산지',attack:50,defense:25,reason:'가파른 지형과 좁은 통로가 진입을 어렵게 해'},
 plateau:{name:'고원',attack:25,defense:15,reason:'높은 고도와 고원 가장자리의 경사가 진입을 어렵게 해'},
 desert:{name:'사막',attack:40,defense:20,reason:'물 부족과 큰 일교차가 보급을 어렵게 해'},
 grassland:{name:'초원',attack:10,defense:5,reason:'넓게 드러난 지형이 접근을 쉽게 관찰하게 해'},
 jungle:{name:'밀림',attack:45,defense:25,reason:'빽빽한 식생과 습한 환경이 이동을 어렵게 해'},
 tundra:{name:'툰드라',attack:40,defense:20,reason:'긴 추위와 계절성 진흙 지반이 이동을 어렵게 해'},
 frozen:{name:'동토·빙설',attack:60,defense:30,reason:'심한 추위와 얼음이 이동과 보급을 어렵게 해'},
 wetland:{name:'습지',attack:35,defense:20,reason:'물에 잠기거나 무른 땅이 이동을 어렵게 해'},
 coast:{name:'연안',attack:15,defense:10,reason:'육지와 맞닿아 상륙 경로가 제한돼'},
 nearSea:{name:'가까운 바다',attack:25,defense:10,reason:'육지에서 2~3칸 떨어져 해상 보급이 필요해'},
 openSea:{name:'먼 바다',attack:40,defense:15,reason:'육지에서 멀어 긴 해상 보급이 필요해'},
 unknown:{name:'육지 · 환경 자료 없음',attack:0,defense:0,reason:'환경 자료가 없어 기본 규칙을 적용해'},
};
export function environmentExplanation(environment,defending=false){const pct=defending?environment.defense:environment.attack;return `${environment.reason} ${defending?'수비':'공격·개척'} 목표 ${pct?`${defending?'−':'+'}${pct}%`:'가감 없음 (0%)'}${pct?'가 적용돼요.':'예요.'}`;}
export function createEnvironment({isLand,biomeAt,climateAt,landforms}){
 const cache=new Map();
 return id=>{
  if(cache.has(id))return cache.get(id);
  let kind;
  if(!isLand(id)){
   let frontier=[id],seen=new Set(frontier),distance=4;
   for(let step=1;step<=3;step++){const next=[...new Set(frontier.flatMap(neighbors))].filter(n=>!seen.has(n));if(next.some(isLand)){distance=step;break;}next.forEach(n=>seen.add(n));frontier=next;}
   kind=distance===1?'coast':distance<=3?'nearSea':'openSea';
  }else{
   const ll=center(id),biome=biomeAt(...ll),climate=climateAt(...ll);
   const physical=landforms.features.find(f=>['mountains','plateaus','plains','deserts'].includes(f.properties.category)&&geoContains(f,ll))?.properties.category;
   if(physical==='mountains'||climate==='highland'||biome===10)kind='mountain';
   else if(biome===15)kind='frozen';
   else if(biome===11)kind='tundra';
   else if(physical==='plateaus')kind='plateau';
   else if(physical==='deserts'||biome===13)kind='desert';
   else if(biome===1)kind='jungle';
   else if([9,14].includes(biome))kind='wetland';
   else if(physical==='plains')kind='plain';
   else if([7,8].includes(biome))kind='grassland';
   else if(biome===6)kind='taiga';
   else if([2,3,4,5,12].includes(biome))kind='forest';
   else if(climate==='polar')kind='frozen';
   else kind='unknown';
  }
  const value={kind,...ENVIRONMENTS[kind]};cache.set(id,value);return value;
 };
}
