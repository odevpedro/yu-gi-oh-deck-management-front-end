// ═══════════════════════════════════════════════════════════
// WebSocketEngine.js — Engine STOMP/WebSocket para o duel-service
//
// Implementa DuelEngineAdapter conectando via STOMP ao backend.
// Troca de engine: editar apenas engine/index.js.
//
// ── Endpoints esperados no duel-service ─────────────────
//   WebSocket:  ws://localhost:8084/ws
//
//   SUBSCRIBE:
//     /user/queue/duel/joined          → { duelId }  (após JOIN)
//     /user/queue/duel/{id}/state      → DuelStateDTO
//     /user/queue/duel/{id}/battle     → BattleResultDTO
//     /user/queue/duel/{id}/error      → { message }
//
//   PUBLISH:
//     /app/duel/join                   → JoinPayload
//     /app/duel/{id}/action            → ActionPayload
//     /app/duel/{id}/attack            → AttackPayload
//     /app/duel/{id}/nextPhase         → {}
//
// Se o seu servidor usar SockJS, troque brokerURL por webSocketFactory
// conforme documentado em https://stomp-js.github.io/guide/stompjs/
// ═══════════════════════════════════════════════════════════

import { Client }            from '@stomp/stompjs'
import { DuelEngineAdapter } from './DuelEngineAdapter'
import { resolveActions }    from '../utils/actionResolver'
import { attackArrow }       from '../fx/effects/AttackArrow'
import { destroyFX }         from '../utils/fx'
import { mapServerState, mapBattleResult } from './stateMapper'

// ── Configuração de endpoints ────────────────────────────
const WS_URL       = 'ws://localhost:8084/ws'

const DEST_JOIN      = '/app/duel/join'
const DEST_ACTION    = (id) => `/app/duel/${id}/action`
const DEST_ATTACK    = (id) => `/app/duel/${id}/attack`
const DEST_NEXT_PHASE= (id) => `/app/duel/${id}/nextPhase`

const SUB_JOINED  = '/user/queue/duel/joined'
const SUB_STATE   = (id) => `/user/queue/duel/${id}/state`
const SUB_BATTLE  = (id) => `/user/queue/duel/${id}/battle`
const SUB_ERROR   = (id) => `/user/queue/duel/${id}/error`

// Ações puramente de UI — não precisam de comunicação com servidor
const UI_ONLY = new Set(['cancel', 'view-details'])

export class WebSocketEngine extends DuelEngineAdapter {

  constructor() {
    super()
    this._client         = null
    this._duelId         = null
    this._connected      = false
    this._callbacks      = {}
    this._pendingBattle  = null   // { mutations } aguardando resultado do servidor
    this._subs           = []     // subscriptions STOMP ativas
  }

  // ── Conexão ──────────────────────────────────────────────

  /**
   * Conecta ao broker STOMP.
   * @param {object} callbacks
   *   onState(mappedState)  — servidor enviou novo estado de jogo
   *   onConnected(duelId?)  — STOMP conectado; duelId preenchido após JOIN
   *   onDisconnected()      — desconectado
   *   onError(message)      — erro do servidor ou WebSocket
   */
  connect(callbacks = {}) {
    this._callbacks = callbacks

    this._client = new Client({
      brokerURL:        WS_URL,
      reconnectDelay:   0,   // sem auto-reconnect — uma tentativa só (evita spam no console)
      onConnect:        () => this._onConnect(),
      onDisconnect:     () => this._onDisconnect(),
      onStompError:     (frame) => {
        console.error('[WS] STOMP error', frame.headers?.message)
        callbacks.onError?.('STOMP: ' + (frame.headers?.message ?? 'erro desconhecido'))
      },
      onWebSocketError: () => {
        // Browser sempre loga o erro nativo — não tem como suprimir.
        // Notificamos o app uma única vez e paramos de tentar.
        callbacks.onError?.('duel-service indisponível em ' + WS_URL)
        callbacks.onDisconnected?.()
      },
    })

    this._client.activate()
  }

