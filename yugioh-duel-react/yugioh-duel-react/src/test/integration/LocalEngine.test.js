import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalEngine } from '../../engine/LocalEngine'

describe('TEST-003: LocalEngine Integration', () => {
  let engine
  let gameState
  let mutations

  beforeEach(() => {
    engine = new LocalEngine()
    gameState = {
      selectedCard: null,
      phase: { id: 'MAIN1', label: 'MAIN 1' },
      flags: { normalSummonedThisTurn: false, positionChangedThisTurn: false, attackedZones: new Set() },
      occupiedZones: {},
      handCards: [],
      playerLP: 8000,
      opponentLP: 8000,
      turn: 2,
    }
    mutations = {
      setOccupiedZones: vi.fn(),
      setHandCards: vi.fn(),
      setInstruction: vi.fn(),
      setSelectedCard: vi.fn(),
      setActiveAction: vi.fn(),
      setAttackingZone: vi.fn(),
      setNormalSummoned: vi.fn(),
      setPositionChanged: vi.fn(),
      clearSelection: vi.fn(),
      clearZoneHighlights: vi.fn(),
      highlightSummonZones: vi.fn(),
      highlightSpellZones: vi.fn(),
      highlightAttackTargets: vi.fn(),
      sendToGraveyard: vi.fn(),
      dealDamage: vi.fn(),
      lpDamageFX: vi.fn(),
    }
  })

  describe('getAvailableActions', () => {
    it('returns empty array when no card selected', () => {
      expect(engine.getAvailableActions(gameState)).toEqual([])
    })

    it('returns summon actions for monster in hand', () => {
      gameState.selectedCard = {
        card: { id: 1, name: 'Test Monster', type: 'Normal Monster', atk: 1500, def: 1000, level: 4 },
        location: 'hand', index: 0,
      }
      const actions = engine.getAvailableActions(gameState)
      expect(actions.length).toBeGreaterThan(2)
      const ids = actions.map(a => a.id)
      expect(ids).toContain('normal-summon')
      expect(ids).toContain('set-monster')
      expect(ids).toContain('view-details')
      expect(ids).toContain('cancel')
    })

    it('respects turn 1 no attack', () => {
      gameState.turn = 1
      const monster = { id: 1, name: 'Test Monster', type: 'Normal Monster', atk: 1500, def: 1000 }
      gameState.occupiedZones = {
        pm0: { card: monster, position: 'attack', faceDown: false, summonedThisTurn: true },
      }
      gameState.selectedCard = { card: monster, location: 'field', zoneKey: 'pm0', position: 'attack' }
      gameState.phase = { id: 'BATTLE', label: 'BATTLE' }
      const actions = engine.getAvailableActions(gameState)
      const attack = actions.find(a => a.id === 'attack')
      expect(attack.available).toBe(false)
      expect(attack.reason).toContain('Cannot attack on the first turn')
    })

    it('shows flip-summon for face-down monsters', () => {
      gameState.turn = 3
      gameState.phase = { id: 'MAIN1', label: 'MAIN 1' }
      const monster = { id: 1, name: 'Face Down Monster', type: 'Normal Monster', atk: 1500, def: 1000 }
      gameState.occupiedZones = {
        pm0: { card: monster, position: 'defense', faceDown: true, summonedThisTurn: false },
      }
      gameState.selectedCard = { card: monster, location: 'field', zoneKey: 'pm0', position: 'defense' }
      const actions = engine.getAvailableActions(gameState)
      expect(actions.find(a => a.id === 'flip-summon').available).toBe(true)
    })
  })

  describe('requestAction - normal-summon', () => {
    it('performs normal summon placing card in zone', () => {
      gameState.selectedCard = { card: { id: 1, name: 'Summoned Monster', type: 'Normal Monster', atk: 1500, def: 1000, card_images: [{ image_url: '' }] }, location: 'hand', index: 0 }
      vi.useFakeTimers()
      engine.requestAction('normal-summon', gameState, mutations)
      expect(mutations.setHandCards).toHaveBeenCalled()
      expect(mutations.setNormalSummoned).toHaveBeenCalled()
      expect(mutations.clearZoneHighlights).toHaveBeenCalled()
      expect(mutations.setSelectedCard).toHaveBeenCalledWith(null)
      vi.advanceTimersByTime(250)
      expect(mutations.setOccupiedZones).toHaveBeenCalled()
      vi.useRealTimers()
    })
  })

  describe('handleAttackTarget', () => {
    it('resolves direct attack when no opponent monsters', () => {
      const attacker = { card: { id: 1, name: 'Attacker', type: 'Normal Monster', atk: 1500 }, position: 'attack', faceDown: false }
      gameState.occupiedZones = { pm0: attacker }
      engine.handleAttackTarget('pm0', null, gameState, mutations)
      expect(mutations.dealDamage).toHaveBeenCalledWith(1500, 'opponent')
    })

    it('marks attacker as attacked', () => {
      const attacker = { card: { id: 1, name: 'Attacker', type: 'Normal Monster', atk: 1500 }, position: 'attack', faceDown: false }
      gameState.occupiedZones = { pm0: attacker }
      const setOccCalls = []
      mutations.setAttackingZone = vi.fn()
      mutations.setOccupiedZones = vi.fn((fn) => {
        const result = fn(gameState.occupiedZones)
        expect(result.pm0.hasAttackedThisTurn).toBe(true)
        return result
      })
      engine.handleAttackTarget('pm0', null, gameState, mutations)
      expect(mutations.setOccupiedZones).toHaveBeenCalled()
    })

    it('flips face-down defender when attacked', () => {
      const attacker = { card: { id: 1, atk: 2000 }, position: 'attack', faceDown: false, hasAttackedThisTurn: false }
      const defender = { card: { id: 2, name: 'Defender', type: 'Normal Monster', atk: 500, def: 1000 }, position: 'defense', faceDown: true, summonedThisTurn: false }
      gameState.occupiedZones = { pm0: attacker, om0: defender }
      const calls = []
      mutations.setOccupiedZones = vi.fn((fn) => {
        const result = fn(gameState.occupiedZones)
        calls.push(result)
      })
      mutations.sendToGraveyard = vi.fn()
      engine.handleAttackTarget('pm0', 'om0', gameState, mutations)
      expect(calls.length).toBeGreaterThanOrEqual(1)
      const firstCallResult = calls[0]
      expect(firstCallResult.om0.faceDown).toBe(false)
    })
  })

  describe('deck lifecycle', () => {
    it('processes DRAW phase correctly', () => {
      const { reducer, initialState, PHASES } = require('../../contexts/duelReducer')
      let state = { ...initialState, deckCards: Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Card ${i}` })) }
      state = reducer(state, { type: 'INIT_DECK', cards: state.deckCards })
      expect(state.deckRemaining.length).toBe(20)
      expect(state.handCards.length).toBe(0)
      state = reducer(state, { type: 'DRAW_CARD' })
      expect(state.handCards.length).toBe(1)
      expect(state.deckRemaining.length).toBe(19)
    })

    it('handles turn transition', () => {
      const { reducer, initialState, PHASES } = require('../../contexts/duelReducer')
      let state = { ...initialState }
      for (let i = 0; i < PHASES.length; i++) {
        state = reducer(state, { type: 'NEXT_PHASE' })
      }
      expect(state.turn).toBe(2)
      expect(state.phaseIndex).toBe(0)
      expect(state.drawnThisTurn).toBe(false)
    })
  })
})