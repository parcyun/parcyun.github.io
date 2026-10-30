export const isReservedNickname = nickname => /dexter|parcyun/i.test(String(nickname || ''));
// School names are published only with a new voluntary record submission.
export function rankingAffiliation(player) {
  if (String(player.nickname || '').trim().toLowerCase() === 'dexter') return '개발자';
  if (typeof player.school === 'string' && player.school.trim()) return player.school.trim();
  const moods = ['별빛', '구름 위', '용감한', '호기심 많은', '무지개', '달빛', '반짝이는', '숲속'];
  const roles = ['탐험가', '모험가', '낱말 수집가', '맞춤법 기사', '문장 마법사', '보물 사냥꾼'];
  let seed = 2166136261;
  for (const char of String(player.id || player.nickname || 'player')) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return `${moods[seed % moods.length]} ${roles[Math.floor(seed / moods.length) % roles.length]}`;
}

export function compareRankingEfficiency(a,b) {
  const duration=r=>{
    if(Number.isFinite(r.elapsedMs)&&r.elapsedMs>0)return r.elapsedMs;
    const legacy=String(r.time||'').split(':').reduce((seconds,n)=>seconds*60+Number(n),0)*1000;
    return legacy>0?legacy:86400000;
  };
  const left=duration(a),right=duration(b);
  return b.score*left-a.score*right || b.score-a.score || left-right;
}

export function createLeaderboard(context, game='spell') {
  const collectionName=game==='geo'?'geoBoards':'spellBoards';
  const boardId = ({lang,diff,mode}) => {
    if(game==='geo'){
      const countryMode=['country','capital-easy','capital-hard','flag'].includes(mode);
      if(!countryMode&&!['nature','landmark'].includes(mode))throw new Error('Invalid board');
      if(countryMode&&diff!==undefined&&diff!=='legacy'){
        if(!['easy','med','hard'].includes(diff))throw new Error('Invalid difficulty');
        return `${mode}_${diff}`;
      }
      return mode;
    }
    if (!['ko','en'].includes(lang)||!['easy','med','hard','mix'].includes(diff)||!['practice','timer','custom'].includes(mode)) throw new Error('Invalid board');
    return `${lang}_${diff}_${mode}`;
  };
  return {
    async load(filters, cursor) {
      const {s,user,entryId}=await context(); const d=s.dbApi;
      const collection=d.collection(s.db,collectionName,boardId(filters),'players');
      // Simplification: derive ordering from existing records without rewriting scores.
      // Add an indexed efficiency field when a board exceeds 1000 players.
      const snapshot=await d.getDocsFromServer(d.query(collection));
      const order=(a,b)=>compareRankingEfficiency(a,b)||a.id.localeCompare(b.id);
      const rows=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).sort(order);
      const first=cursor?rows.findIndex(row=>order(row,cursor)>0):0;
      const start=first<0?rows.length:first,page=rows.slice(start,start+50);
      const own=user?rows.find(row=>row.id===(entryId||user.uid)):null;
      const mine=own?{...own,rank:1+rows.findIndex(row=>compareRankingEfficiency(row,own)===0)}:null;
      return {rows:page,cursor:page.at(-1),more:start+page.length<rows.length,mine,signedIn:!!user};
    },
    async submit(record) {
      const {s,user,profile,nickname,entryId}=await context();if(!user)throw new Error('프로필을 먼저 만들어 주세요. Google 로그인 없이 브라우저 프로필로도 제출할 수 있어요.');
      if(isReservedNickname(profile.nickname||nickname))throw new Error('DEXTER와 parcyun이 포함된 별명은 사용할 수 없어요. 내 프로필에서 별명을 변경해 주세요.');
      const d=s.dbApi;const ref=d.doc(s.db,collectionName,boardId(record),'players',entryId||user.uid);
      const next={nickname:profile.nickname||nickname,school:typeof profile.school==='string'?profile.school.trim():'',score:record.score,elapsedMs:Math.round(record.elapsedMs),playedAt:d.Timestamp.fromMillis(record.playedAt),updatedAt:d.serverTimestamp()};
      await d.runTransaction(s.db,async transaction=>{
        const previous=await transaction.get(ref);
        if(previous.exists()){const p=previous.data();if(p.score>next.score||(p.score===next.score&&p.elapsedMs<=next.elapsedMs))return}
        transaction.set(ref,next);
      });
    }
  };
}
