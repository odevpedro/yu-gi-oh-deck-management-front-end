import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DuelField from '../../components/DuelField'

vi.mock('../../contexts/DuelContext', () => ({
  useDuel: () => ({
    turn: 1,
    phase: { id: 'MAIN1' },
    phaseIndex: 2,
    nextPhase: vi.fn(),
    instruction: 'SELECT A CARD',
    playerBanished: [],
    opponentBanished: [],
    handCards: [],
  }),
  PHASES: [
    { id: 'DRAW', label: 'Draw Phase', short: 'DRW' },
    { id: 'STANDBY', label: 'Standby Phase', short: 'STB' },
    { id: 'MAIN1', label: 'Main Phase 1', short: 'M1' },
    { id: 'BATTLE', label: 'Battle Phase', short: 'BTL' },
    { id: 'MAIN2', label: 'Main Phase 2', short: 'M2' },
    { id: 'END', label: 'End Phase', short: 'END' },
  ],
}))

vi.mock('../../components/Zone', () => ({ default: ({ type }) => <div data-testid={`zone-${type}`} /> }))
vi.mock('../../components/DeckZone', () => ({ default: () => <div data-testid="deck-zone" /> }))
vi.mock('../../components/PlayerHand', () => ({ default: () => <div data-testid="player-hand" /> }))
vi.mock('../../components/DuelLog', () => ({ default: () => <div data-testid="duel-log" /> }))

describe('DuelField', () => {
  it('renders turn number', () => {
    render(<DuelField />)
    expect(screen.getByText('TURN 1')).toBeTruthy()
  })

  it('renders phase tracker', () => {
    render(<DuelField />)
    expect(screen.getByTitle('MAIN 1')).toBeTruthy()
  })

  it('renders instruction', () => {
    render(<DuelField />)
    expect(screen.getByText('SELECT A CARD')).toBeTruthy()
  })

  it('renders all zone types', () => {
    render(<DuelField />)
    expect(screen.getAllByTestId(/zone-/).length).toBeGreaterThan(0)
  })
})