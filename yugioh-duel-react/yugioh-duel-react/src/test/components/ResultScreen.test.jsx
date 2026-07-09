import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ResultScreen from '../../components/ResultScreen'

const mockOnBack = vi.fn()

vi.mock('../../contexts/DuelContext', () => ({
  useDuel: () => ({
    gameResult: { isVictory: true, isDraw: false, playerLP: 8000, opponentLP: 0, turn: 5 },
    showResult: true,
    playerLP: 8000,
    opponentLP: 0,
    turn: 5,
  }),
}))

describe('ResultScreen', () => {
  it('renders victory title when winning', () => {
    render(<ResultScreen onBack={mockOnBack} />)
    expect(screen.getByText('VITORIA')).toBeTruthy()
  })

  it('renders LP stats', () => {
    render(<ResultScreen onBack={mockOnBack} />)
    expect(screen.getByText('8000')).toBeTruthy()
    expect(screen.getByText('0')).toBeTruthy()
  })

  it('renders turn count', () => {
    render(<ResultScreen onBack={mockOnBack} />)
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders back button', () => {
    render(<ResultScreen onBack={mockOnBack} />)
    expect(screen.getByText('VOLTAR AO LOBBY')).toBeTruthy()
  })

  it('calls onBack when clicking back button', () => {
    render(<ResultScreen onBack={mockOnBack} />)
    fireEvent.click(screen.getByText('VOLTAR AO LOBBY'))
    expect(mockOnBack).toHaveBeenCalledOnce()
  })
})