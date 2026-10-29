export async function optimizeSchoolMark(file,{createBitmap=globalThis.createImageBitmap,createCanvas=()=>document.createElement('canvas')}={}) {
 if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('8MB 이하의 PNG·JPG·WebP 이미지를 선택해 주세요.');
 const bitmap=await createBitmap(file);
 try{
  const canvas=createCanvas(),scale=Math.min(1,256/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.85,.65,.45]){const image=canvas.toDataURL('image/webp',quality);if(image.startsWith('data:image/webp;base64,')&&image.length<=90000)return image;}
  throw new Error('이미지 용량을 줄이지 못했어요. 더 작은 파일을 선택해 주세요.');
 }finally{bitmap.close();}
}
export async function submitSchoolMarkRequest({s,user,school,image}) {
 if(!user||!school||!/^([A-Z][0-9]{2}):[0-9]{6,10}$/.test(school.id)||!school.name||school.name.length>60||!/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>90000)throw new Error('학교와 교표 이미지를 다시 확인해 주세요.');
 const ref=s.dbApi.doc(s.db,'schoolMarkRequests',`${user.uid}_${school.id}`);
 await s.dbApi.runTransaction(s.db,async tx=>{const existing=await tx.get(ref);if(existing.exists())throw new Error('이 학교의 이미지 등록 요청을 이미 보냈어요. 확인 후 반영할게요.');tx.set(ref,{ownerUid:user.uid,schoolId:school.id,schoolName:school.name,schoolAddress:String(school.address||'').slice(0,200),image,status:'pending',submittedAt:s.dbApi.serverTimestamp()});});
 return ref;
}