  disconnect() {
    this._subs.forEach(s => { try { s.unsubscribe() } catch (_) {} })
    this._subs = []
    this._client?.deactivate()
    this._duelId    = null
    this._connected = false
  }

  // ── Gerenciamento de duelo ───────────────────────────────

  /**
   * Envia pedido de JOIN ao servidor.
   * Servidor responde em SUB_JOINED com { duelId }.
   * @param {object} payload  Ex.: { deckId: 'uuid', mode: 'ranked' }
   */
  joinDuel(payload = {}) {
    if (!this._connected) { console.warn('[WS] joinDuel: não conectado'); return }
    this._publish(DEST_JOIN, payload)
  }

  /**
   * Define o duelId manualmente (ex.: recebido via URL de lobby).
   * Chame antes de qualquer ação se o JOIN não for usado.
   */
  setDuelId(id) {
    this._duelId = id
    if (this._connected) this._subscribeGame()
  }

  /**
   * Envia nextPhase ao servidor (opcional — use se o servidor controla fases).
   */
  sendNextPhase() {
    if (!this._duelId) return
    this._publish(DEST_NEXT_PHASE(this._duelId), {})
  }

  // ── DuelEngineAdapter ────────────────────────────────────

  /** Resolução local de ações disponíveis (responsividade de UI). */
  getAvailableActions(gameState) {
    const { selectedCard, phase, flags, occupiedZones } = gameState
    return resolveActions(selectedCard, phase, flags, occupiedZones)
  }

  /**
   * Envia ação ao servidor.
   * O servidor valida e responde via SUB_STATE com estado atualizado.
   *
   * ActionPayload:
   * {
   *   actionId:     string,          // "normal-summon", "attack", etc.
   *   cardId:       number | null,
   *   location:     "hand" | "field",
   *   zoneKey:      string | null,
   *   handIndex:    number | null,
   *   phase:        string,
   * }
   */
  requestAction(actionId, gameState, _mutations) {
    if (UI_ONLY.has(actionId)) return
    if (!this._duelId) { console.warn('[WS] requestAction sem duelId'); return }

    const sel = gameState.selectedCard
    this._publish(DEST_ACTION(this._duelId), {
      actionId,
      cardId:    sel?.card?.id    ?? null,
      location:  sel?.location    ?? null,
      zoneKey:   sel?.zoneKey     ?? null,
      handIndex: sel?.index       ?? null,
      phase:     gameState.phase?.id ?? null,
    })
  }

  /**
   * Resolve ataque via servidor.
   * Fluxo:
   *   1. attackArrow dispara animação imediatamente (responsividade)
   *   2. No impacto → envia AttackPayload ao servidor
   *   3. Servidor responde em SUB_BATTLE com BattleResultDTO
   *   4. _applyBattleResult() aplica mutations + FX
   *
   * AttackPayload:
   * {
   *   attackingZone: string,    // "pm0" … "pm4"
   *   defenderZone:  string | null,  // null = ataque direto
   * }
   */
  handleAttackTarget(attackingZone, targetZone, gameState, mutations) {
    const { setAttackingZone, setOccupiedZones } = mutations

    setAttackingZone(null)

    // Marca atacante como exausto de imediato (otimista)
    setOccupiedZones(prev => {
      const slot = prev[attackingZone]
      if (!slot) return prev
      return { ...prev, [attackingZone]: { ...slot, hasAttackedThisTurn: true } }
    })

    const attackerEl = document.querySelector(`[data-zone-key="${attackingZone}"]`)
    const targetEl   = targetZone
      ? document.querySelector(`[data-zone-key="${targetZone}"]`)
      : document.querySelector('.field-side--opponent')

    const sendAttack = () => {
      if (!this._duelId) {
        console.warn('[WS] handleAttackTarget sem duelId — resolvendo localmente não suportado')
        return
      }
      // Guarda mutations para quando o resultado chegar
      this._pendingBattle = { mutations }
      this._publish(DEST_ATTACK(this._duelId), {
        attackingZone,
        defenderZone: targetZone ?? null,
      })
    }

    if (attackerEl) {
      attackArrow.fire(attackerEl, targetEl, sendAttack)
    } else {
      sendAttack()
    }
  }

