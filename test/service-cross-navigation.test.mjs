import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('both games load the shared floating navigation', async () => {
  const [geoweb, spell] = await Promise.all([
    read('src/pages/world-map.astro'),
    read('public/spell-drill/index.html'),
  ]);
  assert.match(geoweb, /src="\/share-widget\.js"/);
  assert.match(spell, /src="\.\.\/share-widget\.js"/);
});

test('floating actions link only the two games and keep one position owner', async () => {
  const widget = await read('public/share-widget.js');
  assert.match(widget, /\/world-map\//);
  assert.match(widget, /\/spell-drill\//);
  assert.match(widget, /ps-service-actions/);
  assert.match(widget, /ps-service-link/);
  assert.match(widget, /aria-label/);
  assert.match(widget, /safe-area-inset-bottom/);
  assert.match(widget, /focus-visible/);
});
