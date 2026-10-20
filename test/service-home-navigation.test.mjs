import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('GeoWeb and Spell Drill home controls lead to Atlas Gears', async () => {
  const [geoweb, spell] = await Promise.all([
    read('src/components/GlobeLab.jsx'),
    read('public/spell-drill/index.html'),
  ]);
  assert.match(geoweb, /className="home-fab" href="\/atlas-gears\/"/);
  assert.match(spell, /id="ps-back-btn" href="\/atlas-gears\/"/);
  assert.match(spell, /aria-label="아틀라스 기어즈로 이동"/);
  assert.doesNotMatch(spell, /id="ps-back-btn"[^>]*뒤로 가기/);
});
