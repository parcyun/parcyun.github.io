import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = () => readFile(new URL('../public/korean-spell-drill-parcyun/index.html', import.meta.url), 'utf8');

test('Spell Drill opens with a developer story and versioned update history', async () => {
  const page = await source();
  assert.match(page, /id="spell-onboarding"/);
  assert.match(page, /안녕하세요, 스펠드릴을 만든 개발자예요/);
  assert.match(page, /들리는 문장|틀린 문장/);
  assert.match(page, /정확한 문장/);
  assert.match(page, /콤보/);
  assert.match(page, /id="spell-onboarding-start"[^>]*>시작하기</);
  assert.match(page, /id="spell-update-toggle"[^>]*>업데이트 내역 보기/);
  assert.match(page, /id="spell-update-history"/);
  assert.match(page, /2026\.07/);
  assert.match(page, /parcyun:spell-drill:update/);
  assert.match(page, /spellOnboarding\.hidden=false;/);
  assert.doesNotMatch(page, /if\(localStorage\.getItem\(SPELL_UPDATE_KEY\)!==SPELL_UPDATE_VERSION\)spellOnboarding\.hidden=false/);
  assert.match(page, /classList\.toggle\('open'\)/);
});

test('Spell Drill onboarding dismissal does not start a game or audio', async () => {
  const page = await source();
  const handler = page.match(/spellOnboardingStart\.addEventListener\('click',\(\)=>\{([^}]+)\}\)/)?.[1] || '';
  assert.match(handler, /spellOnboarding\.hidden=true/);
  assert.doesNotMatch(handler, /startGame|ensureAudio/);
});
