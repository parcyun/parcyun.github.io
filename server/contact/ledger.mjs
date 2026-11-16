import {Storage} from '@google-cloud/storage';

// Private daily ledger: hashes, request ids, timestamps and delivery state only.
// Generation preconditions make quota reservations durable across restarts/instances.
export class ContactLedger{
 constructor(bucket){this.bucket=new Storage({retryOptions:{autoRetry:false}}).bucket(bucket);}
 async update(day,change){
  const file=this.bucket.file(`requests/${day}.json`);
  for(let attempt=0;attempt<8;attempt++){
   let generation=0,entries=[];
   try{
    const [meta]=await file.getMetadata();generation=meta.generation;
    const [body]=await file.download();entries=JSON.parse(body.toString());
   }catch(error){if(error.code!==404)throw error;}
   const result=change(entries);
   if(!result.write)return result;
   try{
    await file.save(JSON.stringify(entries),{resumable:false,contentType:'application/json',preconditionOpts:{ifGenerationMatch:generation}});
    return result;
   }catch(error){if(error.code!==412)throw error;}
  }
  throw Error('Contact ledger busy');
 }
}
