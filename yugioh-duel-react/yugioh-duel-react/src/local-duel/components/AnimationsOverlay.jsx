import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

function getZoneRect(player, location, sequence) {
  const isPlayer = Number(player) === 0
  let selector
  switch (location) {
    case 1: selector = isPlayer ? '#playerDeckZone' : '.field-side--opponent .zone--deck'; break
    case 2: selector = isPlayer ? '#playerHand' : '.opponent-hand-indicator'; break
    case 4: selector = `[data-zone-key="${isPlayer ? 'p' : 'o'}m${sequence}"]`; break
    case 8: selector = `[data-zone-key="${isPlayer ? 'p' : 'o'}s${sequence}"]`; break
    case 16: selector = isPlayer ? '.field-side--player .zone--gy' : '.field-side--opponent .zone--gy'; break
    case 32: selector = isPlayer ? '.field-side--player .zone--banished' : '.field-side--opponent .zone--banished'; break
    case 64: selector = isPlayer ? '.field-side--player .zone--extra' : '.field-side--opponent .zone--extra'; break
    default: return null
  }
  const el = document.querySelector(selector)
  if (!el) return null
  const rect = el.getBoundingClientRect()
  return { left: rect.left + rect.width * 0.5, top: rect.top + rect.height * 0.5 }
}

function FlyingCard({ code, style }) {
  return (
    <div style={{
      position: 'fixed', zIndex: 300, width: 60, height: 84, borderRadius: 4, overflow: 'hidden',
      border: '1px solid rgba(184,115,51,.6)', boxShadow: '0 6px 20px rgba(0,0,0,.7)', background: '#17120d',
      ...style,
    }}>
      {code
        ? <img src={`/local-assets/cards/${code}.jpg`} alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
        : <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(145deg, #0e1828, #090f1e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            <img src="/card-back.png" alt="" style={{ width: '80%', height: '80%', objectFit: 'contain', opacity: 0.6 }} />
          </div>
      }
    </div>
  )
}

function DrawAnimation({ data }) {
  if (!data) return null
  const [from, setFrom] = useState({ left: 0, top: 0 })
  const [to, setTo] = useState({ left: 0, top: 0 })
  const [phase, setPhase] = useState('entering')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const f = getZoneRect(data.player, 1, 0)
    const t = getZoneRect(data.player, 2, 0)
    if (f) setFrom({ left: f.left - 30, top: f.top - 42 })
    if (t) setTo({ left: t.left - 30, top: t.top - 42 })
    requestAnimationFrame(() => setPhase('flying'))
    const timer = setTimeout(() => {
      setPhase('landed')
      setTimeout(() => setVisible(false), 200)
    }, 450)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null
  return createPortal(
    <FlyingCard code={data.code} style={{
      left: phase === 'entering' ? from.left : to.left,
      top: phase === 'entering' ? from.top : to.top,
      transform: phase === 'entering' ? 'scale(0.5)' : 'scale(0.85)',
      opacity: phase === 'landed' ? 0 : 1,
      transition: 'left 0.35s cubic-bezier(.23,1,.32,1), top 0.35s cubic-bezier(.23,1,.32,1), transform 0.35s cubic-bezier(.23,1,.32,1), opacity 0.2s ease',
    }} />,
    document.body
  )
}

function MoveAnimation({ data }) {
  if (!data) return null
  const [from, setFrom] = useState({ left: 0, top: 0 })
  const [to, setTo] = useState({ left: 0, top: 0 })
  const [phase, setPhase] = useState('entering')
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const prev = data.previous
    const curr = data.current
    const f = getZoneRect(prev.controller, prev.location, prev.sequence)
    const t = getZoneRect(curr.controller, curr.location, curr.sequence)
    if (!f || !t) { setVisible(false); return }
    setFrom({ left: f.left - 30, top: f.top - 42 })
    setTo({ left: t.left - 30, top: t.top - 42 })
    requestAnimationFrame(() => setPhase('flying'))
    const timer = setTimeout(() => {
      setPhase('landed')
      setTimeout(() => setVisible(false), 200)
    }, 450)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null
  return createPortal(
    <FlyingCard code={data.code} style={{
      left: phase === 'entering' ? from.left : to.left,
      top: phase === 'entering' ? from.top : to.top,
      transform: phase === 'entering' ? 'scale(0.4)' : 'scale(0.85)',
      opacity: phase === 'landed' ? 0 : 1,
      transition: 'left 0.38s cubic-bezier(.23,1,.32,1), top 0.38s cubic-bezier(.23,1,.32,1), transform 0.38s cubic-bezier(.23,1,.32,1), opacity 0.18s ease',
    }} />,
    document.body
  )
}

function AttackArrow({ data }) {
  if (!data) return null
  const [coords, setCoords] = useState(null)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const atk = data.attacker
    const def = data.defender
    const atkR = getZoneRect(atk.controller, atk.location, atk.sequence)
    const defR = getZoneRect(def.controller, def.location, def.sequence)
    if (!atkR || !defR) { setVisible(false); return }
    setCoords({ x1: atkR.left, y1: atkR.top, x2: defR.left, y2: defR.top })

    let start = performance.now()
    let frameId
    function tick(now) {
      const elapsed = now - start
      const p = Math.min(elapsed / 900, 1)
      setProgress(p)
      if (p < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        const hideTimer = setTimeout(() => setVisible(false), 150)
        frameId = hideTimer
      }
    }
    frameId = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frameId); clearTimeout(frameId) }
  }, [])

  if (!coords || !visible) return null
  const cx = coords.x1 + (coords.x2 - coords.x1) * progress
  const cy = coords.y1 + (coords.y2 - coords.y1) * progress
  return createPortal(
    <>
      <svg style={{ position: 'fixed', inset: 0, zIndex: 250, pointerEvents: 'none', width: '100%', height: '100%' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#e8a820" />
          </marker>
        </defs>
        <line x1={coords.x1} y1={coords.y1} x2={coords.x2} y2={coords.y2}
          stroke="#e8a820" strokeWidth={3} strokeDasharray="8 4" markerEnd="url(#arrowhead)"
          className="anim-attack-line" />
      </svg>
      <div style={{
        position: 'fixed', zIndex: 251, pointerEvents: 'none',
        left: cx - 6, top: cy - 6,
        width: 12, height: 12, borderRadius: '50%',
        background: '#e8a820', opacity: 0.6,
      }} />
    </>,
    document.body
  )
}

function ChainOverlay({ data }) {
  if (!data) return null
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1200)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  return createPortal(
    <div className="anim-chain-overlay">
      <div className="anim-chain-ring">
        {Array.from({ length: Math.min(data.count || 1, 8) }, (_, i) => (
          <div key={i} className="anim-chain-link" style={{ animationDelay: `${i * 0.08}s` }}>
            <span>{i + 1}</span>
          </div>
        ))}
      </div>
      <span className="anim-chain-label">CORRENTE</span>
    </div>,
    document.body
  )
}

