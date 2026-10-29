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
      const clauses=[d.orderBy('score','desc'),d.orderBy('elapsedMs','asc'),d.limit(50)];
      if(cursor)clauses.push(d.startAfter(cursor));
      const snapshot=await d.getDocsFromServer(d.query(collection,...clauses));
      let mine=null;
      if(user){
        const own=await d.getDocFromServer(d.doc(collection,entryId||user.uid));
        if(own.exists()){
          const value=own.data();
          const [higher,faster]=await Promise.all([
            d.getCountFromServer(d.query(collection,d.where('score','>',value.score))),
            d.getCountFromServer(d.query(collection,d.where('score','==',value.score),d.where('elapsedMs','<',value.elapsedMs)))
          ]);
          mine={id:entryId||user.uid,...value,rank:1+higher.data().count+faster.data().count};
        }
      }
      return {rows:snapshot.docs.map(doc=>({id:doc.id,...doc.data()})),cursor:snapshot.docs.at(-1),more:snapshot.size===50,mine,signedIn:!!user};
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
