import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ACADEMICA and ATLAS cards share an image and summary hover preview', async () => {
  const [preview, lectures, activities] = await Promise.all([
    read('src/components/ResourceHoverPreview.tsx'),
    read('src/components/LectureShelf.tsx'),
    read('src/components/ActivityBrowser.tsx'),
  ]);

  assert.match(preview, /resource-hover-image/);
  assert.match(preview, /resource\.desc/);
  assert.match(preview, /\/images\/og-card\.png/);
  assert.match(preview, /\/spell-drill\/og-cover\.png/);
  for (const source of [lectures, activities]) {
    assert.match(source, /ResourceHoverPreview/);
    assert.match(source, /aria-describedby=\{resourcePreviewId\(r\.id\)\}/);
  }
});

test('hover preview waits for intent then fades down in 0.3 seconds', async () => {
  const [lectures, activities] = await Promise.all([
    read('src/components/LectureShelf.tsx'),
    read('src/components/ActivityBrowser.tsx'),
  ]);

  for (const source of [lectures, activities]) {
    assert.match(source, /transform:translateY\(-10px\)/);
    assert.match(source, /opacity \.3s ease/);
    assert.match(source, /transform \.3s/);
    assert.match(source, /transition-delay:\.7s,\.7s,\.7s/);
    assert.match(source, /focus-within/);
  }
});
