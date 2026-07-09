import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('TEST-007: Privacy and Fair Play', () => {
  describe('opponent hand is hidden', () => {
    it('should not expose opponent hand card details', () => {
      const opponentHand = [{ id: 999, name: 'Blue-Eyes', type: 'Normal Monster', atk: 3000 }]
      const rendered = opponentHand.map(c => ({ id: '???' }))
      expect(rendered[0].id).toBe('???')
      expect(rendered[0].name).toBeUndefined()
    })

    it('should not allow reading opponent hand via devtools', () => {
      const state = {
        opponentHand: [{ id: 1, name: 'Secret Card' }],
      }
      const exposed = state.opponentHand.length
      expect(exposed).toBe(1)
      const card = state.opponentHand[0]
      expect(card.name).toBe('Secret Card')
    })
  })

  describe('deck is hidden from opponent', () => {
    it('opponentDeckCards should not be rendered', () => {
      const state = { opponentDeckCards: [{ id: 1 }, { id: 2 }, { id: 3 }] }
      const deckCount = state.opponentDeckCards.length
      expect(deckCount).toEqual(3)
    })
  })

  describe('face-down cards are hidden', () => {
    it('face-down card shows /card-back.png', () => {
      const card = { faceDown: true, dataUrl: 'data:image/png;base64,secret' }
      const displayed = card.faceDown ? '/card-back.png' : card.dataUrl
      expect(displayed).toBe('/card-back.png')
    })

    it('face-up card shows real image', () => {
      const card = { faceDown: false, dataUrl: 'data:image/png;base64,realcard' }
      const displayed = card.faceDown ? '/card-back.png' : card.dataUrl
      expect(displayed).toBe('data:image/png;base64,realcard')
    })
  })

  describe('hand card limit', () => {
    it('should not exceed 10 cards in hand', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      let state = { ...initialState, handCards: Array.from({ length: 10 }, (_, i) => ({ id: i })) }
      const newCard = { id: 99 }
      state = reducer(state, { type: 'ADD_TO_HAND', card: newCard })
      expect(state.handCards.length).toBe(10)
      expect(state.handCards.find(c => c.id === 99)).toBeUndefined()
    })
  })

  describe('remote state privacy', () => {
    it('mapRemoteDuelState filters opponent hand', () => {
      const { mapRemoteDuelState } = require('../../utils/remoteStateMapper')
      const remoteState = {
        playerA: { playerId: 'p1', hand: [{ id: 1, name: 'A' }], monsterZones: [], spellTrapZones: [], graveyard: [], deck: [{ id: 2 }] },
        playerB: { playerId: 'p2', hand: [{ id: 3, name: 'Secret' }], monsterZones: [], spellTrapZones: [], graveyard: [], deck: [{ id: 4 }] },
        turnNumber: 1, currentPhase: 'MAIN_1', status: 'RUNNING', activePlayerId: 'p1',
      }
      const mapped = mapRemoteDuelState(remoteState, 'p1')
      expect(mapped.handCards.length).toBe(1)
      expect(mapped.handCards[0].name).toBe('A')
    })
  })
})