import { describe, it, expect, vi } from 'vitest'

function makeDeck(cardTypes) {
  return cardTypes.map((type, i) => ({
    id: 1000 + i,
    name: `${type.replace(/\s+/g, '_')}_${i + 1}`,
    type,
    atk: type.includes('MONSTER') ? 1500 + i * 100 : undefined,
    def: type.includes('MONSTER') ? 1200 + i * 50 : undefined,
    level: type.includes('MONSTER') ? 4 : undefined,
    card_images: [{ image_url: '' }],
  }))
}

describe('TEST-011: Fixtures Controladas', () => {
  describe('Vanilla Deck', () => {
    const deck = makeMonsterDeck(['Normal Monster'], 20)

    it('has exactly 20 normal monsters', () => {
      expect(deck.length).toBe(20)
      deck.forEach(c => expect(c.type).toBe('Normal Monster'))
    })

    it('each card has valid atk/def', () => {
      deck.forEach(c => {
        expect(c.atk).toBeGreaterThanOrEqual(0)
        expect(c.def).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Spell/Trap Deck', () => {
    const types = ['Spell Card', 'Spell Card', 'Trap Card', 'Trap Card', 'Spell Card']
    const deck = makeMonsterDeck(types)

    it('has correct mix of spell/trap', () => {
      const spells = deck.filter(c => c.type === 'Spell Card')
      const traps = deck.filter(c => c.type === 'Trap Card')
      expect(spells.length + traps.length).toBe(deck.length)
    })
  })

  describe('Summoning Deck', () => {
    const deck = makeMonsterDeck(['Normal Monster', 'Fusion Monster', 'Synchro Monster', 'XYZ Monster', 'Link Monster'])

    it('includes extra deck monsters', () => {
      const extraTypes = ['FUSION', 'SYNCHRO', 'XYZ', 'LINK']
      extraTypes.forEach(t => {
        expect(deck.some(c => c.type.toUpperCase().includes(t))).toBe(true)
      })
    })
  })

  describe('Effect Deck', () => {
    const types = Array.from({ length: 20 }, (_, i) => i % 2 === 0 ? 'Effect Monster' : 'Normal Monster')
    const deck = makeMonsterDeck(types)

    it('has effect and normal monsters', () => {
      const effects = deck.filter(c => c.type === 'Effect Monster')
      const normals = deck.filter(c => c.type === 'Normal Monster')
      expect(effects.length).toBeGreaterThan(0)
      expect(normals.length).toBeGreaterThan(0)
    })
  })
})

describe('reducer with fixtures', () => {
  it('INIT_DECK builds correct state', () => {
    const { reducer, initialState } = require('../../contexts/duelReducer')
    const fixture = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Fixture ${i}`, type: 'Normal Monster', atk: 1500, def: 1000, card_images: [] }))
    let state = reducer(initialState, { type: 'INIT_DECK', cards: fixture })
    expect(state.deckCards.length).toBe(20)
    expect(state.deckRemaining.length).toBe(20)
  })

  it('INIT_OPPONENT draws 5 cards', () => {
    const { reducer, initialState } = require('../../contexts/duelReducer')
    const fixture = Array.from({ length: 20 }, (_, i) => ({ id: 100 + i, name: `Opp ${i}` }))
    let state = reducer(initialState, { type: 'INIT_OPPONENT', cards: fixture })
    expect(state.opponentDeckCards.length).toBe(20)
    expect(state.opponentHand.length).toBe(5)
    expect(state.opponentDeckRemaining.length).toBe(15)
  })
})

function makeMonsterDeck(types, count) {
  return Array.from({ length: count || types.length }, (_, i) => ({
    id: 2000 + i,
    name: `Card_${2000 + i}`,
    type: types[i % types.length],
    atk: 1500 + i * 50,
    def: 1000 + i * 30,
    level: 4,
    card_images: [{ image_url: '' }],
  }))
}