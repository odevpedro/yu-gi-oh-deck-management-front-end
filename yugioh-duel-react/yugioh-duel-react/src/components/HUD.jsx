import { useRef, useState, useEffect } from 'react'
import { useDuel } from '../contexts/DuelContext'
import { PHASES } from '../contexts/duelReducer'

export default function HUD() {
  const { turn, phase, phaseIndex, nextPhase, turnTimer, playerLP, opponentLP,
          setGameResult, setShowResult, setInstruction } = useDuel()
  const [showConfirm, setShowConfirm] = useState(false)

  const opBarRef = useRef(null)
  const opValRef = useRef(null)
  const plBarRef = useRef(null)
  const plValRef = useRef(null)

  const prevPlLp = useRef(playerLP)
  const prevOpLp = useRef(opponentLP)
  const flashRef = useRef(null)

  useEffect(() => {
    if (playerLP !== prevPlLp.current) {
      const el = plValRef.current
      if (el) {
        el.classList.remove('lp-flash', 'lp-flash-down', 'lp-flash-up')
        void el.offsetWidth
        el.classList.add('lp-flash', playerLP < prevPlLp.current ? 'lp-flash-down' : 'lp-flash-up')
        clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => el.classList.remove('lp-flash', 'lp-flash-down', 'lp-flash-up'), 700)
      }
      prevPlLp.current = playerLP
    }
  }, [playerLP])

  useEffect(() => {
    if (opponentLP !== prevOpLp.current) {
      const el = opValRef.current
      if (el) {
        el.classList.remove('lp-flash', 'lp-flash-down', 'lp-flash-up')
        void el.offsetWidth
        el.classList.add('lp-flash', opponentLP < prevOpLp.current ? 'lp-flash-down' : 'lp-flash-up')
        clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => el.classList.remove('lp-flash', 'lp-flash-down', 'lp-flash-up'), 700)
      }
      prevOpLp.current = opponentLP
    }
  }, [opponentLP])

  function handleConcede() {
    setGameResult({ isVictory: false, isDraw: false, playerLP, opponentLP, turn })
    setShowResult(true)
    setInstruction('VOCE CONCEDEU')
    setShowConfirm(false)
  }

  const opPct = Math.round((opponentLP / 8000) * 100)
  const plPct = Math.round((playerLP   / 8000) * 100)

  return (
    <header className="hud">
      <div className="hud-left">
        <button className="hud-concede" type="button" onClick={() => setShowConfirm(true)}>
          CONCEDER
        </button>
      </div>

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
        <div className="hud-timer">
          <div className="hud-timer-label">TURNO {turn}</div>
          <div className={`hud-timer-value ${turnTimer <= 10 ? 'hud-timer-warn' : ''}`}>{turnTimer}s</div>
        </div>
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

      {showConfirm && (
        <div className="confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="confirm-panel" onClick={e => e.stopPropagation()}>
            <div className="confirm-title">CONCEDER DUELO?</div>
            <div className="confirm-text">Tem certeza que deseja conceder?</div>
            <div className="confirm-actions">
              <button className="confirm-btn confirm-btn--yes" onClick={handleConcede}>
                CONCEDER
              </button>
              <button className="confirm-btn confirm-btn--no" onClick={() => setShowConfirm(false)}>
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
