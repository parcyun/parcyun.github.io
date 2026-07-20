(function attachSpellScoring(global) {
  function comboMultiplier(combo) {
    if (combo >= 15) return 5;
    if (combo >= 12) return 4;
    if (combo >= 9) return 3;
    if (combo >= 6) return 2;
    if (combo >= 3) return 1.5;
    return 1;
  }

  function passPenalty(passCount) {
    const count = Math.max(1, Math.floor(Number(passCount) || 1));
    return 10 * (2 ** (count - 1));
  }

  global.SpellScoring = Object.freeze({ comboMultiplier, passPenalty });
})(typeof window === 'undefined' ? globalThis : window);
