import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/pages/works.astro', import.meta.url), 'utf8');

test('all Titan tools expose actual-site image and detailed summary previews', async () => {
  const slugs = ['getdesign', 'grill-me', 'ouroboros', 'astryx', 'pre-design'];

  assert.equal((source.match(/class="titan-hover-preview"/g) || []).length, 5);
  assert.equal((source.match(/aria-describedby="titan-preview-/g) || []).length, 5);
  for (const slug of slugs) {
    assert.match(source, new RegExp(`/images/titan-previews/${slug}\\.png`));
    await access(new URL(`../public/images/titan-previews/${slug}.png`, import.meta.url));
  }
});

test('Titan preview matches the shared full-width upward 0.3 second behavior', () => {
  assert.match(source, /\.titan-hover-preview[\s\S]*?bottom: calc\(100% \+ 12px\)/);
  assert.match(source, /\.titan-hover-preview[\s\S]*?width: 100%/);
  assert.match(source, /\.titan-hover-preview[\s\S]*?min-height: 230px/);
  assert.match(source, /transform: translateY\(10px\)/);
  assert.match(source, /opacity 0\.3s ease/);
  assert.match(source, /transform 0\.3s/);
  assert.match(source, /transition-delay: 0\.7s, 0\.7s, 0\.7s/);
  assert.match(source, /\.titan-item:focus-within/);
});
