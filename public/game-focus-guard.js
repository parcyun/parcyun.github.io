export function watchGameFocus({ pause, resume, finish, isActive = () => true, initialPaused = false, warned = false }) {
  let strikes = warned && !initialPaused ? 1 : 0;
  let away = false;
  let stopped = false;
  let blurTimer;
  let countdown;
  let dialog;

  function closeWarning() {
    clearTimeout(countdown);
    dialog?.remove();
    dialog = null;
  }

  function leave() {
    if (stopped || away || !isActive()) return;
    away = true;
    strikes++;
    if (strikes > 1) {
      closeWarning();
      finish();
      return;
    }
    pause();
    dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", "게임 일시 정지");
    dialog.style.cssText = "margin:auto;width:min(380px,calc(100vw - 32px));box-sizing:border-box;padding:24px;border:1px solid #646975;border-radius:20px;background:#171a21;color:white;text-align:center;font:700 16px/1.6 Pretendard,sans-serif;box-shadow:0 20px 70px #000a";
    dialog.innerHTML = '<style>dialog[aria-label="게임 일시 정지"]::backdrop{background:#0009;backdrop-filter:blur(8px)}</style><h2 style="font-size:21px;margin:0 0 16px">웁스! 이번 한 번만 봐드립니다^^</h2><button type="button" style="background:#ffb11a;color:#151006;border:0;border-radius:10px;padding:10px 18px;font:inherit;cursor:pointer">계속하기</button>';
    dialog.addEventListener("cancel", event => event.preventDefault());
    dialog.querySelector("button").onclick = () => {
      if (away || document.hidden || !document.hasFocus()) return;
      const heading = dialog.querySelector("h2");
      heading.setAttribute("role", "timer");
      dialog.querySelector("button").remove();
      let seconds = 3;
      function tick() {
        if (!dialog) return;
        if (!seconds) {
          closeWarning();
          resume();
          return;
        }
        heading.textContent = String(seconds--);
        countdown = setTimeout(tick, 1000);
      }
      tick();
    };
    document.body.append(dialog);
    dialog.showModal();
  }

  function blur() {
    clearTimeout(blurTimer);
    blurTimer = setTimeout(() => { if (!document.hasFocus()) leave(); }, 180);
  }
  function focus() {
    clearTimeout(blurTimer);
    if (!document.hidden) away = false;
  }
  function visibility() {
    if (document.hidden) leave();
    else if (document.hasFocus()) focus();
  }
  window.addEventListener("blur", blur);
  window.addEventListener("focus", focus);
  document.addEventListener("visibilitychange", visibility);
  if (initialPaused) { leave(); focus(); }
  return () => {
    stopped = true;
    clearTimeout(blurTimer);
    closeWarning();
    window.removeEventListener("blur", blur);
    window.removeEventListener("focus", focus);
    document.removeEventListener("visibilitychange", visibility);
  };
}
