// ═══════════════════════════════════════════════════════════
// logger.js — Sistema de log visual in-app
// Só ativo em desenvolvimento (import.meta.env.DEV)
// ═══════════════════════════════════════════════════════════

const MAX_ENTRIES = 80

const TAGS = {
  ATTACK:  { bg: '#7a1010', color: '#ff6644' },
  ENGINE:  { bg: '#0a2a10', color: '#44ff88' },
  STATE:   { bg: '#0a1a3a', color: '#44aaff' },
  FX:      { bg: '#2a1a00', color: '#ffcc44' },
  PHASE:   { bg: '#1a0a3a', color: '#cc88ff' },
  SUMMON:  { bg: '#1a1a00', color: '#ffff44' },
  ERROR:   { bg: '#3a0000', color: '#ff4444' },
  INFO:    { bg: '#111',    color: '#aaaaaa' },
}

class Logger {
  constructor() {
    this.entries = []
    this.listeners = new Set()
    this.enabled = typeof import.meta !== 'undefined' && import.meta.env?.DEV
  }

  log(tag, msg, data = null) {
    if (!this.enabled) return
    const entry = {
      id:   Date.now() + Math.random(),
      ts:   new Date().toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      tag:  tag.toUpperCase(),
      msg,
      data,
    }
    // Also send to DevTools console
    const style = TAGS[entry.tag] ?? TAGS.INFO
    console.log(`%c[${entry.tag}]%c ${msg}`, 
      `background:${style.bg};color:${style.color};padding:1px 4px;border-radius:2px;font-size:10px;font-weight:bold`,
      'color:#ccc;font-size:10px',
      data ?? ''
    )
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES)
    this.listeners.forEach(fn => fn(this.entries))
  }

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  clear() {
    this.entries = []
    this.listeners.forEach(fn => fn(this.entries))
  }

  // Shortcuts
  attack(msg, data)  { this.log('ATTACK', msg, data) }
  engine(msg, data)  { this.log('ENGINE', msg, data) }
  state(msg, data)   { this.log('STATE',  msg, data) }
  fx(msg, data)      { this.log('FX',     msg, data) }
  phase(msg, data)   { this.log('PHASE',  msg, data) }
  summon(msg, data)  { this.log('SUMMON', msg, data) }
  error(msg, data)   { this.log('ERROR',  msg, data) }
  info(msg, data)    { this.log('INFO',   msg, data) }
}

export const logger = new Logger()
export const TAGS_META = TAGS