// ═══════════════════════════════════════════════════════════
// PlayerHand.jsx — Mão do jogador (leque fixo na viewport)
// ═══════════════════════════════════════════════════════════
import { useState, useCallback, useEffect } from 'react'
import { useDuel }   from '../contexts/DuelContext'
import CardWrap      from './CardWrap'
import { cardType }  from '../utils/cardHelpers'

export default function PlayerHand() {
  const { handCards } = useDuel()
  const [hovered,  setHovered]  = useState(null)
  const [selected, setSelected] = useState(null)

  // ── Highlight valid zones ─────────────────────────────
  const highlightZones = useCallback((type, active) => {
    const monsterSel = '#playerZones .zone--monster'
    const spellSel   = '#playerSpellZones .zone--spell'
    document.querySelectorAll('.zone').forEach(z => {
      z.classList.remove('drop-target', 'zone--invalid')
    })
    if (!active) return
    const validSel   = (type === 'SPELL' || type === 'TRAP') ? spellSel : monsterSel
    const invalidSel = (type === 'SPELL' || type === 'TRAP') ? monsterSel : spellSel
    document.querySelectorAll(validSel).forEach(z => {
      if (!z.classList.contains('occupied')) z.classList.add('drop-target')
    })
    document.querySelectorAll(invalidSel).forEach(z => {
      if (!z.classList.contains('occupied')) z.classList.add('zone--invalid')
    })
  }, [])

  const onHover = useCallback((index, type) => {
    setHovered(index)
    highlightZones(type, true)
  }, [highlightZones])

  const onLeave = useCallback((index, type) => {
    setHovered(null)
    if (selected === null) highlightZones(type, false)
  }, [selected, highlightZones])

  const onSelect = useCallback((index, type) => {
    setSelected(prev => {
      const next = prev === index ? null : index
      highlightZones(type, next !== null)
      return next
    })
  }, [highlightZones])

  // click outside deselects
  useEffect(() => {
    const onClick = e => {
      if (!e.target.closest('.card-wrap') && selected !== null) {
        const prevType = cardType(handCards[selected]?.type || '')
        setSelected(null)
        highlightZones(prevType, false)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [selected, handCards, highlightZones])

  return (
    <div className="hand" id="playerHand">
      {handCards.map((card, i) => (
        <CardWrap
          key={`${card.id ?? 'x'}-${i}`}
          card={card}
          index={i}
          total={handCards.length}
          hovered={hovered}
          selected={selected}
          onHover={onHover}
          onLeave={onLeave}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
