export const RECORD_KEY='geoweb.game-records.v1';
export function readRecords(storage){
 try{
  const data=JSON.parse(storage.getItem(RECORD_KEY)||'{}');
  return Object.fromEntries(Object.entries(data).filter(([,r])=>r&&Number.isFinite(r.score)&&r.score>0&&Number.isFinite(r.seconds)&&r.seconds>=0));
 }catch{return {};}
}
export function updateRecord(records,mode,score,seconds){
 const previous=records[mode];
 if(score<=0||!Number.isFinite(score)||!Number.isFinite(seconds))return records;
 seconds=Math.max(0,Math.round(seconds));
 if(previous&&(previous.score>score||(previous.score===score&&previous.seconds<=seconds)))return records;
 return {...records,[mode]:{score,seconds}};
}
export function formatTime(seconds){return `${Math.floor(seconds/60)}분 ${String(seconds%60).padStart(2,'0')}초`;}
