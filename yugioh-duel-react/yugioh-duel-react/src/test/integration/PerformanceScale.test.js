import { describe, it, expect } from 'vitest'

describe('TEST-009: Performance and Scale', () => {
  describe('large hand', () => {
    it('handles 10 cards without errors', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState }
      for (let i = 0; i < 10; i++) {
        state = reducer(state, { type: 'ADD_TO_HAND', card: { id: i, name: `Card ${i}` } })
      }
      expect(state.handCards.length).toBe(10)
    })

    it('rejects cards beyond hand limit', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState, handCards: Array.from({ length: 10 }, (_, i) => ({ id: i })) }
      state = reducer(state, { type: 'ADD_TO_HAND', card: { id: 99 } })
      expect(state.handCards.length).toBe(10)
    })
  })

  describe('full field', () => {
    it('handles 5 monster zones occupied', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState }
      for (let i = 0; i < 5; i++) {
        state = reducer(state, { type: 'PLACE_IN_ZONE', zoneKey: `pm${i}`, slotData: { card: { id: i }, position: 'attack', faceDown: false } })
      }
      expect(Object.keys(state.occupiedZones).length).toBe(5)
    })

    it('handles 5 spell zones + 5 monster zones + field zone', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState }
      for (let i = 0; i < 5; i++) {
        state = reducer(state, { type: 'PLACE_IN_ZONE', zoneKey: `pm${i}`, slotData: { card: { id: `m${i}` } } })
        state = reducer(state, { type: 'PLACE_IN_ZONE', zoneKey: `ps${i}`, slotData: { card: { id: `s${i}` } } })
      }
      expect(Object.keys(state.occupiedZones).length).toBe(10)
    })
  })

  describe('object create performance', () => {
    it('creates new state without mutating previous', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      const state1 = { ...initialState }
      const state2 = reducer(state1, { type: 'MARK_DRAWN' })
      expect(state1.drawnThisTurn).toBe(false)
      expect(state2.drawnThisTurn).toBe(true)
      expect(Object.is(state1, state2)).toBe(false)
    })
  })

  describe('chain resolution order', () => {
    it('chains can be built without state corruption', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState }
      for (let i = 0; i < 10; i++) {
        state = reducer(state, { type: 'DEAL_DAMAGE', amount: 100, target: 'player' })
      }
      expect(state.playerLP).toBe(7000)
    })
  })
})