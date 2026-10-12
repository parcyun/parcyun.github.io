import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const source = await readFile(new URL('../public/spell-drill/timer-ui.js', import.meta.url), 'utf8');

function loadTimerUI() {
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.SpellTimerUI;
}

function timerElement(...initialClasses) {
  const classes = new Set(initialClasses);
  return {
    textContent: '',
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => {
        if (force) classes.add(name);
        else classes.delete(name);
        return force;
      },
      contains: (name) => classes.has(name)
    }
  };
}

test('restarting a timer clears the previous red warning and restores the neutral color', () => {
  const { reset } = loadTimerUI();
  const timer = timerElement('danger', 'warn');

  reset(timer, 60);

  assert.equal(timer.textContent, '60');
  assert.equal(timer.classList.contains('danger'), false);
  assert.equal(timer.classList.contains('warn'), false);
});

test('timer colors reflect the current remaining time instead of stale state', () => {
  const { render, reset } = loadTimerUI();
  const timer = timerElement('danger');

  render(timer, 15);
  assert.equal(timer.classList.contains('warn'), true);
  assert.equal(timer.classList.contains('danger'), false);

  render(timer, 5);
  assert.equal(timer.classList.contains('warn'), false);
  assert.equal(timer.classList.contains('danger'), true);

  reset(timer, 60);
  assert.equal(timer.textContent, '60');
  assert.equal(timer.classList.contains('danger'), false);
  assert.equal(timer.classList.contains('warn'), false);
});
