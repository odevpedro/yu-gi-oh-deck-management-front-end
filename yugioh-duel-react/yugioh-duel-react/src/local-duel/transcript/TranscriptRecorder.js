export class TranscriptRecorder {
  constructor() {
    this.events = []
    this.startedAt = null
    this.recording = false
  }

  start() {
    this.events = []
    this.startedAt = Date.now()
    this.recording = true
    this.record('system', 'recording_started', { timestamp: this.startedAt })
  }

  stop() {
    if (!this.recording) return
    this.recording = false
    this.record('system', 'recording_stopped', { duration: Date.now() - this.startedAt, totalEvents: this.events.length })
  }

  record(category, type, data = {}) {
    if (!this.recording) return
    this.events.push({
      t: Date.now() - this.startedAt,
      c: category,
      type,
      data,
    })
  }

  recordState(state) {
    this.record('state', 'snapshot', {
      turn: state.turn,
      turnPlayer: state.turnPlayer,
      phase: state.phase,
      lp: [...state.lp],
      deckCounts: [...state.deckCounts],
      localPlayer: state.localPlayer,
    })
  }

  recordPrompt(prompt) {
    if (!prompt) return
    const msg = prompt.type === 'game' ? prompt.message : null
    if (!msg) {
      this.record('prompt', prompt.type, {})
      return
    }
    const name = msg.constructor?.name?.replace(/^YGOProMsg/, '') || 'Unknown'
    this.record('prompt', name, {
      player: msg.player,
      cancelable: msg.cancelable,
      min: msg.min,
      max: msg.max,
      count: msg.count ?? msg.cards?.length ?? msg.options?.length ?? 0,
    })
  }

  recordResponse(type, payload) {
    this.record('response', type, {
      payloadLength: payload?.byteLength ?? payload?.length ?? 0,
    })
  }

  toJSON() {
    return JSON.stringify({ startedAt: this.startedAt, events: this.events }, null, 2)
  }

  download(filename = 'transcript.json') {
    const blob = new Blob([this.toJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}
