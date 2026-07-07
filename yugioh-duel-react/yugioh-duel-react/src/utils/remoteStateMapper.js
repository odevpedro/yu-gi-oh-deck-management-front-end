const PHASE_IDS = ['DRAW', 'STANDBY', 'MAIN_1', 'BATTLE', 'MAIN_2', 'END']
const PHASE_ID_TO_CONTEXT_ID = {
  DRAW: 'DRAW',
  STANDBY: 'STANDBY',
  MAIN_1: 'MAIN1',
  BATTLE: 'BATTLE',
  MAIN_2: 'MAIN2',
  END: 'END',
}

function normalizeCard(card) {
  if (!card) return null

  const id = card.cardId ?? card.id
  const type = card.type ?? 'MONSTER'
  const imageUrl = card.imageUrl ?? card.url ?? card.card_images?.[0]?.image_url ?? ''

  return {
    ...card,
    id,
    cardId: id,
    type,
    url: imageUrl,
    card_images: imageUrl ? [{ image_url: imageUrl }] : card.card_images,
  }
}

function mapPosition(position) {
  if (!position) return 'attack'
  if (position.includes('DEFENSE')) return 'defense'
  return 'attack'
}

function mapZone(zone, keyPrefix) {
  const card = normalizeCard(zone.card)
  if (!card) return null

  return {
    key: `${keyPrefix}${zone.index}`,
    value: {
      card,
      dataUrl: card.url ?? '',
      position: mapPosition(zone.position),
      faceDown: zone.position === 'DEFENSE_FACE_DOWN',
      summonedThisTurn: false,
      hasAttackedThisTurn: false,
    },
  }
}

function mapZones(player, prefix) {
  const occupied = {}

  for (const zone of player?.monsterZones ?? []) {
    const mapped = mapZone(zone, `${prefix}m`)
    if (mapped) occupied[mapped.key] = mapped.value
  }

  for (const zone of player?.spellTrapZones ?? []) {
    const mapped = mapZone(zone, `${prefix}s`)
    if (mapped) occupied[mapped.key] = mapped.value
  }

  return occupied
}

function pickPerspective(state, playerId) {
  const isPlayerA = state.playerA?.playerId === playerId || state.playerAId === playerId
  return {
    player: isPlayerA ? state.playerA : state.playerB,
    opponent: isPlayerA ? state.playerB : state.playerA,
  }
}

export function mapRemoteDuelState(state, playerId) {
  if (!state) return null

  const { player, opponent } = pickPerspective(state, playerId)
  const contextPhaseId = PHASE_ID_TO_CONTEXT_ID[state.currentPhase] ?? state.currentPhase
  const phaseIndex = Math.max(0, PHASE_IDS.map((id) => PHASE_ID_TO_CONTEXT_ID[id]).findIndex((id) => id === contextPhaseId))
  const playerDeck = (player?.deck ?? []).map(normalizeCard).filter(Boolean)

  return {
    turn: state.turnNumber ?? 1,
    phaseIndex,
    playerLP: player?.lifePoints ?? 8000,
    opponentLP: opponent?.lifePoints ?? 8000,
    handCards: (player?.hand ?? []).map(normalizeCard).filter(Boolean),
    deckCards: playerDeck,
    deckRemaining: playerDeck.map((_, index) => index),
    occupiedZones: {
      ...mapZones(opponent, 'o'),
      ...mapZones(player, 'p'),
    },
    playerGY: (player?.graveyard ?? []).map(normalizeCard).filter(Boolean),
    opponentGY: (opponent?.graveyard ?? []).map(normalizeCard).filter(Boolean),
    status: state.status,
    winnerId: state.winnerId,
    activePlayerId: state.activePlayerId,
    isPlayerTurn: state.activePlayerId === player?.playerId,
  }
}
