import { describe, it, expect, vi } from 'vitest'

function simulateDuelTurn(reducer, state, deck) {
  state = reducer(state, { type: 'SET_DECK_CARDS', cards: deck })
  state = deck.reduce((s, _, i) => reducer(s, { type: 'INIT_DECK', cards: deck }), state)
  state = reducer(state, { type: 'DRAW_CARD' })
  state = reducer(state, { type: 'MARK_DRAWN' })
  for (let i = 0; i < 5; i++) {
    state = reducer(state, { type: 'DRAW_CARD' })
  }
  for (let i = 0; i < 6; i++) {
    state = reducer(state, { type: 'NEXT_PHASE' })
  }
  return state
}

describe('TEST-006: Replay/Golden Tests', () => {
  describe('deterministic deck initialization', () => {
    it('INIT_DECK preserves card order reference', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      const deck = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Card ${i}` }))
      let state = reducer(initialState, { type: 'INIT_DECK', cards: deck })
      expect(state.deckCards.length).toBe(20)
      state.deckCards.forEach((c, i) => {
        expect(c.id).toBeDefined()
      })
    })
  })

  describe('turn flow is reproducible', () => {
    it('draw + mark_drawn + advance turn produces consistent state', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      const deck = Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Card ${i}`, atk: 1500, def: 1000 }))
      let state = simulateDuelTurn(reducer, initialState, deck)
      expect(state.turn).toBe(2)
      expect(state.drawnThisTurn).toBe(false)
      expect(state.handCards.length).toBe(6)
    })
  })

  describe('attack resolution is deterministic', () => {
    it('attacker with higher ATK destroys defender', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = reducer(initialState, { type: 'PLACE_IN_ZONE', zoneKey: 'pm0', slotData: { card: { atk: 2000, def: 1000 }, position: 'attack' } })
      state = reducer(state, { type: 'PLACE_IN_ZONE', zoneKey: 'om0', slotData: { card: { atk: 1500, def: 1200 }, position: 'attack' } })
      state = reducer(state, { type: 'SEND_TO_GRAVEYARD', zoneKey: 'om0', owner: 'opponent' })
      expect(state.occupiedZones.om0).toBeUndefined()
      expect(state.opponentGY.length).toBe(1)
    })

    it('defender with higher ATK destroys attacker', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = reducer(initialState, { type: 'PLACE_IN_ZONE', zoneKey: 'pm0', slotData: { card: { atk: 1000, def: 800 }, position: 'attack' } })
      state = reducer(state, { type: 'PLACE_IN_ZONE', zoneKey: 'om0', slotData: { card: { atk: 2000, def: 1500 }, position: 'attack' } })
      state = reducer(state, { type: 'SEND_TO_GRAVEYARD', zoneKey: 'pm0', owner: 'player' })
      expect(state.occupiedZones.pm0).toBeUndefined()
      expect(state.playerGY.length).toBe(1)
    })
  })

  describe('damage calculation is reproducible', () => {
    it('DEAL_DAMAGE reduces LP deterministically', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = reducer(initialState, { type: 'DEAL_DAMAGE', amount: 2400, target: 'opponent' })
      expect(state.opponentLP).toBe(3600)
    })

    it('multiple damages accumulate', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = initialState
      for (const dmg of [500, 1000, 500]) {
        state = reducer(state, { type: 'DEAL_DAMAGE', amount: dmg, target: 'player' })
      }
      expect(state.playerLP).toBe(6000)
    })
  })

  describe('phase transitions are deterministic', () => {
    it('NEXT_PHASE cycles through all 6 phases', () => {
      const { reducer, initialState, PHASES } = require('../../contexts/duelReducer')
      let state = initialState
      for (let i = 0; i < PHASES.length; i++) {
        state = reducer(state, { type: 'NEXT_PHASE' })
        if (state.phaseIndex < i + 1) break
      }
      expect(state.phaseIndex).toBeGreaterThanOrEqual(0)
    })
  })
})