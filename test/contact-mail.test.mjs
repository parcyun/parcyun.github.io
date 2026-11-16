import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const footer = await readFile(new URL('../public/ps-footer.js', import.meta.url), 'utf8');

test('coffee mail opens an inline composer instead of an external mail app', () => {
  assert.doesNotMatch(footer, /mailto:/);
  assert.match(footer, /id="coffee-compose"/);
  assert.match(footer, /name="email" type="email"/);
  assert.match(footer, /name="subject" maxlength="120" required/);
  assert.match(footer, /name="message" rows="5" maxlength="5000" required/);
  assert.match(footer, /coffeeForm\.hidden = false/);
  assert.match(footer, /getElementById\('coffee-sender'\)\.focus\(\)/);
});

test('composer retains drafts on failure and only reports server-confirmed sends', () => {
  assert.match(footer, /coffeeSending \|\| !coffeeForm\.reportValidity\(\)/);
  assert.match(footer, /if \(!endpoint\)/);
  assert.match(footer, /!response\.ok \|\| result\.sent !== true/);
  assert.match(footer, /AbortSignal\.timeout\(25000\)/);
  assert.match(footer, /crypto\.randomUUID/);
  assert.match(footer, /입력 내용은 그대로 유지/);
  assert.match(footer, /prefers-reduced-motion:reduce/);
});
