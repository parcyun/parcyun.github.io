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
function makeNoise(audioCtx,dur){
  const n = Math.floor(audioCtx.sampleRate * dur);
  const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<n;i++) d[i] = Math.random()*2 - 1;
  return buf;
}
// LIGHTNING — bright crack (highpassed noise) + low rumbling boom
function playLightning(audioCtx){
  const now = audioCtx.currentTime;
  const src = audioCtx.createBufferSource(); src.buffer = makeNoise(audioCtx,0.5);
  const hp = audioCtx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=1100;
  const g = audioCtx.createGain();
  src.connect(hp).connect(g).connect(audioCtx.destination);
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
  src.start(now); src.stop(now + 0.5);
  const o = audioCtx.createOscillator(); const og = audioCtx.createGain();
  o.type='sine';
  o.frequency.setValueAtTime(130, now);
  o.frequency.exponentialRampToValueAtTime(42, now + 0.6);
  o.connect(og).connect(audioCtx.destination);
  og.gain.setValueAtTime(0.5, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  o.start(now); o.stop(now + 0.75);
}
// FAST — quick upward whoosh (bandpass noise sweep) + zip tone
function playFast(audioCtx){
  const now = audioCtx.currentTime;
  const src = audioCtx.createBufferSource(); src.buffer = makeNoise(audioCtx,0.35);
  const bp = audioCtx.createBiquadFilter(); bp.type='bandpass'; bp.Q.value=1.2;
  bp.frequency.setValueAtTime(400, now);
  bp.frequency.exponentialRampToValueAtTime(3600, now + 0.3);
  const g = audioCtx.createGain();
  src.connect(bp).connect(g).connect(audioCtx.destination);
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.32, now + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
  src.start(now); src.stop(now + 0.4);
  const o = audioCtx.createOscillator(); const og = audioCtx.createGain();
  o.type='sawtooth';
  o.frequency.setValueAtTime(320, now);
  o.frequency.exponentialRampToValueAtTime(1500, now + 0.18);
  o.connect(og).connect(audioCtx.destination);
  og.gain.setValueAtTime(0.11, now);
  og.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  o.start(now); o.stop(now + 0.25);
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
  const mix = audio.createDynamicsCompressor();
  mix.threshold.value = -13;
  mix.ratio.value = 5;
  mix.connect(audio.destination);
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
    src.connect(filter).connect(gain).connect(mix);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + .016);
    gain.gain.exponentialRampToValueAtTime(.0001, time + duration);
    src.start(time);
    src.stop(time + duration);
  }
  function bell(time, frequency, volume, decay) {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = "sine";
    tone.frequency.value = frequency;
    tone.connect(gain).connect(mix);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + .003);
    gain.gain.exponentialRampToValueAtTime(.0001, time + decay);
    tone.start(time);
    tone.stop(time + decay);
  }
  // A rising payout jingle resolves into a sustained major chord.
  [523,659,784,1047,784,1047,1319].forEach((hz,i)=>bell(start+i*.105,hz,.3,.32));
  [1047,1319,1568].forEach(hz=>bell(start+.79,hz,.23,.85));
  for (let i = 0; i < 24; i++) {
    const time = start + .42 + i * .05 + Math.random() * .022;
    const hz = 1450 + Math.random() * 560;
    bell(time,hz,.23,.19);
    bell(time,hz*1.69,.12,.12);
    burst(time,.04,3100,.37);
  }
  for (let i = 0; i < 75; i++) {
    const time = start + .85 + i * .023 + Math.random() * .05;
    burst(time,.09,980 + Math.random()*1400,.48);
    burst(time+.013,.065,2200,.25);
  }
  for (let i = 0; i < 14; i++) {
    const time = start + .82 + i * .055;
    const voice = audio.createOscillator();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    voice.type = "sawtooth";
    voice.frequency.setValueAtTime(190 + i * 13, time);
    voice.frequency.linearRampToValueAtTime(333 + i * 17, time + .31);
    filter.type = "bandpass";
    filter.frequency.value = 680 + i * 48;
    voice.connect(filter).connect(gain).connect(mix);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(.16, time + .15);
    gain.gain.exponentialRampToValueAtTime(.0001, time + .86);
    voice.start(time);
    voice.stop(time + .87);
  }
}
window.psGameSfx = {
  prime,
  answer(ok, existing, speedTag) {
    if (!enabled()) return;
    const audio = existing || prime();
    if (!audio) return;
    (ok ? correct : wrong)(audio);
    if (ok && speedTag === "LIGHTNING") playLightning(audio);
    if (ok && speedTag === "FAST") playFast(audio);
  },
  celebrate,
};
document.addEventListener("pointerdown", () => { if (enabled()) prime(); }, { capture: true, once: true });
})();
