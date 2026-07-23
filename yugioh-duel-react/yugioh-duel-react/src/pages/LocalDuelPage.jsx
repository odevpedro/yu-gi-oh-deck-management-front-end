import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDuel } from '../contexts/DuelContext'
import HUD from '../components/HUD'
import ContextPanel from '../components/ContextPanel'
import DuelField from '../components/DuelField'
import PhaseOverlay from '../components/PhaseOverlay'
import ResultScreen from '../components/ResultScreen'
import LocalDuelInteractions from '../local-duel/components/LocalDuelInteractions'
import AnimationsOverlay from '../local-duel/components/AnimationsOverlay'
import { AVAILABLE_DECKS, LocalDuelClient } from '../local-duel/duel/LocalDuelClient'
import { preloadCards } from '../local-duel/duel/cardDatabase'
import { mapLocalDuelState } from '../local-duel/localStateMapper'

const SPEEDS = [1, 2, 0]
const SPEED_LABELS = ['Normal', 'Rapido', 'Instantaneo']

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
  animation: null,
  windBotThinking: false,
  animationSpeed: 1,
}

export default function LocalDuelPage() {
  const navigate = useNavigate()
  const [runtimeState, setRuntimeState] = useState(INITIAL_RUNTIME_STATE)
  const [error, setError] = useState('')
  const [selectedDeckId, setSelectedDeckId] = useState('blue-eyes')
  const clientRef = useRef(null)
  const stateHandlerRef = useRef(null)
  const mappingVersionRef = useRef(0)
  const { applyLocalState, configureRemoteTransport, resetDuel, setPhaseOverlay } = useDuel()

  const selectedDeck = AVAILABLE_DECKS.find(d => d.id === selectedDeckId) || AVAILABLE_DECKS[0]

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

  const start = useCallback(async (deck) => {
    setError('')
    try {
      await client.start('Local Player', deck)
    } catch (reason) {
      setError(reason.message || String(reason))
      client.emit({ status: 'error', statusText: 'Falha ao iniciar o duelo local' })
    }
  }, [client])

  useEffect(() => {
    resetDuel()
    configureRemoteTransport({ sendAction: () => {}, advancePhase: () => {} })
    const deck = selectedDeck.deck
    void preloadCards([...deck.main, ...deck.extra]).catch(() => {})
    const startTimer = setTimeout(() => { void start(deck) }, 0)
    return () => {
      clearTimeout(startTimer)
      mappingVersionRef.current += 1
      client.disconnect()
      configureRemoteTransport(null)
    }
  }, [selectedDeckId])

  const prevPhaseRef = useRef('')
  useEffect(() => {
    if (runtimeState.phase && runtimeState.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = runtimeState.phase
      setPhaseOverlay({ id: runtimeState.phase, label: runtimeState.phase })
    }
  }, [runtimeState.phase, setPhaseOverlay])

  return (
    <div className="local-duel-page" onClick={event => event.stopPropagation()}>
      <div className="session-strip">
        <span>OCGCORE LOCAL</span>
        <span>{runtimeState.statusText}</span>
        <label className="deck-selector">
          <span>Deck</span>
          <select value={selectedDeckId} disabled={runtimeState.duelStarted} onChange={event => { setSelectedDeckId(event.target.value); client.disconnect(); const deck = AVAILABLE_DECKS.find(d => d.id === event.target.value)?.deck; if (deck) setTimeout(() => void start(deck), 200) }}>
            {AVAILABLE_DECKS.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="speed-control">
          <span>Velocidade</span>
          <select value={SPEEDS.indexOf(runtimeState.animationSpeed ?? 1)} onChange={event => client.setAnimationSpeed(SPEEDS[Number(event.target.value)])}>
            {SPEEDS.map((speed, index) => (
              <option key={speed} value={index}>{SPEED_LABELS[index]}</option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => client.transcript.download()}>Transcript</button>
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
            localPlayer={runtimeState.localPlayer}
            windBotThinking={runtimeState.windBotThinking}
            onLobby={(type, value) => client.respondLobby(type, value)}
            onGame={payload => client.respondGame(payload)}
          />
          {error && <p className="ocg-local-error">{error}</p>}
          <AnimationsOverlay animation={runtimeState.animation} />
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