function RevealOverlay({ data }) {
  if (!data) return null
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!visible || !data.cards?.length) return null

  return createPortal(
    <div className="anim-reveal-overlay" onClick={() => setVisible(false)}>
      <div className="anim-reveal-label">CARTA REVELADA</div>
      <div className="anim-reveal-cards">
        {data.cards.slice(0, 5).map((card, i) => (
          <div key={i} className="anim-reveal-card">
            <img src={`/local-assets/cards/${card.code}.jpg`} alt=""
              onError={e => { e.target.style.display = 'none' }} />
            <span>{card.code}</span>
          </div>
        ))}
      </div>
      {data.cards.length > 5 && <span className="anim-reveal-more">+{data.cards.length - 5}</span>}
    </div>,
    document.body
  )
}

function SummonGlow({ data }) {
  const [rect, setRect] = useState(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = data?.controller != null
      ? document.querySelector(`[data-zone-key="${(data.controller === 0 ? 'p' : 'o')}m${data.sequence}"]`)
      : null
    if (!el) { setVisible(false); return }
    const r = el.getBoundingClientRect()
    setRect(r)
    const timer = setTimeout(() => setVisible(false), 600)
    return () => clearTimeout(timer)
  }, [])
  if (!visible || !rect) return null
  return createPortal(
    <div style={{
      position: 'fixed', zIndex: 240, pointerEvents: 'none',
      left: rect.left - 4, top: rect.top - 4,
      width: rect.width + 8, height: rect.height + 8,
      borderRadius: 4,
      boxShadow: '0 0 24px 10px rgba(232, 168, 32, .55)',
      animation: 'summon-glow-fade 0.55s ease-in-out 2 both',
    }} />,
    document.body
  )
}

function PosChangeAnimation({ data }) {
  const [rect, setRect] = useState(null)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = data?.card
      ? document.querySelector(`[data-zone-key="${(data.card.controller === 0 ? 'p' : 'o')}m${data.card.sequence}"]`)
      : null
    if (!el) { setVisible(false); return }
    const r = el.getBoundingClientRect()
    setRect(r)
    const timer = setTimeout(() => setVisible(false), 500)
    return () => clearTimeout(timer)
  }, [])
  if (!visible || !rect) return null
  return createPortal(
    <>
      <div style={{
        position: 'fixed', zIndex: 260, pointerEvents: 'none',
        left: rect.left, top: rect.top,
        width: rect.width, height: rect.height,
        background: 'rgba(232,168,32,.08)',
        border: '1px solid rgba(232,168,32,.4)',
        borderRadius: 3,
        animation: 'flip-overlay 0.35s ease-in-out both',
      }} />
      <div style={{
        position: 'fixed', zIndex: 261, pointerEvents: 'none',
        left: 0, right: 0, top: 0, bottom: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: '#e8a820', fontFamily: "'Orbitron', monospace",
          fontSize: '.55rem', letterSpacing: '.15em', opacity: 0.8,
          animation: 'fade-out 0.5s ease both',
        }}>POSICAO ALTERADA</span>
      </div>
    </>,
    document.body
  )
}

function ChainSolvingOverlay({ data }) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 400)
    return () => clearTimeout(timer)
  }, [])
  if (!visible) return null
  return createPortal(
    <div className="anim-chain-overlay">
      <div className="anim-chain-ring">
        <div className="anim-chain-link anim-chain-solving">
          <span>{data.chainCount}</span>
        </div>
      </div>
      <span className="anim-chain-label">RESOLVENDO</span>
    </div>,
    document.body
  )
}

export default function AnimationsOverlay({ animation }) {
  if (!animation) return null
  switch (animation.type) {
    case 'draw': return <DrawAnimation data={animation.data} />
    case 'move': return <MoveAnimation data={animation.data} />
    case 'attack': return <AttackArrow data={animation.data} />
    case 'chain': return <ChainOverlay data={animation.data} />
    case 'reveal': return <RevealOverlay data={animation.data} />
    case 'summoning':
    case 'spsummoning':
      return <SummonGlow data={animation.data} />
    case 'summoned':
    case 'spsummoned':
      return null
    case 'posChange': return <PosChangeAnimation data={animation.data} />
    case 'chainSolving': return <ChainSolvingOverlay data={animation.data} />
    case 'chainSolved': return null
    default: return null
  }
}
