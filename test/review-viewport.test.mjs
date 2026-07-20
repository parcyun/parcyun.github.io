import assert from 'node:assert/strict';
import test from 'node:test';

await import('../public/review-viewport.js');
const viewport = globalThis.PSReviewViewport || {};

test('review viewport is unrestricted through eight reviews', () => {
  assert.equal(viewport.maxHeight(Array(8).fill(100)), null);
});

test('review viewport caps at ten cards and creates scrollable fade space from the ninth review', () => {
  for (const count of [9, 10, 11]) {
    const heights = Array(count).fill(100);
    const maxHeight = viewport.maxHeight(heights);
    assert.equal(typeof maxHeight, 'number');
    assert.ok(maxHeight < Math.min(count, 10) * 100, `${count} reviews should leave a visual scroll hint`);
    assert.ok(maxHeight <= 10 * 100, `${count} reviews must not exceed ten-card height`);

    const start = viewport.fadeState(count, 0, maxHeight, count * 100);
    assert.deepEqual(start, { hasOverflow: true, isAtEnd: false });
    const end = viewport.fadeState(count, count * 100 - maxHeight, maxHeight, count * 100);
    assert.deepEqual(end, { hasOverflow: true, isAtEnd: true });
  }
});

test('review viewport never shows a false fade without overflow', () => {
  assert.deepEqual(viewport.fadeState(9, 0, 900, 900), { hasOverflow: false, isAtEnd: true });
});
