// ═══════════════════════════════════════════════════════════
// HUD.jsx — Barra superior: LP + fases
// ═══════════════════════════════════════════════════════════
import { useRef } from 'react'
import { useDuel, PHASES } from '../contexts/DuelContext'
import { lpDamageFX } from '../utils/fx'

export default function HUD() {
  const { turn, phase, phaseIndex, nextPhase, playerLP, opponentLP } = useDuel()

  const opBarRef = useRef(null)
  const opValRef = useRef(null)
  const plBarRef = useRef(null)
  const plValRef = useRef(null)

  const opPct = Math.round((opponentLP / 8000) * 100)
  const plPct = Math.round((playerLP   / 8000) * 100)

  return (
    <header className="hud">
      {/* Opponent */}
      <div className="player-info">
        <div className="avatar">&#9876;</div>
        <div>
          <div className="player-name">KAIBA</div>
          <div className="lp-wrap">
            <div className="lp-label">LIFE POINTS</div>
            <div className="lp-bar" id="opponentLpBar" ref={opBarRef}>
              <div className="lp-fill red" style={{ width: opPct + '%' }} />
            </div>
          </div>
        </div>
        <div className="lp-val" id="opponentLpVal" ref={opValRef}>{opponentLP}</div>
      </div>



      {/* Player */}
      <div className="player-info">
        <div className="lp-val" id="playerLpVal" ref={plValRef}>{playerLP}</div>
        <div>
          <div className="player-name" style={{ textAlign: 'right' }}>VOCÊ</div>
          <div className="lp-wrap" style={{ alignItems: 'flex-end' }}>
            <div className="lp-label">LIFE POINTS</div>
            <div className="lp-bar" id="playerLpBar" ref={plBarRef}>
              <div className="lp-fill blue" style={{ width: plPct + '%' }} />
            </div>
          </div>
        </div>
        <div className="avatar gold">&#128737;</div>
      </div>
    </header>
  )
}