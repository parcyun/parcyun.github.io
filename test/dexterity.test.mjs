import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

test('home exposes a direct dexterity entry', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /href="\/dexterity\/"[^>]*>parcyun dexterity/);
});

test('gallery leads to the published cafe article and includes shared page tools', () => {
  assert.ok(existsSync('dist/dexterity/index.html'), 'gallery route must be built');
  const html = readFileSync('dist/dexterity/index.html', 'utf8');
  assert.match(html, /href="\/dexterity\/hyangmisa\/"/);
  assert.match(html, /visitor-counter/);
  assert.doesNotMatch(html, /dexterity-comments|noindex/);
  assert.match(html, /카페/);
});

test('article publishes nine safe assets with canonical and internal-only discussion', () => {
  assert.ok(existsSync('dist/dexterity/hyangmisa/index.html'), 'article route must be built');
  const html = readFileSync('dist/dexterity/hyangmisa/index.html', 'utf8');
  const images = [...html.matchAll(/<img[^>]+src="([^"]+)"/g)];
  assert.equal(images.length, 9);
  for (const [,src] of images) assert.ok(existsSync('dist'+src), src);
  assert.match(html, /rel="canonical"[^>]+hyangmisa|hyangmisa[^>]+rel="canonical"/);
  assert.match(html, /visitor-counter\.js/);
  assert.match(html, /dexterity-actions/);
  assert.doesNotMatch(html, /dexterity-comments|comment-draft|github-comment-dialog/);
  assert.doesNotMatch(html, /noindex|검토용 초안|127\.0\.0\.1/);
});
