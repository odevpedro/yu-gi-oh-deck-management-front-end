import { useEffect, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDuel } from '../contexts/DuelContext'
import { useAuth } from '../contexts/AuthContext'
import { useAiOpponent } from '../hooks/useAiOpponent'
import HUD          from '../components/HUD'
import ContextPanel from '../components/ContextPanel'
import DuelField    from '../components/DuelField'
import DeckViewer   from '../components/DeckViewer'
import PhaseOverlay from '../components/PhaseOverlay'
import CardContextMenu from '../components/CardContextMenu'
import DebugPanel     from '../components/DebugPanel'
import ResultScreen from '../components/ResultScreen'
import CardDetailModal from '../components/CardDetailModal'
import { searchCards } from '../services/cardService'
import { advancePhase, createDuelClient, sendAction } from '../services/duelWebSocket'
import { getAccessToken } from '../services/tokenManager'
import { getDuelState } from '../services/duelService'

export default function DuelPage() {
  const { duelId } = useParams()
  const navigate = useNavigate()
  const isLocal = !duelId || ['local', 'undefined', 'null'].includes(duelId)
  const [lightTheme, setLightTheme] = useState(() => localStorage.getItem('duel-theme') === 'light')

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', lightTheme)
    localStorage.setItem('duel-theme', lightTheme ? 'light' : 'dark')
  }, [lightTheme])

  const {
    initDeck, setHandCards, clearSelection, selectedCard,
    applyRemoteState, setInstruction, configureRemoteTransport, setShowResult, resetDuel,
    initOpponent, detailCard, setDetailCard,
  } = useDuel()

  const { user, logout } = useAuth()

  useEffect(() => { resetDuel() }, [])

  useAiOpponent(isLocal)

  useEffect(() => {
    if (isLocal) {
      initDeck()
      initOpponent()
      const types = ['Fusion Monster','Synchro Monster','XYZ Monster','Link Monster',
                     'Effect Monster','Spell Card','Trap Card']
      Promise.all(types.map(t => searchCards({ type: t, size: 1 }).catch(() => null)))
        .then(results => setHandCards(results.map((r, i) =>
          r?.[0] ?? { id: i + 1, name: `Card ${i+1}`, type: types[i], card_images: [{ image_url: '' }] }
        )))
      return undefined
    }

    getDuelState(duelId).then(state => {
      if (state) applyRemoteState(state, user.id)
    }).catch(() => {})

    const token = getAccessToken()
    if (!token) {
      setInstruction('TOKEN AUSENTE PARA WEBSOCKET')
      return undefined
    }

    const client = createDuelClient({
      duelId,
      token,
      onStateUpdate: (state) => applyRemoteState(state, user.id),
      onGameOver: (payload) => {
        setShowResult(true)
      },
      onError: (message) => setInstruction(message),
    })

    configureRemoteTransport({
      sendAction: (action) => sendAction(client, { duelId, ...action }),
      advancePhase: () => advancePhase(client, duelId),
    })

    return () => {
      configureRemoteTransport(null)
      client.deactivate()
    }
  }, [duelId, user.id])

  const onBgClick = useCallback((e) => {
    if (!e.target.closest('.card-wrap') && !e.target.closest('[data-zone-key]')
        && !e.target.closest('.action-bar') && !e.target.closest('.ccm')
        && selectedCard) {
      clearSelection()
    }
  }, [selectedCard, clearSelection])

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      onClick={onBgClick}
    >
      <div className="session-strip">
        <span>{isLocal ? 'LOCAL DUEL' : `DUEL ${duelId}`}</span>
        <span>{user?.username}</span>
        <button type="button" onClick={() => navigate('/lobby')}>Lobby</button>
        <button type="button" onClick={() => setLightTheme(p => !p)}>
          {lightTheme ? 'ESCURO' : 'CLARO'}
        </button>
        <button type="button" onClick={logout}>Logout</button>
      </div>
      <HUD />
      <DebugPanel />
      <div className="board-layout">
        <ContextPanel />
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', position:'relative', minWidth:0, height:'100%' }}>
          <DuelField />
        </div>
      </div>
      <PhaseOverlay />
      <DeckViewer />
      <CardContextMenu />
      <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)} />
      <ResultScreen onBack={() => navigate('/lobby')} />
    </div>
  )
}
