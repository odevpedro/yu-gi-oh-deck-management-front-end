// PhaseOverlay.jsx — Overlay de transição de fase
import { useEffect, useRef } from 'react'
import { createPortal }      from 'react-dom'
import { useDuel }           from '../contexts/DuelContext'

export default function PhaseOverlay() {
  const { phaseOverlay } = useDuel()
  const ref = useRef(null)

  useEffect(() => {
    if (!phaseOverlay || !ref.current) return
    ref.current.animate([
      { opacity: 0, transform: 'translateY(-12px) scale(.96)' },
      { opacity: 1, transform: 'translateY(0) scale(1)',   offset: .2 },
      { opacity: 1, transform: 'translateY(0) scale(1)',   offset: .7 },
      { opacity: 0, transform: 'translateY(8px) scale(.98)' },
    ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' })
  }, [phaseOverlay])

  if (!phaseOverlay) return null

  return createPortal(
    <div className="phase-overlay" ref={ref}>
      <div className="phase-overlay-name">{phaseOverlay.label}</div>
      <div className="phase-overlay-sub">PHASE</div>
    </div>,
    document.body
  )
}
