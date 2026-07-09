import { Howl } from 'howler'

const SOUND_ENABLED_KEY = 'duel_sound_enabled'

let enabled = localStorage.getItem(SOUND_ENABLED_KEY) !== 'false'

function createSound(src, volume = 0.4) {
  return new Howl({
    src: [src],
    volume,
    preload: true,
  })
}

const sounds = {
  draw: createSound('/sounds/draw.mp3'),
  summon: createSound('/sounds/summon.mp3'),
  specialSummon: createSound('/sounds/special-summon.mp3'),
  attack: createSound('/sounds/attack.mp3'),
  directAttack: createSound('/sounds/direct-attack.mp3'),
  activate: createSound('/sounds/activate.mp3'),
  setCard: createSound('/sounds/set.mp3'),
  destroy: createSound('/sounds/destroy.mp3'),
  victory: createSound('/sounds/victory.mp3'),
  defeat: createSound('/sounds/defeat.mp3'),
  chain: createSound('/sounds/chain.mp3'),
  phase: createSound('/sounds/phase.mp3'),
  button: createSound('/sounds/click.mp3', 0.2),
  chat: createSound('/sounds/chat.mp3', 0.15),
  flip: createSound('/sounds/flip.mp3'),
  damage: createSound('/sounds/damage.mp3'),
}

export function isSoundEnabled() {
  return enabled
}

export function setSoundEnabled(val) {
  enabled = val
  localStorage.setItem(SOUND_ENABLED_KEY, String(val))
}

export function toggleSound() {
  setSoundEnabled(!enabled)
  return enabled
}

export function playSound(name) {
  if (!enabled) return
  const s = sounds[name]
  if (s) s.play()
}

export function playDraw() { playSound('draw') }
export function playSummon() { playSound('summon') }
export function playSpecialSummon() { playSound('specialSummon') }
export function playAttack() { playSound('attack') }
export function playDirectAttack() { playSound('trapAttack') }
export function playActivate() { playSound('activate') }
export function playSet() { playSound('setCard') }
export function playDestroy() { playSound('destroy') }
export function playVictory() { playSound('victory') }
export function playDefeat() { playSound('defeat') }
export function playChain() { playSound('chain') }
export function playPhase() { playSound('phase') }
export function playButton() { playSound('button') }
export function playChat() { playSound('chat') }
export function playFlip() { playSound('flip') }
export function playDamage() { playSound('damage') }