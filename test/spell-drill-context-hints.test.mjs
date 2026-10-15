import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const helperSource = await readFile(new URL('../public/spell-drill/context-hints.js', import.meta.url), 'utf8');
const pageSource = await readFile(new URL('../public/spell-drill/index.html', import.meta.url), 'utf8');

function loadHelpers() {
  const context = { window: {} };
  vm.runInNewContext(helperSource, context);
  return context.window.SpellContextHints;
}

function loadKoreanQuestions() {
  const start = pageSource.indexOf('const SENTENCES = ') + 'const SENTENCES = '.length;
  const end = pageSource.indexOf('\n\n/* ────────────────────────── audio');
  const source = pageSource.slice(start, end).replace(/;\s*$/, '');
  const sentences = vm.runInNewContext(`(${source})`);
  return Object.values(sentences.ko).flat();
}

test('every Korean question with a learning note has a separate sentence-intent context', () => {
  const { contextFor } = loadHelpers();
  const contextual = loadKoreanQuestions().filter((question) => question.note);

  assert.equal(contextual.length, 92);
  for (const question of contextual) {
    const context = contextFor(question);
    assert.ok(context, `missing context: ${question.wrong}`);
    assert.doesNotMatch(context, /(?:와는|와 달|과는|과 달|구별|고쳐|써요|적어요|표준|기본형)/, `hint leaked into context: ${question.wrong}`);
  }
});

test('ambiguous 가르켰다 prompt explains intended pointing before revealing the distinction', () => {
  const { contextFor, hintFor } = loadHelpers();
  const question = loadKoreanQuestions().find(({ wrong }) => wrong === '내가 그를 가르켰다.');

  assert.equal(contextFor(question), '말하는 사람이 손으로 그 사람을 지목한 상황입니다.');
  assert.match(hintFor(question), /가리키다/);
  assert.match(hintFor(question), /가르치다/);
  assert.doesNotMatch(contextFor(question), /가리키다|가르치다/);
});

test('learning notes are revealed as hints while ordinary questions keep their original hint', () => {
  const { hintFor } = loadHelpers();
  const questions = loadKoreanQuestions();
  const confusing = questions.find(({ wrong }) => wrong === '친구가 그러는데 민수가 오늘 아프데.');
  const ordinary = questions.find(({ wrong }) => wrong === '왠일로 일찍 일어났니?');

  assert.equal(hintFor(confusing), confusing.note);
  assert.equal(hintFor(ordinary), ordinary.hint);
});

test('the page renders context and hint through the dedicated helper', () => {
  assert.match(pageSource, /SpellContextHints\.contextFor\(q\)/);
  assert.match(pageSource, /SpellContextHints\.hintFor\(state\.current\)/);
});
