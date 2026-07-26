import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Works cards expose project-specific image and detailed summary previews', async () => {
  const [preview, filter] = await Promise.all([
    read('src/components/WorkHoverPreview.tsx'),
    read('src/components/WorksFilter.tsx'),
  ]);

  assert.match(filter, /WorkHoverPreview/);
  assert.match(filter, /aria-describedby=\{workPreviewId\(w\.num\)\}/);
  assert.match(preview, /PREVIEW_DESCRIPTION_BY_NUM/);
  for (const num of ['001', '002', '003']) {
    assert.match(preview, new RegExp(`'${num}'`));
    await access(new URL(`../public/images/work-previews/${num}.png`, import.meta.url));
  }
});

test('Works preview matches the shared upward 0.3 second hover behavior', async () => {
  const filter = await read('src/components/WorksFilter.tsx');

  assert.match(filter, /bottom:calc\(100% \+ 12px\)/);
  assert.match(filter, /width:100%/);
  assert.match(filter, /min-height:270px/);
  assert.match(filter, /transform:translateY\(10px\)/);
  assert.match(filter, /opacity \.3s ease/);
  assert.match(filter, /transform \.3s/);
  assert.match(filter, /transition-delay:\.7s,\.7s,\.7s/);
  assert.match(filter, /focus-within/);
});
