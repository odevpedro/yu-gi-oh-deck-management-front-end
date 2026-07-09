import { useDuel } from '../contexts/DuelContext'
import { useEffect, useState } from 'react'

export default function ResultScreen({ onBack }) {
  const { gameResult, showResult, playerLP, opponentLP, turn } = useDuel()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (showResult) {
      setVisible(true)
    }
  }, [showResult])

  if (!visible || !gameResult) return null

  const isVictory = gameResult.isDraw ? null : gameResult.isVictory
  const title = gameResult.isDraw ? 'EMPATE' : isVictory ? 'VITORIA' : 'DERROTA'
  const titleClass = gameResult.isDraw ? 'result--draw' : isVictory ? 'result--win' : 'result--lose'

  function handleBack() {
    setVisible(false)
    onBack?.()
  }

  return (
    <div className={`result-overlay ${titleClass}`} onClick={() => setVisible(false)} role="dialog" aria-modal="true" aria-label={`Resultado: ${title}`}>
      <div className="result-panel" onClick={(e) => e.stopPropagation()}>
        <div className="result-title" id="result-title">{title}</div>
        <div className="result-divider" />
        <div className="result-stats" role="list" aria-label="Estatisticas finais">
          <div className="result-stat" role="listitem">
            <span className="result-stat-label">SEUS LP</span>
            <span className="result-stat-value">{playerLP}</span>
          </div>
          <div className="result-stat" role="listitem">
            <span className="result-stat-label">LP OPONENTE</span>
            <span className="result-stat-value">{opponentLP}</span>
          </div>
          <div className="result-stat" role="listitem">
            <span className="result-stat-label">TURNOS</span>
            <span className="result-stat-value">{turn}</span>
          </div>
        </div>
        <div className="result-actions">
          <button className="result-btn result-btn--primary" onClick={handleBack} autoFocus>
            VOLTAR AO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
