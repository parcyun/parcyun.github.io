import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('ACADEMICA and ATLAS cards share an image and summary hover preview', async () => {
  const [preview, lectures, activities] = await Promise.all([
    read('src/components/ResourceHoverPreview.tsx'),
    read('src/components/LectureShelf.tsx'),
    read('src/components/ActivityBrowser.tsx'),
  ]);

  assert.match(preview, /resource-hover-image/);
  assert.match(preview, /PREVIEW_DESCRIPTION_BY_ID/);
  assert.doesNotMatch(preview, /\/images\/og-card\.png/);
  assert.match(preview, /\/spell-drill\/og-cover\.png/);
  for (const id of ['academica', 'llm-fundamentals', 'agentic-ai', 'notion-onboarding', 'ai-edtech-tools', 'edubeige', 'math-volume', 'world-city-research', 'world-map', 'ai-class', 'kocomate', 'zoomit', 'snipaste']) {
    assert.match(preview, new RegExp(`/images/resource-previews/${id}\\.png`));
    await access(new URL(`../public/images/resource-previews/${id}.png`, import.meta.url));
  }
  for (const source of [lectures, activities]) {
    assert.match(source, /ResourceHoverPreview/);
    assert.match(source, /aria-describedby=\{resourcePreviewId\(r\.id\)\}/);
  }
});

test('hover preview waits for intent then opens upward in 0.3 seconds at card width', async () => {
  const [lectures, activities] = await Promise.all([
    read('src/components/LectureShelf.tsx'),
    read('src/components/ActivityBrowser.tsx'),
  ]);

  for (const source of [lectures, activities]) {
    assert.match(source, /bottom:calc\(100% \+ 12px\)/);
    assert.match(source, /width:100%/);
    assert.match(source, /min-height:2[35]0px/);
    assert.match(source, /transform:translateY\(10px\)/);
    assert.match(source, /opacity \.3s ease/);
    assert.match(source, /transform \.3s/);
    assert.match(source, /transition-delay:\.7s,\.7s,\.7s/);
    assert.match(source, /focus-within/);
  }
});
