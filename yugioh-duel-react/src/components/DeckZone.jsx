// ═══════════════════════════════════════════════════════════
// DeckZone.jsx — Pilha do deck com draw e visualizador
// ═══════════════════════════════════════════════════════════
import { useRef, useCallback } from 'react'
import { useDuel }            from '../contexts/DuelContext'
import { drawCardAnimation }  from '../utils/fx'

export default function DeckZone() {
  const {
    deckRemaining, drawFromDeck, addCardToHand,
    canDraw, setDeckViewerOpen,
  } = useDuel()

  const zoneRef = useRef(null)
  const handRef = useCallback(() => document.getElementById('playerHand'), [])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    if (canDraw) {
      const card = drawFromDeck()
      if (!card) return
      // animate ghost → hand, then add to state
      drawCardAnimation(card, zoneRef.current, handRef(), () => {
        addCardToHand(card)
      })
    } else {
      setDeckViewerOpen(true)
    }
  }, [canDraw, drawFromDeck, addCardToHand, handRef, setDeckViewerOpen])

  const count = deckRemaining.length

  return (
    <div
      className="zone zone--deck"
      id="playerDeckZone"
      ref={zoneRef}
      onClick={handleClick}
      style={{ position: 'relative', overflow: 'visible', cursor: 'pointer' }}
    >
      <div className={`deck-pile${canDraw ? ' deck-pile--drawable' : ''}`}>
        <div className="deck-pile-cards">
          <div className="deck-pile-card dp-c3" />
          <div className="deck-pile-card dp-c2" />
          <div className="deck-pile-card dp-c1" />
        </div>
        <div className="deck-count">{count}</div>
        {canDraw && (
          <div className="deck-draw-hint">CLIQUE<br />COMPRAR</div>
        )}
      </div>
    </div>
  )
}
