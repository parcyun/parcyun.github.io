(() => {
  const host = document.querySelector('[data-studio-music]');
  if (!host || host.dataset.ready) return;
  host.dataset.ready = 'true';
  const tracks = [
    {title:'I love this Christmas city',src:'/audio/studio/i-love-this-christmas-city-v1.mp3'},
    {title:'Slow Side of Sunday',src:'/audio/studio/slow-side-of-sunday-v1.mp3'},
  ];
  const audio = host.querySelector('[data-music-audio]');
  const button = host.querySelector('[data-music-toggle]');
  const title = host.querySelector('[data-music-title]');
  const key = 'ps-studio-music-v1';
  let index = 0, resumeTime = 0, wantsPlay = false, action = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < tracks.length) {
      index = saved.index;
      resumeTime = Number.isFinite(saved.time) && saved.time > 0 ? saved.time : 0;
      wantsPlay = saved.playing === true;
    }
  } catch {}
  function save() {
    try { sessionStorage.setItem(key,JSON.stringify({index,time:audio.currentTime || resumeTime,playing:wantsPlay})); } catch {}
  }
  function render() {
    const playing = !audio.paused && !audio.ended;
    host.querySelector('[data-music-play]').hidden = playing;
    host.querySelector('[data-music-pause]').hidden = !playing;
    button.setAttribute('aria-pressed',String(playing));
    button.setAttribute('aria-label',playing ? '음악 일시정지' : '음악 재생');
    title.textContent = tracks[index].title;
    title.title = tracks[index].title;
  }
  function load() {
    audio.src = tracks[index].src;
    render();
  }
  async function play() {
    const request = ++action;
    wantsPlay = true;
    if (!audio.getAttribute('src')) load();
    try { await audio.play(); }
    catch { if (request !== action) return; wantsPlay = false; button.title = '재생 버튼을 눌러 다시 시도해 주세요.'; }
    if (request !== action) return;
    save(); render();
  }
  button.addEventListener('click',() => {
    if (wantsPlay) { action++; wantsPlay = false; audio.pause(); save(); render(); }
    else { button.removeAttribute('title'); play(); }
  });
  audio.addEventListener('loadedmetadata',() => {
    if (resumeTime && Number.isFinite(audio.duration)) audio.currentTime = Math.min(resumeTime,Math.max(0,audio.duration-0.1));
    resumeTime = 0;
  });
  audio.addEventListener('play',render);
  audio.addEventListener('pause',render);
  audio.addEventListener('error',() => { wantsPlay = false; button.title = '음원을 불러오지 못했습니다. 다시 재생해 주세요.'; audio.removeAttribute('src'); save(); render(); });
  audio.addEventListener('ended',() => {
    index = (index + 1) % tracks.length;
    resumeTime = 0; load(); play();
  });
  let savedAt = 0;
  audio.addEventListener('timeupdate',() => { if (Math.abs(audio.currentTime-savedAt) >= 5) { savedAt = audio.currentTime; save(); } });
  window.addEventListener('pagehide',() => { action++; save(); audio.pause(); });
  window.addEventListener('pageshow',event => { if (event.persisted && wantsPlay) play(); });
  render();
  if (wantsPlay) play();
})();
