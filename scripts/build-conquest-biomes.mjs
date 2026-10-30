// Usage: node scripts/build-conquest-biomes.mjs /path/to/RESOLVE.geojson
import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const data=JSON.parse(await readFile(process.argv[2],'utf8'));
const shapes=data.features.map(f=>{
 const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
 const rings=polygons.flat();
 const d=rings.map(ring=>'M'+ring.map(([lon,lat])=>`${((lon+180)*10).toFixed(2)},${((90-lat)*10).toFixed(2)}`).join('L')+'Z').join('');
 const id=/rock.*ice/i.test(f.properties.ECO_NAME)?15:f.properties.BIOME_NUM;
 return `<path fill="rgb(${id},0,0)" fill-rule="evenodd" d="${d}"/>`;
});
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="3600" height="1800" shape-rendering="crispEdges">${shapes.join('')}</svg>`)).png().toFile('public/lab-data/conquest-biomes.png');
await writeFile('public/lab-data/CONQUEST_ENVIRONMENT_ATTRIBUTION.txt',`Natural environment classification for GeoWeb Battleground\nRESOLVE Ecoregions 2017, Dinerstein et al. (2017), CC BY 4.0.\nhttps://doi.org/10.1093/biosci/bix014\nhttps://developers.google.com/earth-engine/datasets/catalog/RESOLVE_ECOREGIONS_2017\nDownloaded via Esri-hosted Resolve_Ecoregions feature service (847 records including rock and ice).\nSource geometry simplified to 0.08 degrees; rasterized at 0.1 degrees. Tile centers sampled.\nNatural Earth representative physical landforms (Public Domain) take precedence for mountains, plateaus and plains; existing GeoWeb climate highland/polar supplement fills gaps.\nThese are regional ecological environments, not current land cover or measured permafrost. Rock/ice is grouped as a frozen environment for gameplay, not a soil permafrost diagnosis.\nAttack/defense percentages are designed game balance, not scientific measurements.\n`);
console.log('Wrote conquest-biomes.png');
