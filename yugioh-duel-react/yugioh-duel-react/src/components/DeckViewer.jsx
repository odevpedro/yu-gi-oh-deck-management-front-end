// ═══════════════════════════════════════════════════════════
// DeckViewer.jsx — Modal de visualização do deck
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { createPortal }      from 'react-dom'
import { useDuel }           from '../contexts/DuelContext'
import { proxiedUrl }        from '../utils/cardHelpers'

export default function DeckViewer() {
  const { deckCards, deckRemaining, deckViewerOpen, setDeckViewerOpen } = useDuel()
  const panelRef = useRef(null)

  // entrance animation
  useEffect(() => {
    if (deckViewerOpen && panelRef.current) {
      panelRef.current.parentElement?.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, fill: 'forwards' }
      )
    }
  }, [deckViewerOpen])

  const close = () => setDeckViewerOpen(false)

  if (!deckViewerOpen) return null

  return createPortal(
    <div className="deck-viewer" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="dv-panel" ref={panelRef}>

        <div className="dv-header">
          <div className="dv-title">
            <span className="dv-icon">◈</span>
            <span>Main Deck</span>
          </div>
          <div className="dv-meta">{deckRemaining.length} cartas restantes</div>
          <button className="dv-close" onClick={close}>✕</button>
        </div>

        <div className="dv-rule-notice">
          <span>⚠</span>
          Visualização permitida apenas fora do duelo ativo. Durante o duelo, o deck deve permanecer oculto.
        </div>

        <div className="dv-grid">
          {deckCards.map((c, i) => {
            const inDeck = deckRemaining.includes(i)
            const imgUrl = proxiedUrl(c.card_images?.[0]?.image_url ?? '')
            return (
              <div
                key={c.id ?? i}
                className={`dv-card${inDeck ? '' : ' dv-card--used'}`}
                title={c.name}
              >
                {imgUrl
                  ? <img src={imgUrl} alt={c.name} loading="lazy" />
                  : <div className="dv-card-placeholder">{c.name}</div>
                }
              </div>
            )
          })}
        </div>

      </div>
    </div>,
    document.body
  )
}
