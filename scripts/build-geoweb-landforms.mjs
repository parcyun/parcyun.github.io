#!/usr/bin/env node
/** Build GeoWeb's compact classroom landforms GeoJSON from Natural Earth 50m vectors. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const REGIONS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_geography_regions_polys.geojson';
const REGIONS_10M_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_geography_regions_polys.geojson';
const RIVERS_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson';
const output = resolve(process.argv[2] || 'public/lab-data/geoweb-landforms.json');

const areaSelections = {
  mountains: new Map([
    ['ALPS',['알프스산맥','Alps']],['HIMALAYAS',['히말라야산맥','Himalayas']],['URAL MOUNTAINS',['우랄산맥','Ural Mountains']],['CAUCASUS MTS.',['캅카스산맥','Caucasus Mountains']],['ATLAS MOUNTAINS',['아틀라스산맥','Atlas Mountains']],['ROCKY MOUNTAINS',['로키산맥','Rocky Mountains']],['APPALACHIAN MTS.',['애팔래치아산맥','Appalachian Mountains']],['ANDES',['안데스산맥','Andes']],['GREAT DIVIDING RANGE',['그레이트디바이딩산맥','Great Dividing Range']],
  ]),
  plateaus: new Map([
    ['ETHIOPIAN HIGHLANDS',['에티오피아고원','Ethiopian Highlands']],['DECCAN PLATEAU',['데칸고원','Deccan Plateau']],['PLATEAU OF TIBET',['티베트고원','Plateau of Tibet']],['BRAZILIAN HIGHLANDS',['브라질고원','Brazilian Highlands']],['PLANALTO CENTRAL',['브라질고원','Brazilian Highlands']],['PLANALTO DO MATO GROSSO',['브라질고원','Brazilian Highlands']],['CENTRAL SIBERIAN PLATEAU',['중앙시베리아고원','Central Siberian Plateau']],['MONGOLIAN PLATEAU',['몽골고원','Mongolian Plateau']],['COLORADO PLATEAU',['콜로라도고원','Colorado Plateau']],['ALTIPLANO',['알티플라노고원','Altiplano']],
  ]),
  plains: new Map([
    ['NORTHERN EUROPEAN PLAIN',['북유럽평원','Northern European Plain']],['NORTH CHINA PLAIN',['화베이평원','North China Plain']],['GREAT PLAINS',['그레이트플레인스','Great Plains']],['WESTERN SIBERIAN PLAIN',['서시베리아평원','Western Siberian Plain']],['GANGES PLAIN',['갠지스평원','Ganges Plain']],['MANCHURIAN PLAIN',['만주평원','Manchurian Plain']],['PAMPAS',['팜파스','Pampas']],['LLANOS',['야노스','Llanos']],['GRAN CHACO',['그란차코','Gran Chaco']],['CHACO BOREAL',['그란차코','Gran Chaco']],['CHACO AUSTRAL',['그란차코','Gran Chaco']],['TURAN LOWLAND',['중앙아시아 평원·저지','Central Asian Lowlands']],['KAZAKH STEPPE',['중앙아시아 평원·저지','Central Asian Lowlands']],
  ]),
  deserts: new Map([
    ['SAHARA',['사하라 사막','Sahara']],['GOBI DESERT',['고비 사막','Gobi Desert']],['ARABIAN PENINSULA',['아라비아 사막','Arabian Desert']],['THAR DESERT',['타르 사막','Thar Desert']],['TAKLIMAKAN DESERT',['타클라마칸 사막','Taklamakan Desert']],['QIZILQUM DESERT',['중앙아시아 사막권','Central Asian Desert Region']],['GARAGUM DESERT',['중앙아시아 사막권','Central Asian Desert Region']],['KALAHARI DESERT',['칼라하리 사막','Kalahari Desert']],['NAMIB DESERT',['나미브 사막','Namib Desert']],['DESIERTO DE ATACAMA',['아타카마 사막','Atacama Desert']],['PATAGONIA',['파타고니아 사막','Patagonian Desert']],['GREAT SANDY DESERT',['오스트레일리아 사막권','Australian Desert Region']],['GIBSON DESERT',['오스트레일리아 사막권','Australian Desert Region']],['GREAT VICTORIA DESERT',['오스트레일리아 사막권','Australian Desert Region']],['SIMPSON DESERT',['오스트레일리아 사막권','Australian Desert Region']],['TANAMI DESERT',['오스트레일리아 사막권','Australian Desert Region']],['STRZELECKI DESERT',['오스트레일리아 사막권','Australian Desert Region']],
  ]),
};

const riverSelections = [
  ['나일강', ['Nile', 'Albert Nile', 'Victoria Nile', 'Bahr el Jebel', 'El Bahr el Abyad', 'El Bahr el Azraq', 'Abay']],
  ['인더스강', ['Indus']], ['갠지스강', ['Ganges']], ['메콩강', ['Mekong', 'Lancang']],
  ['황허강', ['Huang']], ['양쯔강', ['Yangtze', 'Chang Jiang', 'Jinsha']], ['미시시피강', ['Mississippi']],
  ['아마존강', ['Amazonas']], ['콩고강', ['Congo', 'Lualaba']], ['다뉴브강', ['Danube', 'Donau']],
  ['볼가강', ['Volga']], ['오비강', ['Ob']], ['예니세이강', ['Yenisey']], ['레나강', ['Lena']],
];

// Simplification: natural-region polygons are rough at this scale.  The values give
// classroom-scale outward expansion in degrees so long, thin regions remain visible.
const macroSpreadDegrees = {
  mountains: { '로키산맥': 0.95, '안데스산맥': 1.0, '히말라야산맥': 0.9, '우랄산맥': 0.85, '그레이트디바이딩산맥': 0.85, default: 0.7 },
  plateaus: { '티베트고원': 0.9, '브라질고원': 0.8, default: 0.55 },
  plains: { '그레이트플레인스': 0.95, '북유럽평원': 0.9, '서시베리아평원': 0.8, default: 0.55 },
  deserts: { '아라비아 사막': 0.5, '사하라 사막': 0.65, '고비 사막': 0.55, '타클라마칸 사막': 0.7, '중앙아시아 사막권': 0.5, '파타고니아 사막': 0.55, '오스트레일리아 사막권': 0.5, default: 0.45 },
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} while downloading ${url}`);
  return response.json();
};
const compactGeometry = (geometry) => geometry;
const makeFeature = (category, nameKo, nameEn, geometry, sourceName = nameEn, sourceClass = '', sourceScale = '50m') => ({
  type: 'Feature', properties: { category, nameKo, nameEn, sourceName, sourceClass, sourceScale, spreadDegrees: macroSpreadDegrees[category]?.[nameKo] ?? macroSpreadDegrees[category]?.default ?? 0 }, geometry: compactGeometry(geometry),
});

const [regions, regions10m, rivers] = await Promise.all([fetchJson(REGIONS_URL), fetchJson(REGIONS_10M_URL), fetchJson(RIVERS_URL)]);
const features = [];
for (const [category, names] of Object.entries(areaSelections)) {
  for (const [sourceKey, label] of names) {
    const feature = regions.features.find((item) => item.properties.NAME?.toUpperCase() === sourceKey) || regions10m.features.find((item) => item.properties.NAME?.toUpperCase() === sourceKey);
    if (!feature) continue;
    const sourceScale = regions.features.includes(feature) ? '50m' : '10m';
    features.push(makeFeature(category, label[0], label[1], feature.geometry, feature.properties.NAME, feature.properties.FEATURECLA || feature.properties.featurecla, sourceScale));
  }
}
for (const [nameKo, aliases] of riverSelections) {
  for (const feature of rivers.features) {
    if (feature.properties.featurecla !== 'River') continue;
    if (!aliases.includes(feature.properties.name) && !aliases.includes(feature.properties.name_alt) && !aliases.includes(feature.properties.name_en)) continue;
    features.push(makeFeature('rivers', nameKo, feature.properties.name_en || feature.properties.name, feature.geometry, feature.properties.name, feature.properties.featurecla));
  }
}
const data = {
  type: 'FeatureCollection',
  source: 'Natural Earth 50m Physical Vectors with selected 10m fallback (v5.0.0/5.1.1)',
  license: 'Public Domain',
  features,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(data)}\n`);
console.log(`Wrote ${features.length} selected landform features to ${output}`);
console.log(Object.fromEntries(['rivers', 'mountains', 'plateaus', 'plains', 'deserts'].map((category) => [category, features.filter((feature) => feature.properties.category === category).length])));
