import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/pages/works.astro', import.meta.url), 'utf8');

test('Works publishes the five Titan tools as descriptive external links', () => {
  assert.match(source, /개발을 도와주는 타이탄의 도구들/);
  for (const url of [
    'https://getdesign.md/',
    'https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me',
    'https://github.com/Q00/ouroboros/blob/main/README.ko.md',
    'https://astryx.atmeta.com/',
    'https://github.com/parcyun/pre-design',
  ]) {
    assert.match(source, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal((source.match(/class="titan-item"/g) || []).length, 5);
  assert.equal((source.match(/target="_blank" rel="noopener noreferrer"/g) || []).length >= 5, true);
});

test('Titan tools keep the existing cinematic hierarchy and responsive list layout', () => {
  assert.match(source, /\.titan-list\s*\{/);
  assert.match(source, /\.titan-link\s*\{/);
  assert.match(source, /@media \(max-width: 639px\)/);
  assert.match(source, /Tools of Titans/);
});
