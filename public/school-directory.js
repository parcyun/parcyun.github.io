import { normalizeSchool } from './browser-profile.js?v=20261029-1';
export const SCHOOL_REGIONS=[['','전국'],['B10','서울'],['C10','부산'],['D10','대구'],['E10','인천'],['F10','광주'],['G10','대전'],['H10','울산'],['I10','세종'],['J10','경기'],['K10','강원'],['M10','충북'],['N10','충남'],['P10','전북'],['Q10','전남'],['R10','경북'],['S10','경남'],['T10','제주']];
let directoryPromise,marksPromise;
const load=(url)=>fetch(url).then(r=>{if(!r.ok)throw new Error('학교 정보를 불러오지 못했어요. 다시 시도해 주세요.');return r.json();});
export async function schoolMark(school){if(!school?.id)return '';try{marksPromise??=load('/school-marks/manifest.json');const item=(await marksPromise).schools[school.id];return item?.status==='ready'?'/school-marks/'+item.file:'';}catch{marksPromise=null;return '';}}
export async function searchSchools(name,region='',signal){
 const query=String(name).trim().replace(/\s/g,'').toLowerCase();if(query.length<2)return {rows:[],total:0};
 directoryPromise??=load('/schools.json').catch(error=>{directoryPromise=null;throw error;});
 const schools=await directoryPromise;signal?.throwIfAborted();
 const matches=schools.filter(s=>(!region||s.id.startsWith(region+':'))&&s.name.replace(/\s/g,'').toLowerCase().includes(query));
 return {rows:matches.slice(0,100).map(normalizeSchool).filter(Boolean),total:matches.length};
}
