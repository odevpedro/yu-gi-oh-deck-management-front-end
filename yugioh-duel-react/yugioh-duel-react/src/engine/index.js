// ═══════════════════════════════════════════════════════════
// engine/index.js — Factory da engine ativa
//
// Para trocar de engine (ex: WebSocketEngine no futuro):
// mudar apenas esta linha. Nenhum componente React muda.
// ═══════════════════════════════════════════════════════════

import { LocalEngine } from './LocalEngine'

export const engine = new LocalEngine()
