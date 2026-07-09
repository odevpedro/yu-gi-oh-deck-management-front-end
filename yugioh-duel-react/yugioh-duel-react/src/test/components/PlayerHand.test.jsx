import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PlayerHand from '../../components/PlayerHand'

vi.mock('../../contexts/DuelContext', () => ({
  useDuel: () => ({
    handCards: [
      { id: 1, name: 'Card A', type: 'Normal Monster', card_images: [{ image_url: '' }] },
      { id: 2, name: 'Card B', type: 'Spell Card', card_images: [{ image_url: '' }] },
    ],
    dragState: { active: false, fromIndex: null, card: null },
    startDrag: vi.fn(),
    endDrag: vi.fn(),
    selectCard: vi.fn(),
    clearSelection: vi.fn(),
    activeAction: null,
    setActiveAction: vi.fn(),
  }),
}))

describe('PlayerHand', () => {
  it('renders all cards', () => {
    const { container } = render(<PlayerHand />)
    const handDiv = container.querySelector('.hand')
    expect(handDiv).toBeTruthy()
  })

  it('renders without crashing', () => {
    const { container } = render(<PlayerHand />)
    expect(container.querySelector('#playerHand')).toBeTruthy()
  })
})