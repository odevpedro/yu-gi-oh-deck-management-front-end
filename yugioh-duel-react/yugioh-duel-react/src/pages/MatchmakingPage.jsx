import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createDuel } from '../services/duelService'

export default function MatchmakingPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searching, setSearching] = useState(false)
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    let interval
    if (searching) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [searching])

  function startSearch() {
    setSearching(true)
    setTimer(0)
    setTimeout(async () => {
      try {
        const duel = await createDuel({
          playerAId: user.id,
          playerBId: `${user.id}-opponent`,
          playerADeckId: null,
          playerBDeckId: null,
        })
        setSearching(false)
        navigate(`/duel/${duel.duelId}`)
      } catch {
        setSearching(false)
      }
    }, 2000)
  }

  function cancelSearch() {
    setSearching(false)
    setTimer(0)
  }

  return (
    <main className="auth-shell">
      <section className="lobby-panel">
        <header className="lobby-header">
          <span>MATCHMAKING</span>
          <strong>{user?.username}</strong>
          <button type="button" onClick={() => navigate('/lobby')}>Voltar</button>
          <button type="button" onClick={logout}>Logout</button>
        </header>

        <div className="auth-form" style={{ textAlign: 'center', padding: '40px 20px' }}>
          {!searching ? (
            <>
              <p style={{ marginBottom: 24, color: '#aaa', fontSize: '0.85rem' }}>
                Procure por um oponente disponivel
              </p>
              <button className="auth-submit" onClick={startSearch}>
                PROCURAR OPONENTE
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: '2rem', marginBottom: 16 }} className="matchmaking-spinner">
                {'. . .'}
              </div>
              <p style={{ color: '#aaa', marginBottom: 12 }}>Procurando oponente...</p>
              <p style={{ color: '#666', marginBottom: 24, fontFamily: 'Orbitron, monospace' }}>
                {timer}s
              </p>
              <button className="ghost-button" onClick={cancelSearch}>
                CANCELAR
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}