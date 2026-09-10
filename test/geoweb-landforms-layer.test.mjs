import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { EMPTY_LANDFORM_SELECTION, LANDFORM_CATEGORIES, LANDFORM_CATEGORY_ORDER, LANDFORM_DATA_URL } from '../src/components/globeLandforms.js';

const globeSource = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');
const landforms = async () => JSON.parse(await readFile(new URL(`../public${LANDFORM_DATA_URL}`, import.meta.url)));

test('GeoWeb offers five independently selectable classroom landform categories', () => {
  assert.deepEqual(LANDFORM_CATEGORY_ORDER, ['rivers', 'mountains', 'plateaus', 'plains', 'deserts']);
  assert.deepEqual(EMPTY_LANDFORM_SELECTION, { rivers:false, mountains:false, plateaus:false, plains:false, deserts:false });
  for (const key of LANDFORM_CATEGORY_ORDER) assert.match(LANDFORM_CATEGORIES[key].color, /^#[A-F0-9]{6}$/);
});

test('landform data includes representative school geography and rivers stay as flow lines', async () => {
  const data = await landforms();
  const category = (key) => data.features.filter((feature) => feature.properties.category === key);
  assert.equal(data.source, 'Natural Earth 50m Physical Vectors with selected 10m fallback (v5.0.0/5.1.1)');
  for (const key of LANDFORM_CATEGORY_ORDER) assert.ok(category(key).length > 0, `${key} needs features`);
  for (const name of ['나일강', '인더스강', '갠지스강', '메콩강', '황허강', '양쯔강', '미시시피강', '아마존강']) {
    assert.ok(category('rivers').some((feature) => feature.properties.nameKo === name), `${name} is required`);
  }
  for (const name of ['알프스산맥', '히말라야산맥', '우랄산맥', '캅카스산맥', '아틀라스산맥', '로키산맥', '애팔래치아산맥', '안데스산맥', '그레이트디바이딩산맥']) {
    assert.ok(category('mountains').some((feature) => feature.properties.nameKo === name), `${name} is required`);
  }
  for (const name of ['몽골고원', '콜로라도고원', '알티플라노고원', '만주평원', '팜파스', '야노스', '그란차코', '아라비아 사막', '타르 사막', '타클라마칸 사막', '그레이트플레인스', '중앙아시아 평원·저지', '중앙아시아 사막권', '오스트레일리아 사막권']) {
    assert.ok(data.features.some((feature) => feature.properties.nameKo === name), `${name} is required`);
  }
  for (const feature of category('rivers')) assert.match(feature.geometry.type, /^(?:Multi)?LineString$/, 'rivers must render only as paths');
  for (const feature of data.features.filter((feature) => feature.properties.category !== 'rivers')) assert.match(feature.geometry.type, /^(?:Multi)?Polygon$/, 'area features must be polygons');
  assert.ok(category('deserts').some((feature) => feature.properties.sourceName === 'ARABIAN PENINSULA'), 'Arabian Desert uses a broad peninsula-scale classroom extent');
  assert.ok(category('deserts').some((feature) => feature.properties.nameKo === '아라비아 사막' && feature.properties.sourceClass === 'Pen/cape'), 'Arabian Desert proxy retains its source class');
  assert.ok(category('deserts').some((feature) => feature.properties.nameKo === '오스트레일리아 사막권' && feature.properties.sourceScale === '10m'), 'Australian Desert Region falls back to the detailed source where 50m omits interior deserts');
  assert.ok(category('mountains').some((feature) => feature.properties.nameKo === '로키산맥' && feature.properties.spreadDegrees >= 0.9), 'Rockies must use a broader classroom extent');
});

test('GeoWeb draws selected terrain categories at 70 percent opacity over climate without replacing it', async () => {
  const source = await globeSource();
  assert.match(source, /fetch\(LANDFORM_DATA_URL\)\.then\(r=>r\.json\(\)\)/);
  assert.match(source, /if\(terrain\)paintLandforms\(ctx,landforms,terrainLayers\)/);
  assert.match(source, /ctx\.globalAlpha=0\.7/);
  assert.match(source, /if\(category==='rivers'\)/);
  assert.match(source, /path\(feature\);ctx\.stroke\(\)/);
  assert.match(source, /checked=\{terrain\}/);
  assert.match(source, /setTerrainLayers\(current=>\(\{\.\.\.current,\[key\]:event\.target\.checked\}\)\)/);
  assert.match(source, /className="terrain-legend"/);
  assert.match(source, /ctx\.strokeText\(feature\.properties\.nameKo,x,y\)/);
  assert.match(source, /ctx\.fillText\(feature\.properties\.nameKo,x,y\)/);
  assert.match(source, /const spread=feature\.properties\.spreadDegrees\|\|0/);
});
