const EVENTS = {
  DRAW: 'draw',
  MOVE: 'move',
  ATTACK: 'attack',
  DAMAGE: 'damage',
  RECOVER: 'recover',
  SUMMONING: 'summoning',
  SUMMONED: 'summoned',
  SPSUMMONING: 'spsummoning',
  SPSUMMONED: 'spsummoned',
  FLIP: 'flip',
  LP_UPDATE: 'lpUpdate',
  CHAIN: 'chain',
  CHAIN_SOLVING: 'chainSolving',
  CHAIN_SOLVED: 'chainSolved',
  POS_CHANGE: 'posChange',
  WAITING: 'waiting',
  REVEAL: 'reveal',
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export { EVENTS }

export class VisualEventQueue {
  constructor(options = {}) {
    this.queue = []
    this.processing = false
    this.speed = options.speed ?? 1
    this.paused = false
    this.onEventStart = options.onEventStart ?? null
    this.onDrain = options.onDrain ?? null
    this.baseDelay = options.baseDelay ?? 350
    this.minDelay = options.minDelay ?? 80
  }

  get delay() {
    if (this.speed <= 0) return 0
    return Math.max(this.minDelay, Math.round(this.baseDelay / this.speed))
  }

  setSpeed(speed) {
    this.speed = speed
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    this.tick()
  }

  clear() {
    this.queue = []
  }

  push(type, data = {}) {
    this.queue.push({ type, data })
    this.tick()
  }

  async tick() {
    if (this.processing || this.paused || this.queue.length === 0) return
    this.processing = true
    const event = this.queue.shift()
    this.onEventStart?.(event)
    if (this.delay > 0) {
      await sleep(this.delay)
    }
    this.processing = false
    if (this.queue.length > 0) {
      this.tick()
    } else {
      this.onDrain?.()
    }
  }
}
