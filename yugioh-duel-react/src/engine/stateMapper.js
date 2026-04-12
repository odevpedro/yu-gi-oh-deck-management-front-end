// ═══════════════════════════════════════════════════════════
// stateMapper.js — Converte DuelStateDTO do servidor → estado React
//
// Ajuste as chaves aqui se o duel-service usar nomes diferentes.
// O contrato esperado está documentado inline.
// ═══════════════════════════════════════════════════════════

import { proxiedUrl } from '../utils/cardHelpers'

// ── Mapeamento de phase IDs ──────────────────────────────
// Aceita tanto MAIN_1 quanto MAIN1 (variação de convenção)
const PHASE_MAP = {
  DRAW:    'DRAW',
  STANDBY: 'STANDBY',
  MAIN1:   'MAIN1',
  MAIN_1:  'MAIN1',
  BATTLE:  'BATTLE',
  MAIN2:   'MAIN2',
  MAIN_2:  'MAIN2',
  END:     'END',
}

// ── Mapeamento de posição de monstro ─────────────────────
// Servidor pode enviar ATTACK/DEFENSE (Java enum) ou attack/defense
const POSITION_MAP = {
  ATTACK:   'attack',
  DEFENSE:  'defense',
  SPELL:    'spell',
  attack:   'attack',
  defense:  'defense',
  spell:    'spell',
}

// ── Mapeamento de vencedor ────────────────────────────────
// Ajuste para o valor exato que seu servidor envia
const WINNER_MAP = {
  PLAYER_ONE: 'player',
  PLAYER_TWO: 'opponent',
  PLAYER:     'player',
  OPPONENT:   'opponent',
  player:     'player',
  opponent:   'opponent',
}

/**
 * Converte um SlotDTO do servidor em formato de slot do cliente.
 *
 * SlotDTO esperado:
 * {
 *   card: { id, name, type, atk, def, level, card_images: [{ image_url }] },
 *   position: "ATTACK" | "DEFENSE" | "SPELL",
 *   faceDown: boolean,
 *   summonedThisTurn: boolean,
 *   hasAttackedThisTurn: boolean,
 * }
 */
function mapSlot(slotDTO) {
  if (!slotDTO) return null
  const card   = slotDTO.card ?? slotDTO
  const rawImg = card.url ?? card.card_images?.[0]?.image_url ?? ''
  return {
    card,
    dataUrl:             rawImg ? proxiedUrl(rawImg) : '',
    position:            POSITION_MAP[slotDTO.position] ?? 'attack',
    faceDown:            slotDTO.faceDown            ?? false,
    summonedThisTurn:    slotDTO.summonedThisTurn    ?? false,
    hasAttackedThisTurn: slotDTO.hasAttackedThisTurn ?? false,
  }
}

/**
 * Converte um campo do servidor { zoneKey: SlotDTO | null } em occupiedZones.
 *
 * Zonas de monstro do jogador:  pm0 … pm4
 * Zonas spell/trap do jogador:  ps0 … ps4
 * Zonas de monstro oponente:    om0 … om4
 * Zonas spell/trap oponente:    os0 … os4
 */
function mapField(serverField) {
  if (!serverField) return {}
  const zones = {}
  for (const [zk, slot] of Object.entries(serverField)) {
    if (slot) zones[zk] = mapSlot(slot)
  }
  return zones
}

/**
 * Converte o DuelStateDTO completo em estado React.
 *
 * DuelStateDTO esperado:
 * {
 *   duelId:       string,
 *   turn:         number,
 *   phase:        "DRAW" | "STANDBY" | "MAIN1" | "BATTLE" | "MAIN2" | "END",
 *   playerLP:     number,
 *   opponentLP:   number,
 *   winner:       "PLAYER_ONE" | "PLAYER_TWO" | null,
 *   playerField:  { pm0: SlotDTO?, … ps4: SlotDTO? },
 *   opponentField:{ om0: SlotDTO?, … os4: SlotDTO? },
 *   playerHand:   Card[],
 *   playerGY:     Card[],
 *   opponentGY:   Card[],
 * }
 */
export function mapServerState(dto) {
  return {
    duelId:       dto.duelId,
    turn:         dto.turn         ?? 1,
    phaseId:      PHASE_MAP[dto.phase] ?? dto.phase ?? 'MAIN1',
    playerLP:     dto.playerLP     ?? 8000,
    opponentLP:   dto.opponentLP   ?? 6000,
    winner:       dto.winner ? (WINNER_MAP[dto.winner] ?? null) : null,
    occupiedZones: {
      ...mapField(dto.playerField),
      ...mapField(dto.opponentField),
    },
    handCards:  dto.playerHand  ?? [],
    playerGY:   dto.playerGY    ?? [],
    opponentGY: dto.opponentGY  ?? [],
  }
}

/**
 * Converte BattleResultDTO em formato interno.
 *
 * BattleResultDTO esperado:
 * {
 *   attackerZone:       string,
 *   defenderZone:       string | null,
 *   attackerDestroyed:  boolean,
 *   defenderDestroyed:  boolean,
 *   damageToPlayer:     number,
 *   damageToOpponent:   number,
 *   winner:             "PLAYER_ONE" | "PLAYER_TWO" | null,
 * }
 */
export function mapBattleResult(dto) {
  return {
    attackerZone:      dto.attackerZone      ?? null,
    defenderZone:      dto.defenderZone      ?? null,
    attackerDestroyed: dto.attackerDestroyed ?? false,
    defenderDestroyed: dto.defenderDestroyed ?? false,
    damageToPlayer:    dto.damageToPlayer    ?? 0,
    damageToOpponent:  dto.damageToOpponent  ?? 0,
    winner:            dto.winner ? (WINNER_MAP[dto.winner] ?? null) : null,
  }
}
