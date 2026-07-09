import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayerHistory } from '../services/duelService'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function HistoryPage() {
  const { player } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [duels, setDuels] = useState([])

  useEffect(() => {
    if (!player?.id) return
    getPlayerHistory(player.id)
      .then(setDuels)
      .catch(e => setError(e.message ?? 'Erro ao carregar historico'))
      .finally(() => setLoading(false))
  }, [player?.id])

  if (loading) return <div className="history-page"><LoadingSpinner /></div>
  if (error) return <div className="history-page"><p className="history-error">{error}</p></div>

  return (
    <div className="history-page">
      <header className="history-header">
        <button className="history-back" type="button" onClick={() => navigate('/lobby')}>
          &larr; LOBBY
        </button>
        <h1>HISTORICO DE DUELOS</h1>
      </header>

      {duels.length === 0 && (
        <p className="history-empty">Nenhum duelo encontrado.</p>
      )}

      <div className="history-list">
        {duels.map(duel => {
          const isPlayerA = duel.playerAId === player.id
          const myLp = isPlayerA ? duel.playerAFinalLp : duel.playerBFinalLp
          const opLp = isPlayerA ? duel.playerBFinalLp : duel.playerAFinalLp
          const won = duel.winnerId === player.id
          const date = duel.finishedAt
            ? new Date(duel.finishedAt).toLocaleDateString('pt-BR')
            : '—'

          return (
            <div key={duel.duelId} className={`history-card ${won ? 'history-win' : 'history-loss'}`}>
              <div className="history-result-badge">{won ? 'VITORIA' : 'DERROTA'}</div>
              <div className="history-info">
                <span className="history-date">{date}</span>
                <span className="history-lp">LP {myLp} &times; {opLp}</span>
                <span className="history-turns">{duel.turnCount} turnos</span>
                <span className="history-type">{duel.duelType}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
