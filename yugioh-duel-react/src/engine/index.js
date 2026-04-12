// ═══════════════════════════════════════════════════════════
// engine/index.js — Factory da engine ativa
//
// Para voltar ao LocalEngine (mock offline):
//   import { LocalEngine } from './LocalEngine'
//   export const engine = new LocalEngine()
// ═══════════════════════════════════════════════════════════

import { WebSocketEngine } from './WebSocketEngine'

export const engine = new WebSocketEngine()
