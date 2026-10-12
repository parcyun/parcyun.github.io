(function attachSpellQuestions(global) {
  function withDifficulty(questions, difficulty) {
    return questions.map((question) => ({ ...question, difficulty }));
  }

  global.SpellQuestions = Object.freeze({ withDifficulty });
})(typeof window === 'undefined' ? globalThis : window);
