import fs from 'node:fs/promises';import {api,plain} from './geogame-source-api.mjs';
const files=['Brahmaputra River (30663416298).jpg','Brahmaputra riveside.jpg','View of river Brahmaputra from a ferry.jpg','Altiplano Mexicano.jpg','El Altiplano Mexicano desde Orizaba hasta el Popocatépetl.jpg','Chihuahua Steppe.jpg'];
const j=await api('commons.wikimedia.org',{action:'query',titles:files.map(f=>`File:${f}`).join('|'),prop:'imageinfo',iiprop:'url|extmetadata|size',iiurlwidth:'960'}),photos={};
for(const p of Object.values(j.query.pages)){const x=p.imageinfo?.[0],m=x?.extmetadata;if(!x?.thumburl)throw Error(p.title);photos[p.title.slice(5)]={image:x.thumburl,source:x.descriptionurl,author:plain(m.Artist?.value),license:plain(m.LicenseShortName?.value),licenseUrl:m.LicenseUrl?.value||'https://creativecommons.org/publicdomain/mark/1.0/'};}
for(const name of ['geoGameLandmarksExpanded','geoGameNaturePhotosExpanded']){
 const file=`src/components/${name}.json`,data=JSON.parse(await fs.readFile(file,'utf8'));
 if(!Array.isArray(data)){data['rivers:브라마푸트라강'].photos=files.slice(0,3).map(f=>photos[f]);data[Object.keys(data).find(id=>data[id].displayName==='멕시코 고원')].photos=files.slice(3).map(f=>photos[f]);}
 for(const q of Array.isArray(data)?data:Object.values(data)){
  const seen=new Set();q.photos=q.photos.filter(p=>{const key=decodeURIComponent(p.source).replaceAll('_',' ').toLowerCase();if(/\bmap\b|map\.png|locator|location|outline|topograph|topograf|karte|\bflag\b|\blogo\b|\.svg|\.pdf|with borders|highlighted|annotated|drainage|basin|cuenca|ibra|chinageography|kalahari\.png|karakum\.png|indo-gangetic plain\.png|deccan, india\.png|english ver\.png|colorednumbered|demqilian|npra f1lg|atlantic plain continental|nyugati-sierra|syrian desert\.png/i.test(key)||!Array.isArray(data)&&/marbres|bison|mountain goat|flower|corocoras|autódromo|cliff palace|rock suite|khondalite|reconstruction|scythian|bierstadt|mosque|temple|province and|ice core|bombing|sign\.|highway sign|selling plastic|nile barge|lone-maiden|corresponding to|prince of wales|cuxtmanuscript|canal del danubio/i.test(key)||seen.has(key))return false;seen.add(key);return true;}).slice(0,3);if(!q.photos.length&&Array.isArray(data))throw Error(`No real photos: ${q.name}`);if(q.photos.length)Object.assign(q,q.photos[0]);
 }
 await fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
}
