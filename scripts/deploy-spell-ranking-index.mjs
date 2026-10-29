import {execFileSync} from 'node:child_process';
const token=execFileSync('gcloud',['auth','print-access-token'],{encoding:'utf8'}).trim();
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const url='https://firestore.googleapis.com/v1/projects/parcyun/databases/(default)/collectionGroups/players/indexes';
const current=await fetch(url,{headers}).then(r=>r.json());
if(current.error)throw new Error(current.error.message);
const fields=[{fieldPath:'score',order:'DESCENDING'},{fieldPath:'elapsedMs',order:'ASCENDING'}];
const existing=(current.indexes||[]).find(i=>fields.every((f,n)=>i.fields[n]?.fieldPath===f.fieldPath&&i.fields[n]?.order===f.order));
if(existing)console.log('Ranking index:',existing.state);
else {const r=await fetch(url,{method:'POST',headers,body:JSON.stringify({queryScope:'COLLECTION',fields})});const data=await r.json();if(!r.ok)throw new Error(data.error?.message);console.log('Ranking index creation requested.');}
