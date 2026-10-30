import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function createStorage({mode=process.env.CONQUEST_STORAGE||'sqlite',filename=process.env.CONQUEST_DB||fileURLToPath(new URL('./.data/conquest.sqlite',import.meta.url))}={}){
  if(mode==='firestore'){
    const {initializeApp,applicationDefault}=await import('firebase-admin/app');const {getFirestore}=await import('firebase-admin/firestore');
    initializeApp({credential:applicationDefault(),projectId:process.env.GOOGLE_CLOUD_PROJECT||'parcyun'});const db=getFirestore();
    return {mode,async transaction(keys,fn){return db.runTransaction(async tx=>{const refs=keys.map(k=>db.collection('geowebConquestDev').doc(k));const docs=await tx.getAll(...refs);const values=Object.fromEntries(keys.map((key,i)=>[key,docs[i].exists?JSON.parse(docs[i].data().json):null]));const before=Object.fromEntries(keys.map(key=>[key,JSON.stringify(values[key])]));const result=fn(values);for(let i=0;i<keys.length;i++){const json=JSON.stringify(values[keys[i]]);if(json===before[keys[i]])continue;if(Buffer.byteLength(json)>850000)throw Error('개발 서버의 데이터 용량이 찼어요. 관리자에게 알려주세요.');tx.set(refs[i],{json});}return result;},{maxAttempts:12});},async get(key){const doc=await db.collection('geowebConquestDev').doc(key).get();return doc.exists?JSON.parse(doc.data().json):null;}};
  }
  if(process.env.K_SERVICE)throw Error('Cloud Run requires CONQUEST_STORAGE=firestore; local disk is not durable.');
  const {DatabaseSync}=await import('node:sqlite');mkdirSync(dirname(filename),{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, json TEXT NOT NULL)');
  const get=db.prepare('SELECT json FROM documents WHERE id=?'),put=db.prepare('INSERT INTO documents(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json');
  return {mode,async get(key){const row=get.get(key);return row?JSON.parse(row.json):null;},async transaction(keys,fn){db.exec('BEGIN IMMEDIATE');try{const values=Object.fromEntries(keys.map(k=>{const row=get.get(k);return[k,row?JSON.parse(row.json):null];}));const result=fn(values);for(const key of keys)put.run(key,JSON.stringify(values[key]));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}},close(){db.close();}};
}
