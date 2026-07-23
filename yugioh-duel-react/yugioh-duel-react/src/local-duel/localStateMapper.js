import { getCard } from './duel/cardDatabase'
import { LOCATIONS } from './duel/LocalDuelClient'

const PHASE_INDEX = {
  DRAW: 0,
  STANDBY: 1,
  'MAIN 1': 2,
  BATTLE: 3,
  'MAIN 2': 4,
  END: 5,
}

function cardsAt(state, player, location) {
  return state.zones[`${player}:${location}`] || []
}

function cardType(value) {
  if (value & 0x2) return 'Spell Card'
  if (value & 0x4) return 'Trap Card'
  if (value & 0x4000000) return 'Link Monster'
  if (value & 0x800000) return 'XYZ Monster'
  if (value & 0x2000) return 'Synchro Monster'
  if (value & 0x40) return 'Fusion Monster'
  if (value & 0x80) return 'Ritual Monster'
  return 'Effect Monster'
}

function attributeName(value) {
  return ({ 1: 'EARTH', 2: 'WATER', 4: 'FIRE', 8: 'WIND', 16: 'LIGHT', 32: 'DARK', 64: 'DIVINE' })[value] || ''
}

function hiddenCard(id) {
  return {
    id,
    cardId: 0,
    name: 'Carta oculta',
    type: 'Unknown',
    url: '/card-back.png',
    card_images: [{ image_url: '/card-back.png' }],
  }
}

async function displayCard(query, identity) {
  const code = Number(query?.code) || 0
  if (!code) return hiddenCard(identity)
  const metadata = await getCard(code)
  const imageUrl = `/local-assets/cards/${code}.jpg`
  return {
    id: identity,
    cardId: code,
    code,
    name: metadata.name,
    desc: metadata.description,
    type: cardType(metadata.type),
    attribute: attributeName(metadata.attribute),
    level: metadata.level,
    atk: metadata.attack,
    def: metadata.defense,
    url: imageUrl,
    card_images: [{ image_url: imageUrl }],
    ocgKey: `${query.controller}:${query.location}:${query.sequence}`,
  }
}

async function mapCardList(cards, prefix) {
  const visible = cards.filter(Boolean)
  return Promise.all(visible.map((card, index) => displayCard(card, `${prefix}-${index}-${card.code || 0}`)))
}

async function mapField(state, self, opponent) {
  const occupiedZones = {}
  const groups = [
    [self, LOCATIONS.MZONE, 'pm'],
    [self, LOCATIONS.SZONE, 'ps'],
    [opponent, LOCATIONS.MZONE, 'om'],
    [opponent, LOCATIONS.SZONE, 'os'],
  ]

  for (const [player, location, prefix] of groups) {
    const cards = cardsAt(state, player, location)
    await Promise.all(cards.map(async (query, fallbackSequence) => {
      if (!query) return
      const sequence = Number.isInteger(query.sequence) ? query.sequence : fallbackSequence
      if (sequence > 5) return
      const card = await displayCard(query, `${prefix}-${sequence}-${query.code || 0}`)
      const faceDown = (Number(query.position) & 0x0a) !== 0
      occupiedZones[`${prefix}${sequence}`] = {
        card,
        dataUrl: faceDown ? '/card-back.png' : card.url,
        position: (Number(query.position) & 0x0c) !== 0 ? 'defense' : 'attack',
        faceDown,
        summonedThisTurn: false,
        hasAttackedThisTurn: false,
      }
    }))
  }
  return occupiedZones
}

export async function mapLocalDuelState(state) {
  const self = state.localPlayer
  const opponent = self === 0 ? 1 : 0
  const [handCards, playerGY, opponentGY, playerBanished, opponentBanished, occupiedZones] = await Promise.all([
    mapCardList(cardsAt(state, self, LOCATIONS.HAND), 'hand'),
    mapCardList(cardsAt(state, self, LOCATIONS.GRAVE), 'pgy'),
    mapCardList(cardsAt(state, opponent, LOCATIONS.GRAVE), 'ogy'),
    mapCardList(cardsAt(state, self, LOCATIONS.REMOVED), 'pban'),
    mapCardList(cardsAt(state, opponent, LOCATIONS.REMOVED), 'oban'),
    mapField(state, self, opponent),
  ])

  const playerDeckCount = state.deckCounts[self] ?? 40
  const opponentDeckCount = state.deckCounts[opponent] ?? 40
  const opponentHandCount = cardsAt(state, opponent, LOCATIONS.HAND).filter(Boolean).length

  return {
    turn: Math.max(1, state.turn || 1),
    phaseIndex: PHASE_INDEX[state.phase] ?? 0,
    playerLP: state.lp[self] ?? 8000,
    opponentLP: state.lp[opponent] ?? 8000,
    handCards,
    opponentHand: Array.from({ length: opponentHandCount }, (_, index) => hiddenCard(`opponent-hand-${index}`)),
    deckCards: Array.from({ length: playerDeckCount }, (_, index) => hiddenCard(`deck-${index}`)),
    deckRemaining: Array.from({ length: playerDeckCount }, (_, index) => index),
    opponentDeckCards: Array.from({ length: opponentDeckCount }, (_, index) => hiddenCard(`opponent-deck-${index}`)),
    opponentDeckRemaining: Array.from({ length: opponentDeckCount }, (_, index) => index),
    occupiedZones,
    playerGY,
    opponentGY,
    playerBanished,
    opponentBanished,
    drawnThisTurn: true,
    instruction: state.statusText,
    status: state.status,
    winner: state.winner,
    isVictory: state.winner !== null && state.winner === self,
  }
}
