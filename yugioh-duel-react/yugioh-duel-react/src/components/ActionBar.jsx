// ═══════════════════════════════════════════════════════════
// ActionBar.jsx — Barra de ações contextual deslizante
// ═══════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDuel }          from '../contexts/DuelContext'
import { resolveActions }   from '../utils/actionResolver'
import { cardType }         from '../utils/cardHelpers'
import { showPhaseBlock }   from '../utils/fx'

// Color map for action buttons
const COLOR_VARS = {
  gold:    { border: 'rgba(255,200,50,.55)',  glow: 'rgba(255,180,30,.35)',  text: '#ffc832' },
  red:     { border: 'rgba(255,60,60,.55)',   glow: 'rgba(255,40,40,.35)',   text: '#ff5050' },
  green:   { border: 'rgba(0,220,100,.55)',   glow: 'rgba(0,200,80,.35)',    text: '#00dc64' },
  blue:    { border: 'rgba(60,150,255,.55)',  glow: 'rgba(40,130,255,.35)',  text: '#4898ff' },
  teal:    { border: 'rgba(0,200,200,.55)',   glow: 'rgba(0,180,180,.35)',   text: '#00c8c8' },
  purple:  { border: 'rgba(180,0,255,.55)',   glow: 'rgba(160,0,220,.35)',   text: '#b400ff' },
  neutral: { border: 'rgba(180,200,220,.3)',  glow: 'rgba(150,170,200,.2)',  text: 'rgba(200,220,240,.7)' },
  dim:     { border: 'rgba(120,130,150,.2)',  glow: 'none',                  text: 'rgba(150,160,180,.4)' },
}

export default function ActionBar() {
  const {
    selectedCard, clearSelection,
    phase, occupiedZones,
    flags, executeAction,
    updatePanel,
  } = useDuel()

  const [tooltip, setTooltip] = useState(null) // { id, reason, x, y }
  const barRef  = useRef(null)

  const actions = selectedCard
    ? resolveActions(selectedCard, phase, flags, occupiedZones)
    : []

  const visible = !!selectedCard

  // ── entrance animation ────────────────────────────────
  useEffect(() => {
    if (!barRef.current) return
    if (visible) {
      barRef.current.animate([
        { transform: 'translateY(100%)', opacity: 0 },
        { transform: 'translateY(0)',    opacity: 1 },
      ], { duration: 240, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
    }
  }, [visible, selectedCard?.card?.id])

  const handleAction = useCallback((action) => {
    if (!action.available) return
    executeAction(action.id)
    setTooltip(null)
  }, [executeAction])

  const handleMouseEnter = useCallback((e, action) => {
    if (action.available || !action.reason) return
    const r = e.currentTarget.getBoundingClientRect()
    setTooltip({ id: action.id, reason: action.reason, x: r.left + r.width / 2, y: r.top })
  }, [])

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  if (!visible) return null

  const card = selectedCard.card
  const loc  = selectedCard.location
  const ct   = cardType(card?.type || '')

  const typeColor = ct === 'SPELL' ? '#00dc64' : ct === 'TRAP' ? '#b400ff' : '#ffc832'

  return (
    <>
      {/* ── Action bar ── */}
      <div className="action-bar" ref={barRef}>

        {/* Card identity */}
        <div className="ab-identity">
          <div className="ab-type-pip" style={{ background: typeColor }} />
          <div className="ab-card-info">
            <div className="ab-card-name">{card?.name ?? '—'}</div>
            <div className="ab-card-sub">
              {loc === 'hand' ? 'NA MÃO' : 'NO CAMPO'}
              {' · '}
              {phase.label} PHASE
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="ab-divider" />

        {/* Action buttons */}
        <div className="ab-actions">
          {actions.map(action => {
            const col = COLOR_VARS[action.color] ?? COLOR_VARS.neutral
            const isCancel  = action.id === 'cancel'
            const isDetails = action.id === 'view-details'

            return (
              <button
                key={action.id}
                className={`ab-btn ${action.available ? 'ab-btn--on' : 'ab-btn--off'} ${isCancel ? 'ab-btn--cancel' : ''}`}
                style={action.available ? {
                  '--btn-border': col.border,
                  '--btn-glow':   col.glow,
                  '--btn-text':   col.text,
                } : {}}
                onClick={() => handleAction(action)}
                onMouseEnter={e => handleMouseEnter(e, action)}
                onMouseLeave={handleMouseLeave}
                disabled={false} // we handle disabled visually, not natively
              >
                <span className="ab-btn-icon">{action.icon}</span>
                <span className="ab-btn-label">{action.label}</span>
                {!action.available && (
                  <span className="ab-btn-lock">⊘</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tooltip for disabled actions ── */}
      {tooltip && (
        <div
          className="ab-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.reason}
        </div>
      )}
    </>
  )
}
