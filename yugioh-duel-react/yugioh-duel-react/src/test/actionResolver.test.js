import { describe, it, expect } from 'vitest'
import { resolveActions } from '../utils/actionResolver'

const main1 = { id: 'MAIN1', label: 'MAIN 1' }
const battle = { id: 'BATTLE', label: 'BATTLE' }
const end = { id: 'END', label: 'END' }

const defaultFlags = {
  normalSummonedThisTurn: false,
  positionChangedThisTurn: false,
  attackedZones: new Set(),
}

function makeCard(overrides = {}) {
  return { id: 1, name: 'Test Card', type: 'Normal Monster', atk: 1500, def: 1000, level: 4, ...overrides }
}

function makeZone(zk, overrides = {}) {
  return { card: makeCard(), dataUrl: '', position: 'attack', faceDown: false, summonedThisTurn: false, ...overrides }
}

describe('resolveActions', () => {
  it('returns empty array when nothing selected', () => {
    expect(resolveActions(null, main1, defaultFlags, {}, 2)).toEqual([])
  })

  describe('monster in hand', () => {
    it('allows normal-summon and set for level 4 during Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ level: 4 }), location: 'hand', index: 0 },
        main1, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'normal-summon')?.available).toBe(true)
      expect(actions.find(a => a.id === 'set-monster')?.available).toBe(true)
    })

    it('blocks summon outside Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ level: 4 }), location: 'hand', index: 0 },
        battle, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'normal-summon')?.available).toBe(false)
    })

    it('blocks summon when already normal summoned this turn', () => {
      const actions = resolveActions(
        { card: makeCard({ level: 4 }), location: 'hand', index: 0 },
        main1, { ...defaultFlags, normalSummonedThisTurn: true }, {}, 2
      )
      expect(actions.find(a => a.id === 'normal-summon')?.available).toBe(false)
    })

    it('blocks summon when no free monster zones', () => {
      const oz = { pm0: makeZone('pm0'), pm1: makeZone('pm1'), pm2: makeZone('pm2'), pm3: makeZone('pm3'), pm4: makeZone('pm4') }
      const actions = resolveActions(
        { card: makeCard({ level: 4 }), location: 'hand', index: 0 },
        main1, defaultFlags, oz, 2
      )
      expect(actions.find(a => a.id === 'normal-summon')?.available).toBe(false)
    })

    it('offers tribute-summon for level 5+ monster with tributes available', () => {
      const oz = { pm0: makeZone('pm0') }
      const actions = resolveActions(
        { card: makeCard({ level: 5 }), location: 'hand', index: 0 },
        main1, defaultFlags, oz, 2
      )
      expect(actions.find(a => a.id === 'tribute-summon')?.available).toBe(true)
    })

    it('does not show tribute-summon for level 5+ with no tributes', () => {
      const actions = resolveActions(
        { card: makeCard({ level: 5 }), location: 'hand', index: 0 },
        main1, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'tribute-summon')).toBeUndefined()
    })

    it('offers special-summon for Extra Deck monsters', () => {
      const actions = resolveActions(
        { card: makeCard({ type: 'Fusion Monster' }), location: 'hand', index: 0 },
        main1, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'special-summon')?.available).toBe(true)
    })
  })

  describe('monster on field', () => {
    it('allows attack during Battle Phase', () => {
      const actions = resolveActions(
        { card: makeCard(), location: 'field', zoneKey: 'pm0', position: 'attack' },
        battle, defaultFlags, { pm0: makeZone('pm0') }, 2
      )
      expect(actions.find(a => a.id === 'attack')?.available).toBe(true)
    })

    it('blocks attack during Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard(), location: 'field', zoneKey: 'pm0', position: 'attack' },
        main1, defaultFlags, { pm0: makeZone('pm0') }, 2
      )
      expect(actions.find(a => a.id === 'attack')?.available).toBe(false)
    })

    it('blocks attack on first turn', () => {
      const actions = resolveActions(
        { card: makeCard(), location: 'field', zoneKey: 'pm0', position: 'attack' },
        battle, defaultFlags, { pm0: makeZone('pm0') }, 1
      )
      expect(actions.find(a => a.id === 'attack')?.available).toBe(false)
    })

    it('blocks attack when monster already attacked', () => {
      const flags = { ...defaultFlags, attackedZones: new Set(['pm0']) }
      const actions = resolveActions(
        { card: makeCard(), location: 'field', zoneKey: 'pm0', position: 'attack' },
        battle, flags, { pm0: makeZone('pm0') }, 2
      )
      expect(actions.find(a => a.id === 'attack')?.available).toBe(false)
    })
  })

  describe('spell/trap in hand', () => {
    it('allows activate-spell for spells in Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ type: 'Spell Card' }), location: 'hand', index: 0 },
        main1, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'activate-spell')?.available).toBe(true)
    })

    it('allows set-trap for traps in Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ type: 'Trap Card' }), location: 'hand', index: 0 },
        main1, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'set-trap')?.available).toBe(true)
    })

    it('blocks set-trap for traps outside Main Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ type: 'Trap Card' }), location: 'hand', index: 0 },
        battle, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'set-trap')?.available).toBe(false)
    })

    it('allows quick-play spells during Battle Phase', () => {
      const actions = resolveActions(
        { card: makeCard({ type: 'Quick-Play Spell' }), location: 'hand', index: 0 },
        battle, defaultFlags, {}, 2
      )
      expect(actions.find(a => a.id === 'activate-spell')?.available).toBe(true)
    })
  })

  it('always includes view-details and cancel', () => {
    const actions = resolveActions(
      { card: makeCard(), location: 'hand', index: 0 },
      main1, defaultFlags, {}, 2
    )
    expect(actions.find(a => a.id === 'view-details')?.available).toBe(true)
    expect(actions.find(a => a.id === 'cancel')?.available).toBe(true)
  })
})
