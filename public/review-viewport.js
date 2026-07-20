/* Pure review-list viewport calculations, shared by runtime and tests. */
(function (root) {
  var MAX_VISIBLE_CARDS = 10;
  var FADE_FROM_CARD_COUNT = 9;
  var MAX_PEEK_PX = 48;

  function maxHeight(cardHeights) {
    var heights = Array.isArray(cardHeights) ? cardHeights : [];
    if (heights.length < FADE_FROM_CARD_COUNT) return null;
    var visible = heights.slice(0, MAX_VISIBLE_CARDS);
    var total = visible.reduce(function (sum, height) {
      return sum + Math.max(0, Number(height) || 0);
    }, 0);
    var last = Math.max(0, Number(visible[visible.length - 1]) || 0);
    var peek = Math.min(MAX_PEEK_PX, last * 0.4);
    return Math.max(1, Math.ceil(total - peek));
  }

  function fadeState(cardCount, scrollTop, clientHeight, scrollHeight) {
    var hasOverflow = Number(cardCount) >= FADE_FROM_CARD_COUNT
      && Number(scrollHeight) > Number(clientHeight) + 1;
    var isAtEnd = !hasOverflow
      || Number(scrollTop) + Number(clientHeight) >= Number(scrollHeight) - 1;
    return { hasOverflow: hasOverflow, isAtEnd: isAtEnd };
  }

  root.PSReviewViewport = {
    maxHeight: maxHeight,
    fadeState: fadeState
  };
})(typeof window !== 'undefined' ? window : globalThis);
