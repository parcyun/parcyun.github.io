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

test('pass penalty doubles on every pass', () => {
  const { passPenalty } = loadScoring();
  assert.deepEqual([1,2,3,4,5].map(passPenalty), [10,20,40,80,160]);
});

test('wrong answer penalty increases by ten points each time', () => {
  const { wrongAnswerPenalty } = loadScoring();
  assert.deepEqual([1,2,3,4,5].map(wrongAnswerPenalty), [10,20,30,40,50]);
});

test('spell drill applies scoring helpers and magnitude effects without explaining hidden rules', async () => {
  const page = await pageSource();
  assert.match(page, /SpellScoring\.comboMultiplier\(state\.combo\)/);
  assert.match(page, /SpellScoring\.passPenalty\(state\.passCount\)/);
  assert.match(page, /scoreEffect\(gain, false\)/);
  assert.match(page, /scoreEffect\(penalty, true\)/);
  assert.match(page, /wrongCount:0/);
  assert.match(page, /wrongCount:0,correctCount/);
  assert.match(page, /state\.wrongCount\+\+/);
  assert.match(page, /SpellScoring\.wrongAnswerPenalty\(state\.wrongCount\)/);
  assert.match(page, /pointPop\('-'\+penalty,true,penalty\)/);
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
