import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Zone from '../../components/Zone'

const defaultOccupiedZones = {}

vi.mock('../../contexts/DuelContext', () => ({
  useDuel: () => ({
    occupiedZones: defaultOccupiedZones,
    dragState: { active: false, fromIndex: null, card: null },
    attackingZone: null,
    selectedCard: null,
    activeAction: null,
    pendingSummon: null,
    playerGY: [],
    opponentGY: [],
    isRemoteDuel: false,
    placeCardInZone: vi.fn(),
    removeCardFromHand: vi.fn(),
    endDrag: vi.fn(),
    dealDamage: vi.fn(),
    setInstruction: vi.fn(),
    sendToGraveyard: vi.fn(),
    setOccupiedZones: vi.fn(),
    updatePanel: vi.fn(),
    selectCard: vi.fn(),
    clearSelection: vi.fn(),
    setAttackingZone: vi.fn(),
    sendRemoteAttackTarget: vi.fn(),
    sendRemoteCardToZone: vi.fn(),
    pendingSummon: null,
    addTribute: vi.fn(),
    cancelPendingSummon: vi.fn(),
  }),
}))

vi.mock('../../engine', () => ({ engine: { handleAttackTarget: vi.fn() } }))
vi.mock('../../utils/logger', () => ({ logger: { attack: vi.fn() } }))

describe('Zone', () => {
  it('renders empty monster zone with label', () => {
    render(<Zone zoneKey="pm0" type="monster" side="player" dataZone={0} />)
    expect(screen.getByText('MONSTER')).toBeTruthy()
  })

  it('renders empty spell zone with label', () => {
    render(<Zone zoneKey="ps0" type="spell" side="player" dataZone="s0" />)
    expect(screen.getByText('SPELL/TRAP')).toBeTruthy()
  })

  it('renders empty GY zone', () => {
    render(<Zone type="gy" side="player" label="GRAVEYARD" />)
    expect(screen.getByText('GRAVEYARD')).toBeTruthy()
  })

  it('renders empty extra zone', () => {
    render(<Zone type="extra" side="player" label="EXTRA (0)" />)
    expect(screen.getByText('EXTRA (0)')).toBeTruthy()
  })

  it('renders opponent zone with label', () => {
    render(<Zone zoneKey="om0" type="monster" side="opponent" dataZone={0} />)
    expect(screen.getByText('MONSTER')).toBeTruthy()
  })

  it('has correct CSS classes for monster zone', () => {
    const { container } = render(<Zone zoneKey="pm0" type="monster" side="player" dataZone={0} />)
    const el = container.firstChild
    expect(el.className).toContain('zone--monster')
    expect(el.className).toContain('zone')
  })

  it('renders with zone class', () => {
    const { container } = render(<Zone zoneKey="pm0" type="monster" side="player" dataZone={0} />)
    expect(container.firstChild.className).toContain('zone')
  })
})