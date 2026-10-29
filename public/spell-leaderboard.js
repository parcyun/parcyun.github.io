// Public rankings contain only a chosen nickname and voluntarily submitted results.
export function createLeaderboard(context) {
  const boardId = ({lang,diff,mode}) => {
    if (!['ko','en'].includes(lang)||!['easy','med','hard','mix'].includes(diff)||!['practice','timer','custom'].includes(mode)) throw new Error('Invalid board');
    return `${lang}_${diff}_${mode}`;
  };
  return {
    async load(filters, cursor) {
      const {s,user}=await context(); const d=s.dbApi;
      const collection=d.collection(s.db,'spellBoards',boardId(filters),'players');
      const clauses=[d.orderBy('score','desc'),d.orderBy('elapsedMs','asc'),d.limit(50)];
      if(cursor)clauses.push(d.startAfter(cursor));
      const snapshot=await d.getDocsFromServer(d.query(collection,...clauses));
      let mine=null;
      if(user){
        const own=await d.getDocFromServer(d.doc(collection,user.uid));
        if(own.exists()){
          const value=own.data();
          const [higher,faster]=await Promise.all([
            d.getCountFromServer(d.query(collection,d.where('score','>',value.score))),
            d.getCountFromServer(d.query(collection,d.where('score','==',value.score),d.where('elapsedMs','<',value.elapsedMs)))
          ]);
          mine={...value,rank:1+higher.data().count+faster.data().count};
        }
      }
      return {rows:snapshot.docs.map(doc=>({id:doc.id,...doc.data()})),cursor:snapshot.docs.at(-1),more:snapshot.size===50,mine,signedIn:!!user};
    },
    async submit(record) {
      const {s,user,profile,nickname}=await context();if(!user)throw new Error('로그인 후 등록할 수 있어요.');
      const d=s.dbApi;const ref=d.doc(s.db,'spellBoards',boardId(record),'players',user.uid);
      const next={nickname:profile.nickname||nickname,score:record.score,elapsedMs:Math.round(record.elapsedMs),playedAt:d.Timestamp.fromMillis(record.playedAt),updatedAt:d.serverTimestamp()};
      await d.runTransaction(s.db,async transaction=>{
        const previous=await transaction.get(ref);
        if(previous.exists()){const p=previous.data();if(p.score>next.score||(p.score===next.score&&p.elapsedMs<=next.elapsedMs))return}
        transaction.set(ref,next);
      });
    }
  };
}
