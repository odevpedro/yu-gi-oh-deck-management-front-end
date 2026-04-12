// ═══════════════════════════════════════════════════════════
// sfx.js — Sons sintéticos via Web Audio API (sem assets)
// ═══════════════════════════════════════════════════════════

let _ctx = null
function ctx() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function gain(val, at = 0) {
  const g = ctx().createGain()
  g.gain.setValueAtTime(val, ctx().currentTime + at)
  return g
}

function osc(type, freq, start, dur, vol = 0.18, dest = ctx().destination) {
  const o = ctx().createOscillator()
  const g = ctx().createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, ctx().currentTime + start)
  g.gain.setValueAtTime(0, ctx().currentTime + start)
  g.gain.linearRampToValueAtTime(vol, ctx().currentTime + start + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx().currentTime + start + dur)
  o.connect(g); g.connect(dest)
  o.start(ctx().currentTime + start)
  o.stop(ctx().currentTime + start + dur + 0.05)
}

function noise(start, dur, vol = 0.12, highpass = 800) {
  const buf = ctx().createBuffer(1, ctx().sampleRate * dur, ctx().sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = ctx().createBufferSource()
  src.buffer = buf
  const hp = ctx().createBiquadFilter()
  hp.type = 'highpass'; hp.frequency.value = highpass
  const g = ctx().createGain()
  g.gain.setValueAtTime(vol, ctx().currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx().currentTime + start + dur)
  src.connect(hp); hp.connect(g); g.connect(ctx().destination)
  src.start(ctx().currentTime + start)
  src.stop(ctx().currentTime + start + dur)
}

// ── Sound definitions ─────────────────────────────────────

export function sfxSummon() {
  try {
    // Rising whoosh + thud
    osc('sine',   200, 0,    0.08, 0.12)
    osc('sine',   600, 0.02, 0.12, 0.15)
    osc('sine',  1200, 0.04, 0.10, 0.10)
    osc('sine',  2400, 0.06, 0.08, 0.08)
    osc('square', 80,  0.12, 0.18, 0.20)
    noise(0, 0.14, 0.08, 400)
  } catch(e) {}
}

export function sfxSpecialSummon() {
  try {
    // More dramatic, longer chord
    ;[300, 450, 600, 900].forEach((f, i) => osc('sine', f, i*0.03, 0.4, 0.12))
    osc('square', 60, 0.15, 0.3, 0.18)
    noise(0, 0.2, 0.10, 200)
    osc('sine', 2000, 0.35, 0.15, 0.08)
  } catch(e) {}
}

export function sfxAttack() {
  try {
    // Sharp swoosh
    const o = ctx().createOscillator()
    const g = ctx().createGain()
    o.type = 'sawtooth'
    o.frequency.setValueAtTime(400, ctx().currentTime)
    o.frequency.exponentialRampToValueAtTime(80, ctx().currentTime + 0.18)
    g.gain.setValueAtTime(0.22, ctx().currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx().currentTime + 0.22)
    o.connect(g); g.connect(ctx().destination)
    o.start(); o.stop(ctx().currentTime + 0.25)
    noise(0, 0.12, 0.14, 1200)
  } catch(e) {}
}

export function sfxDestroy() {
  try {
    // Explosion crunch
    noise(0, 0.35, 0.22, 100)
    noise(0, 0.18, 0.15, 2000)
    osc('square', 55, 0, 0.25, 0.25)
    osc('sine',   40, 0.05, 0.2, 0.18)
  } catch(e) {}
}

export function sfxDamage() {
  try {
    // Low impact thud
    osc('sine',   60,  0,    0.30, 0.28)
    osc('sine',  120,  0,    0.15, 0.18)
    osc('square', 45,  0.02, 0.22, 0.16)
    noise(0, 0.18, 0.14, 150)
  } catch(e) {}
}

export function sfxVictory() {
  try {
    // Ascending fanfare
    const melody = [523, 659, 784, 1047]
    melody.forEach((f, i) => osc('sine', f, i * 0.12, 0.35, 0.18))
    osc('sine', 1047, 0.5, 0.6, 0.22)
    osc('sine',  784, 0.5, 0.6, 0.16)
  } catch(e) {}
}

export function sfxDefeat() {
  try {
    // Descending minor
    const melody = [392, 349, 294, 220]
    melody.forEach((f, i) => osc('sine', f, i * 0.18, 0.4, 0.16))
    osc('sine', 220, 0.7, 0.5, 0.18)
  } catch(e) {}
}

export function sfxCardSet() {
  try {
    // Soft thud
    osc('sine', 180, 0, 0.12, 0.14)
    noise(0, 0.08, 0.07, 600)
  } catch(e) {}
}

export function sfxFlip() {
  try {
    // Snap + shimmer
    noise(0, 0.06, 0.15, 2000)
    osc('sine', 1800, 0.04, 0.12, 0.10)
    osc('sine',  900, 0.06, 0.10, 0.08)
  } catch(e) {}
}