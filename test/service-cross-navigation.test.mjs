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
  assert.match(geoweb, /src="\/share-widget\.js\?v=20261028-qr4"/);
  assert.match(spell, /src="\.\.\/share-widget\.js\?v=20261028-qr4"/);
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

test('both games expose a compact Dexter QR popover for their own public URL', async () => {
  const widget = await read('public/share-widget.js');
  const generator = await read('scripts/generate-game-qr.mjs');
  const [geowebQr, spellQr, mascot] = await Promise.all([
    read('public/qr/world-map.svg'),
    read('public/qr/spell-drill.svg'),
    readFile(new URL('public/images/dexter-base-character-01.png', root)),
  ]);
  assert.match(widget, /row\.appendChild\(qrButton\);\s*row\.appendChild\(link\)/);
  assert.match(widget, /aria-expanded/);
  assert.match(widget, /role', 'dialog'/);
  assert.match(widget, /ps-qr-popover\{position:fixed;top:/);
  assert.match(widget, /event\.key === 'Escape'/);
  assert.doesNotMatch(widget, /ps-qr-mascot/);
  assert.match(generator, /https:\/\/parcyun\.github\.io\/\$\{page\}\//);
  assert.match(generator, /cutoutSize = 9/);
  assert.match(geowebQr, /<svg/);
  assert.match(spellQr, /<svg/);
  assert.ok(mascot.length > 0);
});
