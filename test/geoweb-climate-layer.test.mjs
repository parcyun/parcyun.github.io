import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CLIMATE_BANDS, CLIMATE_REGIONS, CLIMATE_ZONE_ORDER, CLIMATE_ZONES } from '../src/components/globeClimate.js';

const source = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');

test('elementary climate layer exposes exactly six pastel climate zones', () => {
  assert.deepEqual(CLIMATE_ZONE_ORDER.map((key) => CLIMATE_ZONES[key].ko), ['열대', '온대', '냉대', '한대', '건조', '고산']);
  assert.equal(CLIMATE_ZONE_ORDER.length, 6);
  for (const key of CLIMATE_ZONE_ORDER) assert.match(CLIMATE_ZONES[key].color, /^#[A-F0-9]{6}$/);
});

test('climate coverage combines latitude bands with representative dry and highland regions', () => {
  assert.deepEqual(CLIMATE_BANDS.map(({ minLat, maxLat }) => [minLat, maxLat]), [[66.5, 90], [50, 66.5], [23.5, 50], [-23.5, 23.5], [-60, -23.5], [-90, -60]]);
  assert.equal(CLIMATE_REGIONS.some(({ zone }) => zone === 'dry'), true);
  assert.equal(CLIMATE_REGIONS.some(({ zone }) => zone === 'highland'), true);
});

test('GeoWeb provides a left-toolbox toggle, map overlay, and visible six-color legend', async () => {
  const globe = await source();
  assert.match(globe, /checked=\{climate\}/);
  assert.match(globe, /setClimate\(e\.target\.checked\)/);
  assert.match(globe, /buildOverlay\(\{sel:s,world,oceans,oceansFill,climate:S\.current\.climate\}\)/);
  assert.match(globe, /className="climate-legend"/);
  assert.match(globe, /CLIMATE_ZONE_ORDER\.map/);
  assert.match(globe, /T\.climateSimplified/);
});
