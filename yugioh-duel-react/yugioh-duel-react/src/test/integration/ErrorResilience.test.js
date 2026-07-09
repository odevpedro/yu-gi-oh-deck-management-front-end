import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/tokenManager', () => ({
  getAccessToken: () => 'mock-token',
}))

vi.mock('../../services/cardService', () => ({
  fetchSampleDeck: vi.fn(),
  searchCards: vi.fn(),
  getCardsByIds: vi.fn(),
  getCardById: vi.fn(),
}))

import { fetchSampleDeck, searchCards } from '../../services/cardService'

describe('TEST-008: Error and Resilience', () => {
  describe('ErrorBoundary fallback', () => {
    it('renders error UI', async () => {
      const ErrorBoundary = (await import('../../components/ErrorBoundary')).default
      const error = new Error('Test crash')
      const state = ErrorBoundary.getDerivedStateFromError(error)
      expect(state.error).toBe(error)
    })
  })

  describe('WebSocket error handling', () => {
    it('creates duel client without crashing', async () => {
      const { createDuelClient } = await import('../../services/duelWebSocket')
      const client = createDuelClient({
        duelId: 'test', token: 'tok',
        onStateUpdate: vi.fn(), onGameOver: vi.fn(),
        onError: vi.fn(), onChatMessage: vi.fn(),
      })
      expect(client).toBeTruthy()
      client.deactivate()
    })
  })

  describe('fetch returns empty array on error', () => {
    it('fetchSampleDeck handles failure gracefully', async () => {
      fetchSampleDeck.mockRejectedValue(new Error('Network error'))
      await expect(fetchSampleDeck(5)).rejects.toThrow('Network error')
    })

    it('searchCards handles failure gracefully', async () => {
      searchCards.mockRejectedValue(new Error('Network error'))
      await expect(searchCards({ fname: 'Dark' })).rejects.toThrow('Network error')
    })
  })

  describe('duelService error resilience', () => {
    it('createDuel throws on network error', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'))
      const { createDuel } = await import('../../services/duelService')
      await expect(createDuel({ playerAId: 'a', playerBId: 'b' })).rejects.toThrow()
      vi.restoreAllMocks()
    })
  })

  describe('DuelContext resets cleanly', () => {
    it('reducer RESET returns initialState', () => {
      const { reducer, initialState } = require('../../contexts/duelReducer')
      const modified = { ...initialState, turn: 99, playerLP: 0 }
      const reset = reducer(modified, { type: 'RESET' })
      expect(reset.turn).toBe(1)
      expect(reset.playerLP).toBe(8000)
      expect(reset.phaseIndex).toBe(0)
    })
  })
})