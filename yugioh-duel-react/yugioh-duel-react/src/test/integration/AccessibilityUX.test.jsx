import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

describe('TEST-010: Accessibility and UX', () => {
  describe('HUD a11y', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.mock('../../contexts/DuelContext', () => ({
        useDuel: () => ({
          turn: 1, phase: { id: 'MAIN1' }, phaseIndex: 2, nextPhase: vi.fn(), turnTimer: 45,
          playerLP: 8000, opponentLP: 8000,
          setGameResult: vi.fn(), setShowResult: vi.fn(), setInstruction: vi.fn(),
        }),
      }))
    })

    it('has banner role', async () => {
      const HUD = (await import('../../components/HUD')).default
      const { container } = render(<HUD />)
      const header = container.querySelector('header')
      expect(header.getAttribute('role')).toBe('banner')
    })
  })

  describe('ResultScreen a11y', () => {
    beforeEach(() => {
      vi.resetModules()
      vi.mock('../../contexts/DuelContext', () => ({
        useDuel: () => ({
          gameResult: { isVictory: true, isDraw: false, playerLP: 8000, opponentLP: 0, turn: 3 },
          showResult: true, playerLP: 8000, opponentLP: 0, turn: 3,
        }),
      }))
    })

    it('has dialog role', async () => {
      const ResultScreen = (await import('../../components/ResultScreen')).default
      const { container } = render(<ResultScreen onBack={vi.fn()} />)
      const overlay = container.querySelector('.result-overlay')
      expect(overlay.getAttribute('role')).toBe('dialog')
      expect(overlay.getAttribute('aria-modal')).toBe('true')
    })
  })

  describe('UI feedback', () => {
    it('loading spinner shows message', async () => {
      const LoadingSpinner = (await import('../../components/LoadingSpinner')).default
      const { getByText } = render(<LoadingSpinner message="CARREGANDO..." />)
      expect(getByText('CARREGANDO...')).toBeTruthy()
    })
  })
})