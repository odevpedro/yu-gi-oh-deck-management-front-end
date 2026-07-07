import { useEffect, useCallback, useState } from 'react'
import { DuelProvider, useDuel } from './contexts/DuelContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import HUD          from './components/HUD'
import ContextPanel from './components/ContextPanel'
import DuelField    from './components/DuelField'
import DeckViewer   from './components/DeckViewer'
import PhaseOverlay from './components/PhaseOverlay'
import CardContextMenu from './components/CardContextMenu'
import DebugPanel     from './components/DebugPanel'
import ResultScreen from './components/ResultScreen'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import { advancePhase, createDuelClient, sendAction } from './services/duelWebSocket'
import { getAccessToken } from './services/tokenManager'

function DuelApp({ session, onExit }) {
  const { initDeck, setHandCards, clearSelection, selectedCard, applyRemoteState, setInstruction, configureRemoteTransport } = useDuel()
  const { user, logout } = useAuth()

  useEffect(() => {
    if (session?.mode === 'remote') {
      if (session.initialState) {
        applyRemoteState(session.initialState, user.id)
      }

      const token = getAccessToken()
      if (!token) {
        setInstruction('TOKEN AUSENTE PARA WEBSOCKET')
        return undefined
      }

      const client = createDuelClient({
        duelId: session.duelId,
        token,
        onStateUpdate: (state) => applyRemoteState(state, user.id),
        onGameOver: (payload) => {
          const winnerId = typeof payload === 'string' ? payload : payload?.winnerId
          setInstruction(winnerId === user.id ? 'VITORIA' : 'DERROTA')
        },
        onError: (message) => setInstruction(message),
      })

      configureRemoteTransport({
        sendAction: (action) => sendAction(client, { duelId: session.duelId, ...action }),
        advancePhase: () => advancePhase(client, session.duelId),
      })

      return () => {
        configureRemoteTransport(null)
        client.deactivate()
      }
    }

    initDeck()
    const urls = [
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Fusion+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Synchro+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=XYZ+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Link+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Effect+Monster&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Spell+Card&num=1&offset=0',
      'https://db.ygoprodeck.com/api/v7/cardinfo.php?type=Trap+Card&num=1&offset=0',
    ]
    Promise.all(urls.map(u => fetch(u).then(r => r.json())))
      .then(results => setHandCards(results.map(r => r.data[0])))
      .catch(() => setHandCards(Array.from({ length: 7 }, (_, i) => ({
        id: i + 1, name: `Card ${i+1}`,
        type: ['Fusion Monster','Synchro Monster','XYZ Monster','Link Monster',
               'Effect Monster','Spell Card','Trap Card'][i],
        card_images: [{ image_url: '' }],
      }))))
    return undefined
  }, [session, user.id, applyRemoteState, initDeck, setHandCards, setInstruction, configureRemoteTransport])

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
        <span>{session?.duelId ? `DUEL ${session.duelId}` : 'LOCAL DUEL'}</span>
        <span>{user?.username}</span>
        <button type="button" onClick={onExit}>Lobby</button>
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
      <ResultScreen />
    </div>
  )
}

function AppContent() {
  const { user, loading } = useAuth()
  const [session, setSession] = useState(null)

  if (loading) {
    return <div className="auth-shell"><div className="auth-panel">Carregando...</div></div>
  }

  if (!user) {
    return <LoginPage />
  }

  if (!session) {
    return (
      <LobbyPage
        onStartLocal={() => setSession({ mode: 'local' })}
        onDuelCreated={(duel) => setSession({ mode: 'remote', ...duel })}
      />
    )
  }

  return <DuelApp session={session} onExit={() => setSession(null)} />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DuelProvider>
          <AppContent />
        </DuelProvider>
      </ToastProvider>
    </AuthProvider>
  )
}
