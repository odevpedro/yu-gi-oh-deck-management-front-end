// ═══════════════════════════════════════════════════════════
// GYViewer.jsx — Modal de visualização do cemitério
// ═══════════════════════════════════════════════════════════
import { useCallback } from 'react'
import { useDuel }     from '../contexts/DuelContext'
import { proxiedUrl }  from '../utils/cardHelpers'

export default function GYViewer() {
  const { gyViewer, setGyViewer, playerGY, opponentGY } = useDuel()

  const onClose = useCallback(() => setGyViewer(null), [setGyViewer])

  if (!gyViewer) return null

  const cards = gyViewer === 'player' ? playerGY : opponentGY
  const title = gyViewer === 'player' ? 'YOUR GRAVEYARD' : 'OPPONENT GRAVEYARD'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 900,
        background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #0a1428, #060e1c)',
          border: '1px solid rgba(46,143,212,.35)',
          borderTop: '2px solid rgba(46,143,212,.7)',
          borderRadius: '4px',
          padding: '20px',
          minWidth: '340px',
          maxWidth: '680px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,.8), 0 0 30px rgba(46,143,212,.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: '.55rem',
            fontWeight: 700, letterSpacing: '.14em',
            color: 'rgba(180,140,70,.9)',
          }}>
            ⚱ {title}
            <span style={{
              marginLeft: 10, fontSize: '.42rem', color: 'rgba(120,100,60,.6)',
            }}>
              {cards.length} CARD{cards.length !== 1 ? 'S' : ''}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid rgba(46,143,212,.3)',
              borderRadius: '2px', color: 'rgba(180,200,220,.6)',
              fontFamily: 'Orbitron, monospace', fontSize: '.4rem',
              padding: '3px 10px', cursor: 'pointer',
              letterSpacing: '.1em',
            }}
          >✕ CLOSE</button>
        </div>

        {/* Cards grid */}
        <div style={{
          overflowY: 'auto',
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          paddingRight: '4px',
        }}>
          {cards.length === 0 && (
            <div style={{
              width: '100%', textAlign: 'center',
              fontFamily: 'Orbitron, monospace', fontSize: '.42rem',
              color: 'rgba(100,120,150,.45)', padding: '20px 0',
              letterSpacing: '.1em',
            }}>EMPTY</div>
          )}
          {cards.map((card, i) => {
            const imgUrl = proxiedUrl(
              card?.card_images?.[0]?.image_url ?? card?.url ?? ''
            )
            const isMonster = !(card?.type?.toUpperCase().includes('SPELL') ||
                                card?.type?.toUpperCase().includes('TRAP'))
            const typeColor = card?.type?.toUpperCase().includes('SPELL')
              ? 'rgba(40,160,80,.7)'
              : card?.type?.toUpperCase().includes('TRAP')
                ? 'rgba(140,60,200,.7)'
                : 'rgba(180,130,40,.7)'
            return (
              <div key={`gy-${i}`} style={{
                width: '72px',
                border: `1px solid ${typeColor}`,
                borderRadius: '3px',
                overflow: 'hidden',
                background: 'rgba(4,8,16,.8)',
                position: 'relative',
                flexShrink: 0,
              }}>
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={card?.name ?? ''}
                    style={{ width: '100%', display: 'block', filter: 'brightness(.75) saturate(.6)' }}
                  />
                ) : (
                  <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.4rem' }}>💀</span>
                  </div>
                )}
                <div style={{
                  padding: '3px 4px',
                  fontFamily: 'Orbitron, monospace', fontSize: '.22rem',
                  color: 'rgba(160,180,200,.6)', lineHeight: 1.3,
                  borderTop: `1px solid ${typeColor}`,
                  textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                }}>
                  {card?.name ?? '?'}
                </div>
                {isMonster && card?.atk != null && (
                  <div style={{
                    position: 'absolute', top: 3, right: 3,
                    background: 'rgba(0,0,0,.75)', borderRadius: '2px',
                    padding: '1px 3px',
                    fontFamily: 'Orbitron, monospace', fontSize: '.22rem',
                    color: 'rgba(220,80,60,.8)',
                  }}>{card.atk}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}