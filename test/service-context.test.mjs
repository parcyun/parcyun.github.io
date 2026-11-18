import assert from 'node:assert/strict';
import test from 'node:test';

await import('../public/service-context.js');
const { resolveServiceKey, resolveViewServiceKey, sourcePathForFeedback } = globalThis.PSServiceContext || {};

test('service context recognizes only exact public routes', () => {
  assert.equal(resolveServiceKey('/', ''), 'home');
  assert.equal(resolveServiceKey('/atlas-gears/', ''), 'atlas-gears');
  assert.equal(resolveServiceKey('/world-map/', ''), 'geoweb');
  assert.equal(resolveServiceKey('/spell-drill/', ''), 'spell-drill');
  assert.equal(resolveServiceKey('/korean-spell-drill-parcyun/', ''), 'spell-drill');
  assert.equal(resolveServiceKey('/works/', ''), 'works');
  assert.equal(resolveServiceKey('/works/002-i-am-serif/', ''), 'works');

  for (const path of ['/academica/', '/my-atlas-notes/', '/spell-checker/', '/world-map-copy/']) {
    assert.equal(resolveServiceKey(path, ''), 'other', path);
  }
});

test('works keeps review and feedback discovery inside the works service', () => {
  assert.equal(resolveViewServiceKey('/works/', ''), 'works');
  assert.equal(resolveViewServiceKey('/works/002-i-am-serif/', ''), 'works');
  assert.equal(resolveServiceKey('/reviews/', '?service=works'), 'works');
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

const { contactSubjectPrefix, contactSubject } = globalThis.PSServiceContext;
test('Atlas contact subjects identify the route without changing general inquiries', () => {
  for (const path of ['/atlas-gears', '/atlas-gears/', '/atlas-gears/?x=1']) {
    assert.equal(contactSubjectPrefix(path), '[Atlas Gears] ');
    assert.equal(contactSubject(path, '  hello  '), '[Atlas Gears] hello');
    assert.equal(contactSubject(path, '[Atlas Gears] hello'), '[Atlas Gears] hello');
  }
  for (const path of ['/', '/world-map/', '/atlas-gears-copy/', '/reviews/']) {
    assert.equal(contactSubjectPrefix(path), '');
    assert.equal(contactSubject(path, 'hello'), 'hello');
  }
  const limit = 120 - contactSubjectPrefix('/atlas-gears/').length;
  assert.equal(contactSubject('/atlas-gears/', 'x'.repeat(limit)).length, 120);
});
