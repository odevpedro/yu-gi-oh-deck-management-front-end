// ═══════════════════════════════════════════════════════════
// DuelEngineAdapter.js — Contrato da engine de duelo
//
// Qualquer engine (local ou WebSocket) deve implementar esta
// interface. Os componentes React nunca importam a engine
// diretamente — consomem via DuelContext.
//
// Troca de engine: mudar apenas createEngine() em index.js.
// Nenhum componente muda.
// ═══════════════════════════════════════════════════════════

/**
 * gameState — snapshot imutável do estado atual
 * {
 *   selectedCard: { card, location, index?, zoneKey?, position? }
 *   phase:        { id, label }
 *   flags:        { normalSummonedThisTurn, positionChangedThisTurn }
 *   occupiedZones: { [zoneKey]: SlotData }
 *   handCards:    Card[]
 *   playerLP:     number
 *   opponentLP:   number
 *   turn:         number
 * }
 *
 * mutations — setters React passados pela DuelContext
 * {
 *   setOccupiedZones, setHandCards, setInstruction,
 *   setSelectedCard, setActiveAction, setAttackingZone,
 *   setNormalSummoned, setPositionChanged,
 *   sendToGraveyard, dealDamage,
 *   clearSelection, clearZoneHighlights,
 *   highlightSummonZones, highlightSpellZones, highlightAttackTargets,
 *   imageToDataURL,
 * }
 */

export class DuelEngineAdapter {
  /**
   * Retorna as ações disponíveis para a carta selecionada.
   * Substitui resolveActions() chamado nos componentes.
   *
   * @param {object} gameState
   * @returns {Action[]}  [{ id, label, icon, color, available, reason }]
   */
  // eslint-disable-next-line no-unused-vars
  getAvailableActions(gameState) {
    throw new Error('DuelEngineAdapter: getAvailableActions() não implementado')
  }

  /**
   * Executa uma ação declarada pelo jogador.
   * Pode ser síncrono ou iniciar um fluxo assíncrono
   * (ex: highlight de zonas e aguardar zona-alvo).
   *
   * @param {string} actionId
   * @param {object} gameState
   * @param {object} mutations
   */
  // eslint-disable-next-line no-unused-vars
  requestAction(actionId, gameState, mutations) {
    throw new Error('DuelEngineAdapter: requestAction() não implementado')
  }

  /**
   * Resolve uma batalha entre dois monstros (ou ataque direto).
   * Chamado quando o jogador clica em uma zona do oponente
   * durante a Battle Phase com um atacante declarado.
   *
   * @param {string}  attackingZone  zoneKey do atacante
   * @param {string}  targetZone     zoneKey do alvo (null = ataque direto)
   * @param {object}  gameState
   * @param {object}  mutations
   * @param {object}  fxCallbacks    { attackFX, lpDamageFX }  — animações
   */
  // eslint-disable-next-line no-unused-vars
  handleAttackTarget(attackingZone, targetZone, gameState, mutations, fxCallbacks) {
    throw new Error('DuelEngineAdapter: handleAttackTarget() não implementado')
  }
}
