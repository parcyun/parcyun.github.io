// Publish exactly three times the original 52 named natural features, all with licensed photos.
import fs from 'node:fs/promises';
const file='public/lab-data/geoweb-landforms.json',data=JSON.parse(await fs.readFile(file,'utf8')),photos=JSON.parse(await fs.readFile('src/components/geoGameNaturePhotosExpanded.json','utf8'));
const ids=[...new Set(data.features.map(f=>`${f.properties.category}:${f.properties.nameKo}`))].filter(id=>photos[id]?.photos?.length&&!['deserts:펀자브','plateaus:이베리아반도','plains:센트럴 로우랜드','deserts:카팅가스'].includes(id)).slice(0,156);
if(ids.length!==156)throw Error(`Only ${ids.length} illustrated natural features`);
const selected=new Set(ids);data.features=data.features.filter(f=>selected.has(`${f.properties.category}:${f.properties.nameKo}`));await fs.writeFile(file,JSON.stringify(data)+'\n');await fs.writeFile('src/components/geoGameNaturePhotosExpanded.json',JSON.stringify(Object.fromEntries(ids.map(id=>[id,photos[id]])),null,2)+'\n');console.log('Final natural features:',ids.length,'photos:',ids.reduce((n,id)=>n+photos[id].photos.length,0));
