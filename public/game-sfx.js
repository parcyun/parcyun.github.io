(() => {
function correct(audioCtx){
  const now = audioCtx.currentTime;
  // C5 → E5 → G5 → C6 ascending arpeggio (쾌감 chord)
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i)=>{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain).connect(audioCtx.destination);
    const t = now + i * 0.05;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t);
    osc.stop(t + 0.45);
  });
  // sparkle high note
  const sp = audioCtx.createOscillator();
  const sg = audioCtx.createGain();
  sp.type = 'sine';
  sp.frequency.setValueAtTime(1568, now + 0.20); // G6
  sp.frequency.exponentialRampToValueAtTime(2637, now + 0.45); // E7
  sp.connect(sg).connect(audioCtx.destination);
  sg.gain.setValueAtTime(0, now + 0.20);
  sg.gain.linearRampToValueAtTime(0.10, now + 0.22);
  sg.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
  sp.start(now + 0.20);
  sp.stop(now + 0.55);
}
function wrong(audioCtx){
  const now = audioCtx.currentTime;
  // beep beep — two short low square pulses
  [0, 0.14].forEach(off=>{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 196; // G3
    osc.connect(gain).connect(audioCtx.destination);
    const t = now + off;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.005);
    gain.gain.setValueAtTime(0.12, t + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}
let context;
function prime() {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return null;
    context ??= new Audio();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  } catch { return null; }
}
function enabled() {
  try {
    return location.pathname.startsWith("/spell-drill")
      ? localStorage.getItem("parcyunSpellGame_sound_v2") !== "false"
      : localStorage.getItem("ps-geoweb-battle-music") !== "off";
  } catch { return true; }
}

function celebrate() {
  if (!enabled()) return;
  const audio = prime();
  if (!audio) return;
  const start = audio.currentTime + .015;
  const noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.1), audio.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  function burst(time, duration, frequency, volume) {
    const src = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    src.buffer = noise;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = .8;
    src.connect(filter).connect(gain).connect(audio.destination);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .016);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    src.start(time);
    src.stop(time + duration);
  }
  for (let i = 0; i < 10; i++) {
    const time = start + i * .038;
    for (const frequency of [1480 + i * 77, 2380 + i * 39]) {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = "triangle";
      tone.frequency.value = frequency;
      tone.connect(gain).connect(audio.destination);
      gain.gain.setValueAtTime(.042, time);
      gain.gain.exponentialRampToValueAtTime(.0001, time + .13);
      tone.start(time);
      tone.stop(time + .14);
    }
  }
  for (let i = 0; i < 22; i++) burst(start + .16 + i * .033 + Math.random() * .025, .095, 1250 + Math.random() * 1300, .13);
  for (let i = 0; i < 6; i++) {
    const time = start + .18 + i * .075;
    const voice = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(220 + i * 22, time);
    voice.frequency.linearRampToValueAtTime(326 + i * 25, time + .18);
    filter.type = "bandpass";
    filter.frequency.value = 720 + i * 90;
    voice.connect(filter).connect(gain).connect(audio.destination);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(.032, time + .12);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .38);
    voice.start(time);
    voice.stop(time + .39);
  }
}
window.psGameSfx = {
  prime,
  answer(ok, existing) {
    if (!enabled()) return;
    const audio = existing || prime();
    if (audio) (ok ? correct : wrong)(audio);
  },
  celebrate,
};
document.addEventListener("pointerdown", () => { if (enabled()) prime(); }, { capture: true, once: true });
})();