  // ── Internos ─────────────────────────────────────────────

  _onConnect() {
    this._connected = true
    console.info('[WS] Conectado a', WS_URL)
    this._subscribeJoined()
    this._callbacks.onConnected?.()
  }

  _onDisconnect() {
    this._connected = false
    console.info('[WS] Desconectado')
    this._callbacks.onDisconnected?.()
  }

  _subscribeJoined() {
    const sub = this._client.subscribe(SUB_JOINED, (msg) => {
      const payload = JSON.parse(msg.body)
      this._duelId = payload.duelId
      console.info('[WS] Duelo iniciado:', this._duelId)
      this._subscribeGame()
      this._callbacks.onConnected?.(this._duelId)
    })
    this._subs.push(sub)
  }

  _subscribeGame() {
    const subState = this._client.subscribe(SUB_STATE(this._duelId), (msg) => {
      const dto    = JSON.parse(msg.body)
      const mapped = mapServerState(dto)
      this._callbacks.onState?.(mapped)
    })

    const subBattle = this._client.subscribe(SUB_BATTLE(this._duelId), (msg) => {
      const dto    = JSON.parse(msg.body)
      const result = mapBattleResult(dto)
      this._applyBattleResult(result)
    })

    const subError = this._client.subscribe(SUB_ERROR(this._duelId), (msg) => {
      const { message } = JSON.parse(msg.body)
      console.error('[WS] Erro do servidor:', message)
      this._callbacks.onError?.(message)
    })

    this._subs.push(subState, subBattle, subError)
  }

  _applyBattleResult(result) {
    if (!this._pendingBattle) {
      console.warn('[WS] BattleResult recebido sem pendingBattle')
      return
    }
    const { mutations } = this._pendingBattle
    this._pendingBattle = null

    const { dealDamage, sendToGraveyard, setInstruction, lpDamageFX } = mutations

    if (result.defenderDestroyed && result.defenderZone) {
      const el = document.querySelector(`[data-zone-key="${result.defenderZone}"]`)
      destroyFX(el, () => sendToGraveyard(result.defenderZone, 'opponent'))
    }

    if (result.attackerDestroyed && result.attackerZone) {
      const el = document.querySelector(`[data-zone-key="${result.attackerZone}"]`)
      destroyFX(el, () => sendToGraveyard(result.attackerZone, 'player'))
    }

    if (result.damageToOpponent > 0) {
      const barEl = document.getElementById('opponentLpBar')
      const valEl = document.getElementById('opponentLpVal')
      dealDamage(result.damageToOpponent, 'opponent')
      lpDamageFX?.(result.damageToOpponent, barEl, valEl, 45)
      setInstruction?.(`DIRECT ATTACK — ${result.damageToOpponent} DAMAGE!`)
    }

    if (result.damageToPlayer > 0) {
      const barEl = document.getElementById('playerLpBar')
      const valEl = document.getElementById('playerLpVal')
      dealDamage(result.damageToPlayer, 'player')
      lpDamageFX?.(result.damageToPlayer, barEl, valEl, 45)
      setInstruction?.(`BLOCKED — ${result.damageToPlayer} DAMAGE TAKEN`)
    }

    if (result.winner) {
      // WinScreen é ativado via dealDamage que zera LP
      // Se o servidor enviar winner sem damage (edge case), forçar aqui:
      // setWinner?.(result.winner)
    }
  }

  _publish(destination, body) {
    if (!this._client?.connected) {
      console.warn('[WS] Publicação ignorada — não conectado:', destination)
      return
    }
    this._client.publish({ destination, body: JSON.stringify(body) })
  }
}
