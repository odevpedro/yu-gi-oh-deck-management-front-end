import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HUD from '../../components/HUD'

const mockSetGameResult = vi.fn()
const mockSetShowResult = vi.fn()
const mockSetInstruction = vi.fn()

vi.mock('../../contexts/DuelContext', () => ({
  useDuel: () => ({
    turn: 2,
    phase: { id: 'MAIN1', label: 'MAIN 1' },
    phaseIndex: 2,
    nextPhase: vi.fn(),
    turnTimer: 45,
    playerLP: 5000,
    opponentLP: 8000,
    setGameResult: mockSetGameResult,
    setShowResult: mockSetShowResult,
    setInstruction: mockSetInstruction,
  }),
}))

describe('HUD', () => {
  it('renders LP values', () => {
    render(<HUD />)
    expect(screen.getByText('8000')).toBeTruthy()
    expect(screen.getByText('5000')).toBeTruthy()
  })

  it('renders turn number', () => {
    render(<HUD />)
    expect(screen.getByText('TURNO 2')).toBeTruthy()
  })

  it('renders concede button', () => {
    render(<HUD />)
    expect(screen.getByText('CONCEDER')).toBeTruthy()
  })

  it('shows confirm dialog on concede click', () => {
    render(<HUD />)
    fireEvent.click(screen.getByText('CONCEDER'))
    expect(screen.getByText('Tem certeza que deseja conceder?')).toBeTruthy()
  })

  it('renders timer', () => {
    render(<HUD />)
    expect(screen.getByText('45s')).toBeTruthy()
  })

  it('renders player names', () => {
    render(<HUD />)
    expect(screen.getByText('KAIBA')).toBeTruthy()
    expect(screen.getByText('VOCÊ')).toBeTruthy()
  })
})