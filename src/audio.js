// Synthèse sonore : bruit blanc filtré et oscillateurs, sans aucune dépendance de jeu.
let AC = null, noiseBuf = null;

export function audio() {
  if (AC) return AC;
  AC = new (window.AudioContext || window.webkitAudioContext)();
  noiseBuf = AC.createBuffer(1, AC.sampleRate * .5, AC.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return AC;
}

function noise(dur, freq, gain, type = 'lowpass') {
  const ac = audio(), s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ac.createGain(); g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
  s.connect(f); f.connect(g); g.connect(ac.destination); s.start(); s.stop(ac.currentTime + dur);
}

export function tone(f, dur, type = 'sine', gain = .15, slide = null) {
  const ac = audio(), o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, ac.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + dur);
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
  o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
}

export const sfx = {
  pick() { noise(.05, 3000, .16, 'highpass'); tone(880, .05, 'triangle', .05); },
  drop() { noise(.09, 900, .28); tone(120, .12, 'sine', .16, 60); },
  throwDice() { for (let i = 0; i < 5; i++) setTimeout(() => noise(.05, 1600 + Math.random() * 1400, .1, 'bandpass'), i * 45 + Math.random() * 30); },
  land() { noise(.05, 2400, .13, 'bandpass'); },
  shot() { noise(.09, 1800, .3, 'highpass'); tone(150, .14, 'square', .1, 60); },
  hitDie() { tone(760, .07, 'triangle', .09); },
  cancel() { tone(300, .09, 'sine', .09, 220); noise(.04, 1400, .09); },
  wound() { noise(.2, 600, .34); tone(85, .2, 'square', .08, 45); },
  save() { tone(520, .09, 'triangle', .09); noise(.05, 2600, .09, 'highpass'); },
  down() { tone(300, .5, 'sawtooth', .15, 60); noise(.35, 500, .18); },
  no() { tone(160, .12, 'square', .08, 120); },
  turn() { tone(392, .16, 'triangle', .09); setTimeout(() => tone(523, .22, 'triangle', .09), 120); },
};
