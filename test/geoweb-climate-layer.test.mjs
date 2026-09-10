import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import { ALL_CLIMATE_SELECTION, CLIMATE_TEXTURE_URL, CLIMATE_ZONE_ORDER, CLIMATE_ZONES } from '../src/components/globeClimate.js';

const source = () => readFile(new URL('../src/components/GlobeLab.jsx', import.meta.url), 'utf8');

async function readIndexedPng() {
  const png = await readFile(new URL(`../public${CLIMATE_TEXTURE_URL}`, import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  const chunks = [];
  let palette;
  let width;
  let height;
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString();
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8, 'climate texture must use 8-bit palette indexes');
      assert.equal(data[9], 3, 'climate texture must be indexed color');
    }
    if (type === 'IDAT') chunks.push(data);
    if (type === 'PLTE') palette = data;
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const pixels = Buffer.alloc(width * height);
  let inputOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[inputOffset++];
    for (let col = 0; col < width; col += 1) {
      const value = raw[inputOffset++];
      const left = col ? pixels[row * width + col - 1] : 0;
      const up = row ? pixels[(row - 1) * width + col] : 0;
      const upLeft = row && col ? pixels[(row - 1) * width + col - 1] : 0;
      const paeth = (() => {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left), pb = Math.abs(p - up), pc = Math.abs(p - upLeft);
        return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      })();
      const decoded = [value, value + left, value + up, value + Math.floor((left + up) / 2), value + paeth][filter];
      assert.notEqual(decoded, undefined, `unsupported PNG filter ${filter}`);
      pixels[row * width + col] = decoded & 255;
    }
  }
  return { width, height, pixels, palette };
}

test('elementary climate layer exposes exactly six pastel climate zones', () => {
  assert.deepEqual(CLIMATE_ZONE_ORDER.map((key) => [CLIMATE_ZONES[key].ko, CLIMATE_ZONES[key].color]), [
    ['열대', '#F5A06F'], ['건조', '#F2D46B'], ['온대', '#8EC88B'],
    ['냉대', '#9CA4D6'], ['한대', '#E5EBF5'], ['고산', '#69C4C7'],
  ]);
  assert.equal(CLIMATE_ZONE_ORDER.length, 6);
  for (const key of CLIMATE_ZONE_ORDER) assert.match(CLIMATE_ZONES[key].color, /^#[A-F0-9]{6}$/);
  assert.deepEqual(ALL_CLIMATE_SELECTION, { tropical:true, dry:true, temperate:true, cold:true, polar:true, highland:true });
});

test('the generated climate texture classifies representative places correctly', async () => {
  const { width, height, pixels, palette } = await readIndexedPng();
  assert.deepEqual([width, height], [3600, 1800]);
  for (const [index, zone] of [[1, 'tropical'], [2, 'temperate'], [3, 'cold'], [4, 'polar'], [5, 'dry'], [6, 'highland']]) {
    const actual = `#${palette.subarray(index * 3, index * 3 + 3).toString('hex').toUpperCase()}`;
    assert.equal(actual, CLIMATE_ZONES[zone].color, `${zone} texture color must match its legend`);
  }
  const zoneAt = (lon, lat) => pixels[Math.floor((90 - lat) / 180 * height) * width + Math.floor((lon + 180) / 360 * width)];
  assert.equal(zoneAt(0, 51.5), 2, 'London and western Europe must be temperate');
  assert.equal(zoneAt(-60, -3), 1, 'Amazon basin must be tropical');
  assert.equal(zoneAt(13, 24), 5, 'Sahara must be dry');
  assert.equal(zoneAt(90, 60), 3, 'central Siberia must be cold');
  assert.equal(zoneAt(0, -80), 4, 'Antarctica must be polar');
  assert.equal(zoneAt(85, 31), 6, 'Tibetan Plateau must be highland');
  assert.equal(zoneAt(-70, -16), 6, 'central Andes must be highland');
});

test('GeoWeb provides a left-toolbox toggle, map overlay, and individually selectable six-color legend', async () => {
  const globe = await source();
  assert.match(globe, /const \[climate,setClimate\]=useState\(true\)/);
  assert.match(globe, /const \[climateZones,setClimateZones\]=useState\(\(\)=>\(\{\.\.\.ALL_CLIMATE_SELECTION\}\)\)/);
  assert.match(globe, /checked=\{climate\}/);
  assert.match(globe, /setClimate\(e\.target\.checked\)/);
  assert.match(globe, /loadTileImg\(CLIMATE_TEXTURE_URL\)/);
  assert.match(globe, /buildOverlay\(\{sel:s,world,oceans,oceansFill,climate:S\.current\.climate,climateImage,climateZones:S\.current\.climateZones,terrain:S\.current\.terrain,terrainLayers:S\.current\.terrainLayers,landforms,targetTexture:overlayTex\}\)/);
  assert.match(globe, /className="climate-legend"/);
  assert.match(globe, /CLIMATE_ZONE_ORDER\.map/);
  assert.match(globe, /setClimateZones\(current=>\(\{\.\.\.current,\[key\]:event\.target\.checked\}\)\)/);
  assert.match(globe, /T\.climateSimplified/);
  assert.match(globe, /GEOWEB_CLIMATE_ATTRIBUTION\.txt/);
});

test('climate colors fully replace continent colors instead of blending with them', async () => {
  const globe = await source();
  assert.doesNotMatch(globe, /globalAlpha=0\.88/);
  assert.match(globe, /globalAlpha=1;paintClimate\(ctx,climateImage,climateZones\)/);
});

test('climate and selection updates reuse one GPU texture without a blank swap frame', async () => {
  const globe = await source();
  assert.doesNotMatch(globe, /overlayTex\.dispose\(\)/);
  assert.match(globe, /targetTexture:overlayTex/);
  assert.match(globe, /targetTexture\.needsUpdate=true/);
});

test('pointer movement cannot expose a transparent WebGL frame behind the map', async () => {
  const globe = await source();
  assert.doesNotMatch(globe, /new THREE\.WebGLRenderer\(\{[^}]*alpha:true/);
  assert.match(globe, /scene\.background=new THREE\.Color\(0x04060B\)/);
  assert.match(globe, /renderer\.setClearColor\(0x04060B,1\)/);
});
