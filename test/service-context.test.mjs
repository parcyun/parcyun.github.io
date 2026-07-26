import assert from 'node:assert/strict';
import test from 'node:test';

await import('../public/service-context.js');
const { resolveServiceKey, sourcePathForFeedback } = globalThis.PSServiceContext || {};

test('service context recognizes only exact public routes', () => {
  assert.equal(resolveServiceKey('/', ''), 'home');
  assert.equal(resolveServiceKey('/atlas-gears/', ''), 'atlas-gears');
  assert.equal(resolveServiceKey('/world-map/', ''), 'geoweb');
  assert.equal(resolveServiceKey('/spell-drill/', ''), 'spell-drill');
  assert.equal(resolveServiceKey('/korean-spell-drill-parcyun/', ''), 'spell-drill');

  for (const path of ['/academica/', '/works/', '/my-atlas-notes/', '/spell-checker/', '/world-map-copy/']) {
    assert.equal(resolveServiceKey(path, ''), 'other', path);
  }
});

test('service query is honored only on the reviews route', () => {
  assert.equal(resolveServiceKey('/reviews/', '?service=spell-drill'), 'spell-drill');
  assert.equal(resolveServiceKey('/reviews', '?service=atlas-gears'), 'atlas-gears');
  assert.equal(resolveServiceKey('/reviews/', '?service=unclassified'), 'other');
  assert.equal(resolveServiceKey('/', '?service=spell-drill'), 'home');
  assert.equal(resolveServiceKey('/atlas-gears/', '?service=home'), 'atlas-gears');
  assert.equal(resolveServiceKey('/unmatched/', '?service=geoweb'), 'other');
});

test('feedback source keeps a validated reviews service context and discards unrelated query data', () => {
  assert.equal(sourcePathForFeedback('/reviews/', '?service=spell-drill&utm_source=test'), '/reviews/?service=spell-drill');
  assert.equal(sourcePathForFeedback('/reviews/', '?service=not-valid'), '/reviews/');
  assert.equal(sourcePathForFeedback('/atlas-gears/', '?service=home'), '/atlas-gears/');
});
