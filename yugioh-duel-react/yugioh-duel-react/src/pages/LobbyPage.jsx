import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { createDuel, getDuelState } from '../services/duelService'

export default function LobbyPage({ onStartLocal, onDuelCreated }) {
  const { user, logout } = useAuth()
  const [playerBId, setPlayerBId] = useState(`${user?.id ?? 'player'}-opponent`)
  const [playerADeckId, setPlayerADeckId] = useState('')
  const [playerBDeckId, setPlayerBDeckId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const duel = await createDuel({
        playerAId: user.id,
        playerBId,
        playerADeckId: playerADeckId ? Number(playerADeckId) : null,
        playerBDeckId: playerBDeckId ? Number(playerBDeckId) : null,
      })
      const initialState = await getDuelState(duel.duelId)
      onDuelCreated({ ...duel, initialState })
    } catch (err) {
      setError(err.message || 'Nao foi possivel criar o duelo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="lobby-panel">
        <header className="lobby-header">
          <div>
            <span>LOBBY</span>
            <strong>{user?.username}</strong>
          </div>
          <button type="button" onClick={logout}>Logout</button>
        </header>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Player A
            <input value={user?.id ?? ''} readOnly />
          </label>

          <label>
            Player B
            <input value={playerBId} onChange={(event) => setPlayerBId(event.target.value)} required />
          </label>

          <div className="form-grid">
            <label>
              Deck A
              <input type="number" min="1" value={playerADeckId} onChange={(event) => setPlayerADeckId(event.target.value)} placeholder="opcional" />
            </label>

            <label>
              Deck B
              <input type="number" min="1" value={playerBDeckId} onChange={(event) => setPlayerBDeckId(event.target.value)} placeholder="opcional" />
            </label>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="lobby-actions">
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar duelo'}
            </button>
            <button className="ghost-button" type="button" onClick={onStartLocal}>
              Modo local
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
