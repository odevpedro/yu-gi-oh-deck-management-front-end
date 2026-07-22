import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDuel } from '../contexts/DuelContext'
import HUD from '../components/HUD'
import ContextPanel from '../components/ContextPanel'
import DuelField from '../components/DuelField'
import PhaseOverlay from '../components/PhaseOverlay'
import ResultScreen from '../components/ResultScreen'
import LocalDuelInteractions from '../local-duel/components/LocalDuelInteractions'
import { BLUE_EYES_DECK, LocalDuelClient } from '../local-duel/duel/LocalDuelClient'
import { preloadCards } from '../local-duel/duel/cardDatabase'
import { mapLocalDuelState } from '../local-duel/localStateMapper'

const INITIAL_RUNTIME_STATE = {
  status: 'idle',
  statusText: 'Preparando ocgcore e WindBot...',
  players: ['', ''],
  localPlayer: 0,
  lp: [8000, 8000],
  turn: 0,
  turnPlayer: 0,
  phase: '',
  zones: {},
  deckCounts: [40, 40],
  extraCounts: [15, 15],
  prompt: null,
  winner: null,
  log: [],
  duelStarted: false,
}

export default function LocalDuelPage() {
  const navigate = useNavigate()
  const [runtimeState, setRuntimeState] = useState(INITIAL_RUNTIME_STATE)
  const [error, setError] = useState('')
  const clientRef = useRef(null)
  const stateHandlerRef = useRef(null)
  const mappingVersionRef = useRef(0)
  const { applyLocalState, configureRemoteTransport, resetDuel } = useDuel()

  stateHandlerRef.current = nextState => {
    setRuntimeState(nextState)
    const version = ++mappingVersionRef.current
    void mapLocalDuelState(nextState).then(mapped => {
      if (mappingVersionRef.current === version) applyLocalState(mapped)
    }).catch(reason => setError(reason.message || String(reason)))
  }

  if (!clientRef.current) {
    clientRef.current = new LocalDuelClient(nextState => stateHandlerRef.current?.(nextState))
  }
  const client = clientRef.current

  const start = async () => {
    setError('')
    try {
      await client.start('Local Player')
    } catch (reason) {
      setError(reason.message || String(reason))
      client.emit({ status: 'error', statusText: 'Falha ao iniciar o duelo local' })
    }
  }

  useEffect(() => {
    resetDuel()
    configureRemoteTransport({ sendAction: () => {}, advancePhase: () => {} })
    void preloadCards([...BLUE_EYES_DECK.main, ...BLUE_EYES_DECK.extra]).catch(() => {})
    const startTimer = setTimeout(() => { void start() }, 0)
    return () => {
      clearTimeout(startTimer)
      mappingVersionRef.current += 1
      client.disconnect()
      configureRemoteTransport(null)
    }
  }, [])

  return (
    <div className="local-duel-page" onClick={event => event.stopPropagation()}>
      <div className="session-strip">
        <span>OCGCORE LOCAL</span>
        <span>{runtimeState.statusText}</span>
        <button type="button" onClick={() => navigate('/')}>Início</button>
        <button type="button" onClick={() => { client.disconnect(); void start() }}>Reiniciar</button>
      </div>
      <HUD onConcede={() => client.surrender()} />
      <div className="board-layout">
        <ContextPanel />
        <div className="local-duel-board">
          <DuelField showPhaseButton={false} opponentHandCount={runtimeState.zones[`${runtimeState.localPlayer === 0 ? 1 : 0}:2`]?.filter(Boolean).length || 0} />
          <LocalDuelInteractions
            prompt={runtimeState.prompt}
            onLobby={(type, value) => client.respondLobby(type, value)}
            onGame={payload => client.respondGame(payload)}
          />
          {error && <p className="ocg-local-error">{error}</p>}
          <details className="ocg-local-log local-engine-log">
            <summary>Eventos do motor</summary>
            <div>{runtimeState.log.map((line, index) => <code key={`${line}-${index}`}>{line}</code>)}</div>
          </details>
        </div>
      </div>
      <PhaseOverlay />
      <ResultScreen
        actionLabel="JOGAR NOVAMENTE"
        onBack={() => { client.disconnect(); void start() }}
      />
    </div>
  )
}
