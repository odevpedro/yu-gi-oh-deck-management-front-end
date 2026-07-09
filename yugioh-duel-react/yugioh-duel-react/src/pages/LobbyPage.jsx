import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createDuel } from '../services/duelService'
import { listDecks } from '../services/deckService'
import LoadingSpinner from '../components/LoadingSpinner'
import SoundToggle from '../components/SoundToggle'

function toggleTheme() {
  const next = !document.documentElement.classList.contains('light-theme')
  document.documentElement.classList.toggle('light-theme', next)
  localStorage.setItem('duel-theme', next ? 'light' : 'dark')
}

export default function LobbyPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [playerBId, setPlayerBId] = useState(`${user?.id ?? 'player'}-opponent`)
  const [decks, setDecks] = useState([])
  const [selectedDeck, setSelectedDeck] = useState('')
  const [decksLoading, setDecksLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || user.role === 'LOCAL') {
      setDecksLoading(false)
      return
    }
    listDecks()
      .then(data => {
        setDecks(data)
        if (data.length > 0) setSelectedDeck(String(data[0].id))
      })
      .catch(() => {})
      .finally(() => setDecksLoading(false))
  }, [user])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const duel = await createDuel({
        playerAId: user.id,
        playerBId,
        playerADeckId: selectedDeck || null,
        playerBDeckId: null,
      })
      navigate(`/duel/${duel.duelId}`)
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
          <button type="button" onClick={() => navigate('/history')}>Historico</button>
          <button type="button" onClick={() => navigate('/side-deck?duelId=')}>Side Deck</button>
          <button type="button" onClick={toggleTheme}>Tema</button>
          <SoundToggle />
          <button type="button" onClick={logout}>Logout</button>
        </header>

        <form className="auth-form" onSubmit={submit}>
          <label>
            Player A
            <input value={user?.id ?? ''} readOnly />
          </label>

          {user?.role !== 'LOCAL' && (
            <label>
              Deck
              {decksLoading ? (
                <LoadingSpinner message="CARREGANDO DECKS..." />
              ) : decks.length === 0 ? (
                <input value="Nenhum deck disponivel" readOnly disabled />
              ) : (
                <select value={selectedDeck} onChange={(e) => setSelectedDeck(e.target.value)}>
                  <option value="">Deck padrao (demo)</option>
                  {decks.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.mainDeckSize}/{d.extraDeckSize})
                    </option>
                  ))}
                </select>
              )}
            </label>
          )}

          <label>
            Player B
            <input value={playerBId} onChange={(event) => setPlayerBId(event.target.value)} required />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <div className="lobby-actions">
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar duelo'}
            </button>
            <button className="auth-submit" type="button" onClick={() => navigate('/matchmaking')} style={{ marginTop: 8 }}>
              Matchmaking
            </button>
            <button className="ghost-button" type="button" onClick={() => navigate('/duel/local')}>
              Duelo local
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
