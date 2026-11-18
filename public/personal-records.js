// Only signed-in Google players get an account history. Public ranking submissions are separate.
export function accountRecords(sdk, game) {
  const d = sdk.dbApi;
  let uid, stop, boards = {};
  const changed = () => window.dispatchEvent(new Event('ps-personal-records'));
  const collection = owner => d.collection(sdk.db,'profiles',owner,game+'History');
  const api = {
    get active(){return Boolean(uid);},
    read(){
      if (!uid) return null;
      if (game==='geo') return Object.fromEntries(Object.entries(boards).map(([key,data])=>[key,data.best]));
      const records={ko:{},en:{}};
      for(const [key,data] of Object.entries(boards)){
        const [lang,diff]=key.split('_');
        if(!records[lang] || !Array.isArray(data.runs))continue;
        const valid=data.runs.filter(r=>r && ['score','correct','total','combo','elapsedMs','date'].every(k=>Number.isFinite(r[k])));
        (records[lang][diff]??=[]).push(...valid);
        records[lang][diff].sort((a,b)=>b.score-a.score||a.elapsedMs-b.elapsedMs);
      }
      return records;
    },
    async save(key,record){
      if (!uid) return;
      const ref=d.doc(collection(uid),key);
      await d.runTransaction(sdk.db,async tx=>{
        const prev=(await tx.get(ref)).data();
        if(game==='geo'){
          if(prev && (prev.best.score>record.score || (prev.best.score===record.score && prev.best.seconds<=record.seconds)))return;
          tx.set(ref,{best:record});
        }else{
          const runs=[...(prev?.runs||[]).filter(r=>r.date!==record.date),record];
          runs.sort((a,b)=>b.score-a.score||a.elapsedMs-b.elapsedMs);
          tx.set(ref,{runs:runs.slice(0,10)});
        }
      });
    },
    async clear(lang){
      if (!uid)return;
      const coll=collection(uid),batch=d.writeBatch(sdk.db);
      for(const snap of (await d.getDocsFromServer(coll)).docs)if(snap.id.startsWith(lang+'_'))batch.delete(snap.ref);
      await batch.commit();
    }
  };
  sdk.authApi.onAuthStateChanged(sdk.auth,user=>{
    stop?.(); boards={};
    uid=user?.providerData?.some(p=>p.providerId==='google.com')?user.uid:null;
    changed();
    if(uid){
      const owner=uid;
      stop=d.onSnapshot(collection(owner),snapshot=>{
        if(uid!==owner)return;
        boards=Object.fromEntries(snapshot.docs.map(doc=>[doc.id,doc.data()]));
        changed();
      },error=>console.warn('Account history:',error.code));
    }
  });
  return api;
}
