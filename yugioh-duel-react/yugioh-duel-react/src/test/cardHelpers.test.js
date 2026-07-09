import { describe, it, expect } from 'vitest'
import { cardType, isExtraType, validZoneSelector, proxiedUrl } from '../utils/cardHelpers'

describe('cardType', () => {
  it('returns MONSTER for non-spell/trap types', () => {
    expect(cardType('Normal Monster')).toBe('MONSTER')
    expect(cardType('Effect Monster')).toBe('MONSTER')
    expect(cardType('Fusion Monster')).toBe('MONSTER')
  })

  it('returns SPELL for spell cards', () => {
    expect(cardType('Spell Card')).toBe('SPELL')
    expect(cardType('Quick-Play Spell')).toBe('SPELL')
    expect(cardType('Field Spell')).toBe('SPELL')
  })

  it('returns TRAP for trap cards', () => {
    expect(cardType('Trap Card')).toBe('TRAP')
    expect(cardType('Counter Trap')).toBe('TRAP')
  })

  it('defaults to MONSTER for unknown types', () => {
    expect(cardType('')).toBe('MONSTER')
    expect(cardType()).toBe('MONSTER')
  })
})

describe('isExtraType', () => {
  it('returns true for Fusion/Synchro/Xyz/Link/Ritual', () => {
    expect(isExtraType('Fusion Monster')).toBe(true)
    expect(isExtraType('Synchro Monster')).toBe(true)
    expect(isExtraType('XYZ Monster')).toBe(true)
    expect(isExtraType('Link Monster')).toBe(true)
    expect(isExtraType('Ritual Monster')).toBe(true)
  })

  it('returns false for Normal/Effect monsters', () => {
    expect(isExtraType('Normal Monster')).toBe(false)
    expect(isExtraType('Effect Monster')).toBe(false)
  })
})

describe('validZoneSelector', () => {
  it('returns monster zone for monster types', () => {
    expect(validZoneSelector('Normal Monster')).toContain('monster')
    expect(validZoneSelector('Effect Monster')).toContain('monster')
  })

  it('returns spell zone for spell/trap types', () => {
    expect(validZoneSelector('Spell Card')).toContain('spell')
    expect(validZoneSelector('Trap Card')).toContain('spell')
  })
})

describe('proxiedUrl', () => {
  const orig = import.meta.env.VITE_CORS_PROXY

  afterEach(() => {
    // Can't really restore, but tests are isolated
  })

  it('returns empty string for falsy input', () => {
    expect(proxiedUrl('')).toBe('')
    expect(proxiedUrl(null)).toBe('')
    expect(proxiedUrl(undefined)).toBe('')
  })

  it('returns raw URL for http/https sources', () => {
    const url = 'https://example.com/card.jpg'
    const result = proxiedUrl(url)
    expect(result).toBe(url)
  })

  it('returns raw data URLs as-is', () => {
    expect(proxiedUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc')
  })
})
