#!/usr/bin/env node
/** Build GeoWeb's compact classroom landforms GeoJSON from Natural Earth 50m vectors. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const REGIONS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_geography_regions_polys.geojson';
const RIVERS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson';
const output = resolve(process.argv[2] || 'public/lab-data/geoweb-landforms.json');

const areaSelections = {
  mountains: new Set(['ALPS', 'HIMALAYAS', 'URAL MOUNTAINS', 'CAUCASUS MTS.', 'ATLAS MOUNTAINS', 'ROCKY MOUNTAINS', 'APPALACHIAN MTS.', 'ANDES', 'GREAT DIVIDING RANGE']),
  plateaus: new Set(['ETHIOPIAN HIGHLANDS', 'DECCAN PLATEAU', 'PLATEAU OF TIBET', 'BRAZILIAN HIGHLANDS', 'CENTRAL SIBERIAN PLATEAU']),
  plains: new Set(['NORTHERN EUROPEAN PLAIN', 'NORTH CHINA PLAIN', 'GREAT PLAINS', 'WESTERN SIBERIAN PLAIN', 'GANGES PLAIN']),
  deserts: new Set(['SAHARA', 'GOBI DESERT', 'ARABIAN DESERT', 'KALAHARI DESERT', 'NAMIB DESERT', 'DESIERTO DE ATACAMA', 'GREAT SANDY DESERT', 'GREAT VICTORIA DESERT', 'PATAGONIAN DESERT']),
};

const riverSelections = [
  ['나일강', ['Nile', 'Albert Nile', 'Victoria Nile', 'Bahr el Jebel', 'El Bahr el Abyad', 'El Bahr el Azraq', 'Abay']],
  ['인더스강', ['Indus']], ['갠지스강', ['Ganges']], ['메콩강', ['Mekong', 'Lancang']],
  ['황허강', ['Huang']], ['양쯔강', ['Yangtze', 'Chang Jiang', 'Jinsha']], ['미시시피강', ['Mississippi']],
  ['아마존강', ['Amazonas']], ['콩고강', ['Congo', 'Lualaba']], ['다뉴브강', ['Danube', 'Donau']],
  ['볼가강', ['Volga']], ['오비강', ['Ob']], ['예니세이강', ['Yenisey']], ['레나강', ['Lena']],
];

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while downloading ${url}`);
  return response.json();
};
const compactGeometry = (geometry) => geometry;
const makeFeature = (category, nameKo, nameEn, geometry) => ({
  type: 'Feature', properties: { category, nameKo, nameEn }, geometry: compactGeometry(geometry),
});

const [regions, rivers] = await Promise.all([fetchJson(REGIONS_URL), fetchJson(RIVERS_URL)]);
const features = [];
for (const [category, names] of Object.entries(areaSelections)) {
  for (const feature of regions.features) {
    if (!names.has(feature.properties.NAME)) continue;
    features.push(makeFeature(category, feature.properties.NAME_KO || feature.properties.NAME, feature.properties.NAME_EN || feature.properties.NAME, feature.geometry));
  }
}
for (const [nameKo, aliases] of riverSelections) {
  for (const feature of rivers.features) {
    if (feature.properties.featurecla !== 'River') continue;
    if (!aliases.includes(feature.properties.name) && !aliases.includes(feature.properties.name_alt) && !aliases.includes(feature.properties.name_en)) continue;
    features.push(makeFeature('rivers', nameKo, feature.properties.name_en || feature.properties.name, feature.geometry));
  }
}
const data = {
  type: 'FeatureCollection',
  source: 'Natural Earth 50m Physical Vectors (v5.0.0/5.1.1)',
  license: 'Public Domain',
  features,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(data)}\n`);
console.log(`Wrote ${features.length} selected landform features to ${output}`);
console.log(Object.fromEntries(['rivers', 'mountains', 'plateaus', 'plains', 'deserts'].map((category) => [category, features.filter((feature) => feature.properties.category === category).length])));
