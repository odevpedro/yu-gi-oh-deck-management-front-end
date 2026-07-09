import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function CardDetailModal({ card, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!card) return null

  const name = card.name || '—'
  const type = card.type || '—'
  const desc = card.desc || card.description || ''
  const atk = card.atk != null ? card.atk : null
  const def = card.def != null ? card.def : null
  const level = card.level != null ? card.level : null
  const imageUrl = card.card_images?.[0]?.image_url || card.imageUrl || ''

  const isMonster = atk != null

  return createPortal(
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-panel" onClick={e => e.stopPropagation()}>
        <button className="cdm-close" onClick={onClose}>✕</button>

        <div className="cdm-body">
          {imageUrl && (
            <div className="cdm-art-wrap">
              <img className="cdm-art" src={imageUrl} alt={name} />
            </div>
          )}

          <div className="cdm-info">
            <div className="cdm-name">{name}</div>
            <div className="cdm-type">{type}</div>

            {level != null && (
              <div className="cdm-level">
                {'★'.repeat(level)}{'☆'.repeat(Math.max(0, 12 - level))}
                <span> Level {level}</span>
              </div>
            )}

            {isMonster && (
              <div className="cdm-stats">
                <span className="cdm-stat cdm-stat--atk">ATK {atk}</span>
                <span className="cdm-stat cdm-stat--def">DEF {def}</span>
              </div>
            )}

            {desc && (
              <div className="cdm-desc">{desc}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
