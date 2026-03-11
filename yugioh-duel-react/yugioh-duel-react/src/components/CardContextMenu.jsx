// ═══════════════════════════════════════════════════════════
// CardContextMenu.jsx — Menu contextual acima da carta
// ═══════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useDuel }        from '../contexts/DuelContext'
import { engine } from '../engine'
import { cardType }       from '../utils/cardHelpers'

const TYPE_COLOR = {
  MONSTER: { pip: '#e8a820', border: 'rgba(232,168,32,.45)', glow: 'rgba(200,140,20,.25)' },
  SPELL:   { pip: '#2ab86a', border: 'rgba(42,184,106,.45)', glow: 'rgba(30,160,80,.25)'  },
  TRAP:    { pip: '#a040e0', border: 'rgba(160,64,224,.45)', glow: 'rgba(140,40,200,.25)' },
}

const ACTION_COLOR = {
  gold:    { text: '#f0c840', icon: '#f0c840', border: 'rgba(232,168,32,.5)',  bg: 'rgba(232,168,32,.06)' },
  red:     { text: '#e84455', icon: '#e84455', border: 'rgba(220,50,60,.5)',   bg: 'rgba(200,40,50,.06)'  },
  green:   { text: '#3ecf80', icon: '#3ecf80', border: 'rgba(42,184,106,.5)',  bg: 'rgba(30,160,80,.06)'  },
  blue:    { text: '#5ab4f0', icon: '#5ab4f0', border: 'rgba(46,143,212,.5)',  bg: 'rgba(30,110,180,.06)' },
  teal:    { text: '#30c8c8', icon: '#30c8c8', border: 'rgba(30,180,180,.5)',  bg: 'rgba(20,150,150,.06)' },
  purple:  { text: '#c060f0', icon: '#c060f0', border: 'rgba(160,64,224,.5)',  bg: 'rgba(140,40,200,.06)' },
  neutral: { text: 'rgba(180,200,230,.75)', icon: 'rgba(160,180,210,.6)', border: 'rgba(80,110,150,.3)', bg: 'rgba(255,255,255,.02)' },
  dim:     { text: 'rgba(120,130,150,.45)', icon: 'rgba(100,110,130,.35)', border: 'rgba(60,70,90,.2)',  bg: 'transparent' },
}

export default function CardContextMenu() {
  const {
    selectedCard, clearSelection,
    phase, occupiedZones, flags,
    executeAction, attackingZone,
  } = useDuel()

  const menuRef  = useRef(null)
  const [pos, setPos] = useState({ left: 0, top: 0, ready: false })
  const [tooltip, setTooltip] = useState(null)

  const actions = selectedCard
    ? engine.getAvailableActions({ selectedCard, phase, flags, occupiedZones })
    : []

  const anchor = selectedCard?.menuAnchor // { x, y, w, h }

  // ── Position menu above anchor ────────────────────────
  useEffect(() => {
    if (!anchor || !menuRef.current) return

    const menu = menuRef.current
    const mw   = menu.offsetWidth  || 180
    const mh   = menu.offsetHeight || 40

    const GAP  = 10
    let left   = anchor.x + anchor.w / 2 - mw / 2
    let top    = anchor.y - mh - GAP

    // Clamp horizontally
    const vw   = window.innerWidth
    if (left < 8)        left = 8
    if (left + mw > vw - 8) left = vw - mw - 8

    // If no room above, flip below
    if (top < 8) top = anchor.y + anchor.h + GAP

    setPos({ left, top, ready: true })
  }, [anchor, actions.length])

  // ── Close on outside click ────────────────────────────
  useEffect(() => {
    if (!selectedCard) return
    const handler = (e) => {
      // Não fechar durante ataque — o clique na zona do oponente
      // precisa processar o ataque antes do menu desaparecer
      if (attackingZone) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        clearSelection()
      }
    }
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 120)
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handler) }
  }, [selectedCard, attackingZone, clearSelection])

  const handleAction = useCallback((action) => {
    if (!action.available) return
    setTooltip(null)
    executeAction(action.id)
  }, [executeAction])

  if (!selectedCard) return null

  const card = selectedCard.card
  const ct   = cardType(card?.type || '')
  const tc   = TYPE_COLOR[ct] ?? TYPE_COLOR.MONSTER
  const loc  = selectedCard.location

  return (
    <>
    {createPortal(
    <div
      ref={menuRef}
      className="ccm"
      style={{
        left: pos.left,
        top:  pos.top,
        opacity: pos.ready ? 1 : 0,
        '--ccm-border': tc.border,
        '--ccm-glow':   tc.glow,
      }}
    >
      {/* Header — nome + contexto */}
      <div className="ccm-header">
        <div className="ccm-pip" style={{ background: tc.pip }} />
        <div className="ccm-header-text">
          <div className="ccm-name">{card?.name ?? '—'}</div>
          <div className="ccm-context">
            {loc === 'hand' ? 'HAND' : 'FIELD'} · {phase.label}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="ccm-sep" style={{ background: tc.border }} />

      {/* Actions */}
      <div className="ccm-actions">
        {actions.map(action => {
          const col = ACTION_COLOR[action.color] ?? ACTION_COLOR.neutral
          const isCancel = action.id === 'cancel'

          return (
            <button
              key={action.id}
              className={[
                'ccm-btn',
                action.available ? 'ccm-btn--on' : 'ccm-btn--off',
                isCancel ? 'ccm-btn--cancel' : '',
              ].filter(Boolean).join(' ')}
              style={action.available ? {
                '--btn-text':   col.text,
                '--btn-icon':   col.icon,
                '--btn-border': col.border,
                '--btn-bg':     col.bg,
              } : {}}
              onClick={() => handleAction(action)}
              onMouseEnter={e => {
                if (action.available || !action.reason) return
                const r = e.currentTarget.getBoundingClientRect()
                setTooltip({ reason: action.reason, x: r.right + 8, y: r.top + r.height / 2 })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className="ccm-btn-icon">{action.icon}</span>
              <span className="ccm-btn-label">{action.label}</span>
              {!action.available && <span className="ccm-btn-lock">⊘</span>}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )}
  {tooltip && createPortal(
    <div className="ccm-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
      {tooltip.reason}
    </div>,
    document.body
  )}
  </>
  )
}

/* Tooltip for unavailable actions — rendered outside portal to avoid clipping */
export function CardContextTooltip() {
  // Handled inline above; exported for future use
  return null
}