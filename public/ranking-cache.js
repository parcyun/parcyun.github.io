// Only the already-public leaderboard is cached. Never store profile/auth responses.
const PREFIX='ps.public-ranking.v1:';
export const RANKING_CACHE_MS=60_000;
export function createRankingCache({storage=()=>globalThis.localStorage,now=()=>Date.now()}={}){
  const memory=new Map(),pending=new Map(),versions=new Map();
  const valid=value=>value&&Array.isArray(value.rows)&&Number.isFinite(value.at)&&now()-value.at>=0&&now()-value.at<RANKING_CACHE_MS;
  const read=key=>{let value=memory.get(key);if(valid(value))return value.rows;
    try{value=JSON.parse(storage()?.getItem(PREFIX+key)||'null');if(valid(value)){for(const row of value.rows)if(Number.isFinite(row.playedAtMs)){const at=row.playedAtMs;row.playedAt={toDate:()=>new Date(at)};}memory.set(key,value);return value.rows;}storage()?.removeItem(PREFIX+key);}catch{}return null;};
  function save(key,rows){const value={at:now(),rows};memory.delete(key);memory.set(key,value);if(memory.size>8)memory.delete(memory.keys().next().value);
    try{const data=JSON.stringify({at:value.at,rows:rows.map(r=>({id:r.id,nickname:r.nickname,school:r.school,score:r.score,elapsedMs:r.elapsedMs,maxCombo:r.maxCombo,time:r.time,playedAtMs:r.playedAt?.toDate?.().getTime()??r.playedAtMs}))});
      const s=storage();const keys=Array.from({length:s?.length||0},(_,i)=>s.key(i)).filter(k=>k?.startsWith(PREFIX)&&k!==PREFIX+key);
      for(const old of keys){const cached=JSON.parse(s.getItem(old)||'null');if(!valid(cached))s.removeItem(old);}
      const remaining=keys.filter(k=>s.getItem(k));while(remaining.length>=8)s.removeItem(remaining.shift());
      if(data.length<=500_000)s?.setItem(PREFIX+key,data);
    }catch{}return rows;}
  return {
    async get(key,load){const cached=read(key);if(cached)return cached;if(pending.has(key))return pending.get(key);
      const version=versions.get(key)||0;const work=Promise.resolve().then(load).then(rows=>(versions.get(key)||0)===version?save(key,rows):rows).finally(()=>{if(pending.get(key)===work)pending.delete(key);});pending.set(key,work);return work;},
    invalidate(key){versions.set(key,(versions.get(key)||0)+1);memory.delete(key);pending.delete(key);try{storage()?.removeItem(PREFIX+key);}catch{}}
  };
}
