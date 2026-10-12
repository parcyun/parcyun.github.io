import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../public/spell-drill/questions.js', import.meta.url), 'utf8');

function loadQuestions() {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.SpellQuestions;
}

test('mixed questions retain their source difficulty without mutating the question bank', () => {
  const { withDifficulty } = loadQuestions();
  const easy = [{ wrong: 'e', correct: 'E' }];
  const medium = [{ wrong: 'm', correct: 'M' }];
  const hard = [{ wrong: 'h', correct: 'H' }];

  const mixed = [
    ...withDifficulty(easy, 'easy'),
    ...withDifficulty(medium, 'med'),
    ...withDifficulty(hard, 'hard')
  ];

  assert.deepEqual(mixed.map(({ difficulty }) => difficulty), ['easy', 'med', 'hard']);
  assert.equal(easy[0].difficulty, undefined);
  assert.notEqual(mixed[0], easy[0]);
});
