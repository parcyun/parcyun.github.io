(function attachSpellTimerUI(global) {
  function render(timerElement, remaining) {
    timerElement.textContent = String(remaining);
    timerElement.classList.toggle('warn', remaining <= 15 && remaining > 5);
    timerElement.classList.toggle('danger', remaining <= 5);
  }

  function reset(timerElement, remaining) {
    timerElement.classList.remove('warn', 'danger');
    timerElement.textContent = String(remaining);
  }

  global.SpellTimerUI = Object.freeze({ render, reset });
})(typeof window === 'undefined' ? globalThis : window);
