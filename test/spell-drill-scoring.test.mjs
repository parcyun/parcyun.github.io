import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const scoringSource = await readFile(new URL('../public/spell-drill/scoring.js', import.meta.url), 'utf8');
const pageSource = () => readFile(new URL('../public/spell-drill/index.html', import.meta.url), 'utf8');

function loadScoring() {
  const context = { window: {} };
  vm.runInNewContext(scoringSource, context);
  return context.window.SpellScoring;
}

test('combo multiplier advances every three and caps at five', () => {
  const { comboMultiplier } = loadScoring();
  assert.deepEqual([0,2,3,5,6,8,9,11,12,14,15,40].map(comboMultiplier), [1,1,1.5,1.5,2,2,3,3,4,4,5,5]);
});

test('pass penalty increases by ten points on each pass', () => {
  const { passPenalty } = loadScoring();
  assert.deepEqual([1,2,3,4,5,6,7,8].map(passPenalty), [10,20,30,40,50,60,70,80]);
});

test('a repeated pass is ignored until the next question unlocks', () => {
  const { takePass } = loadScoring();
  const state = { locked: false, passCount: 0, score: 100 };

  assert.equal(takePass(state), 10);
  assert.equal(takePass(state), null);
  assert.equal(state.passCount, 1);
  assert.equal(state.locked, true);
  assert.equal(state.score, 90);

  state.locked = false;
  assert.equal(takePass(state), 20);
  assert.equal(state.passCount, 2);
  assert.equal(state.score, 70);
});

test('pass deduction and displayed amount cannot exceed the remaining score', () => {
  const { takePass } = loadScoring();
  const state = { locked: false, passCount: 0, score: 5 };

  assert.equal(takePass(state), 5);
  assert.equal(state.score, 0);

  state.locked = false;
  assert.equal(takePass(state), 0);
  assert.equal(state.score, 0);
});

test('wrong answer penalty increases by ten points each time', () => {
  const { wrongAnswerPenalty } = loadScoring();
  assert.deepEqual([1,2,3,4,5].map(wrongAnswerPenalty), [10,20,30,40,50]);
});

test('wrong answers accumulate by streak and reset after a correct answer', () => {
  const { takeWrongAnswer, resetWrongAnswerStreak } = loadScoring();
  const state = { wrongCount: 0, score: 100 };

  assert.equal(takeWrongAnswer(state), 10);
  assert.equal(takeWrongAnswer(state), 20);
  assert.equal(state.score, 70);

  resetWrongAnswerStreak(state);
  assert.equal(state.wrongCount, 0);
  assert.equal(takeWrongAnswer(state), 10);
  assert.equal(state.score, 60);
});

test('wrong answer deduction and displayed amount cannot exceed the remaining score', () => {
  const { takeWrongAnswer } = loadScoring();
  const state = { wrongCount: 0, score: 5 };

  assert.equal(takeWrongAnswer(state), 5);
  assert.equal(state.score, 0);
  assert.equal(takeWrongAnswer(state), 0);
  assert.equal(state.score, 0);
});

test('spell drill applies scoring helpers and magnitude effects without explaining hidden rules', async () => {
  const page = await pageSource();
  assert.match(page, /SpellScoring\.comboMultiplier\(state\.combo\)/);
  assert.match(page, /SpellScoring\.takePass\(state\)/);
  assert.match(page, /pointPop\(penalty \? '-'\+penalty : '0',true,penalty\)/);
  assert.match(page, /scoreEffect\(gain, false\)/);
  assert.match(page, /if\(penalty>0\)scoreEffect\(penalty, true\)/);
  assert.match(page, /wrongCount:0/);
  assert.match(page, /wrongCount:0,correctCount/);
  assert.match(page, /SpellScoring\.takeWrongAnswer\(state\)/);
  assert.match(page, /SpellScoring\.resetWrongAnswerStreak\(state\)/);
  assert.match(page, /pointPop\(penalty \? '-'\+penalty : '0',true,penalty\)/);
  assert.match(page, /function scoreEffectOrigin\(\)/);
  assert.match(page, /rect\.bottom\+18/);
  assert.match(page, /ring\.style\.left=origin\.x\+'px'/);
  assert.match(page, /el\.style\.top=origin\.y\+'px'/);
  assert.match(page, /offset:\.24/);
  assert.match(page, /duration:354\+power\*91/);
  assert.match(page, /duration:216\+power\*200/);
  assert.match(page, /duration:179\+power\*216/);
  assert.match(page, /cubic-bezier\(\.6,0,1,\.45\)/);
  assert.doesNotMatch(page, /\.point-pop\{[^}]*left:50%;top:50%/);
  assert.match(page, /fontSize=.*power/);
  assert.doesNotMatch(page, /라이트닝[^<\n]*(설명|조건|기준)/);
  assert.doesNotMatch(page, /패스[^<\n]*(두 배|2배|감점 규칙)/);
});
