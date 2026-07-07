import { advancePhase, createDuelClient, sendAction } from '../services/duelWebSocket'

export class WebSocketEngine {
  constructor({ duelId, token, onStateUpdate, onGameOver, onError }) {
    this.duelId = duelId
    this.client = createDuelClient({ duelId, token, onStateUpdate, onGameOver, onError })
  }

  action(action) {
    sendAction(this.client, { duelId: this.duelId, ...action })
  }

  nextPhase() {
    advancePhase(this.client, this.duelId)
  }

  disconnect() {
    this.client?.deactivate()
  }
}
