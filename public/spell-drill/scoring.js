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
    return count * 10;
  }

  function takePass(state) {
    if (state.locked) return null;
    if (state.passesRemaining <= 0) return null;
    state.locked = true;
    state.passesRemaining -= 1;
    const score = Math.max(0, Number(state.score) || 0);
    const deduction = Math.min(score, passPenalty(state.passCount + 1));
    state.passCount = Math.max(0, Math.floor(Number(state.passCount) || 0)) + 1;
    state.score = score - deduction;
    return deduction;
  }

  function passesEarned(totalEarnedScore) {
    return Math.floor(Math.max(0, Number(totalEarnedScore) || 0) / 1000);
  }

  function addEarnedScore(state, gain) {
    const earned = Math.max(0, Number(state.earnedScore) || 0);
    const previousPasses = passesEarned(earned);
    state.earnedScore = earned + Math.max(0, Number(gain) || 0);
    const newPasses = passesEarned(state.earnedScore);
    state.passesRemaining = Math.max(0, Number(state.passesRemaining) || 0) + newPasses - previousPasses;
    return newPasses - previousPasses;
  }

  function takeWrongAnswer(state) {
    state.wrongCount = Math.max(0, Math.floor(Number(state.wrongCount) || 0)) + 1;
    const score = Math.max(0, Number(state.score) || 0);
    const deduction = Math.min(score, wrongAnswerPenalty(state.wrongCount));
    state.score = score - deduction;
    return deduction;
  }

  function resetWrongAnswerStreak(state) {
    state.wrongCount = 0;
  }

  function wrongAnswerPenalty(wrongCount) {
    const count = Math.max(1, Math.floor(Number(wrongCount) || 1));
    return count * 10;
  }

  global.SpellScoring = Object.freeze({ comboMultiplier, passPenalty, takePass, passesEarned, addEarnedScore, takeWrongAnswer, resetWrongAnswerStreak, wrongAnswerPenalty });
})(typeof window === 'undefined' ? globalThis : window);
