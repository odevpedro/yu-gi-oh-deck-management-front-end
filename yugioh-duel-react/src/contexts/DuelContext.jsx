// ═══════════════════════════════════════════════════════════
// DuelContext.jsx — Estado global do duelo
// ═══════════════════════════════════════════════════════════
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { sfxSummon, sfxSpecialSummon, sfxAttack, sfxDestroy, sfxDamage, sfxVictory, sfxDefeat, sfxCardSet, sfxFlip } from '../utils/sfx'
import { engine } from '../engine'

export const PHASES = [
  { id: 'DRAW',    label: 'DRAW',    short: 'DP'  },
  { id: 'STANDBY', label: 'STANDBY', short: 'SBP' },
  { id: 'MAIN1',   label: 'MAIN 1',  short: 'MP1' },
  { id: 'BATTLE',  label: 'BATTLE',  short: 'BP'  },
  { id: 'MAIN2',   label: 'MAIN 2',  short: 'MP2' },
  { id: 'END',     label: 'END',     short: 'EP'  },
]

const DuelContext = createContext(null)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Zone highlight DOM helpers ────────────────────────────
export function clearZoneHighlights() {
  document.querySelectorAll(
    '.zone--action-target,.zone--attack-valid,.field-selected,.drop-target,.zone--invalid'
  ).forEach(el =>
    el.classList.remove('zone--action-target','zone--attack-valid','field-selected','drop-target','zone--invalid')
  )
}
export function highlightSummonZones() {
  clearZoneHighlights()
  document.querySelectorAll('#playerZones .zone--monster:not(.occupied)')
    .forEach(el => el.classList.add('zone--action-target'))
}
export function highlightSpellZones() {
  clearZoneHighlights()
  document.querySelectorAll('#playerSpellZones .zone--spell:not(.occupied)')
    .forEach(el => el.classList.add('zone--action-target'))
}
export function highlightAttackTargets() {
  clearZoneHighlights()
  document.querySelectorAll(
    '.field-side--opponent .zone--monster,.field-side--opponent .zone--spell'
  ).forEach(el => el.classList.add('zone--attack-valid'))
}
export function highlightTributeTargets() {
  clearZoneHighlights()
  document.querySelectorAll('#playerZones .zone--monster.occupied')
    .forEach(el => el.classList.add('zone--tribute-target'))
}

export function DuelProvider({ children }) {

  // ── Turn / Phase ──────────────────────────────────────
  const [turn,          setTurn]          = useState(1)
  const [phaseIndex,    setPhaseIndex]    = useState(0)
  const [drawnThisTurn, setDrawnThisTurn] = useState(false)
  const [phaseOverlay,  setPhaseOverlay]  = useState(null)

  const phase    = PHASES[phaseIndex]
  const canDraw  = phase.id === 'DRAW'  && !drawnThisTurn
  const canSummon= phase.id === 'MAIN1' || phase.id === 'MAIN2'
  const canAttack= phase.id === 'BATTLE'

  // ── Per-turn flags ────────────────────────────────────
  const [flags, setFlags] = useState({
    normalSummonedThisTurn:   false,
    positionChangedZones:     new Set(),   // per-zone, not global
    attackedZones:            new Set(),
  })
  const setNormalSummoned  = useCallback(() => setFlags(f => ({ ...f, normalSummonedThisTurn: true })), [])
  const setPositionChanged = useCallback((zk) => setFlags(f => ({
    ...f, positionChangedZones: new Set([...f.positionChangedZones, zk]),
  })), [])
  const setZoneAttacked    = useCallback((zk) => setFlags(f => ({
    ...f, attackedZones: new Set([...f.attackedZones, zk]),
  })), [])

  function triggerOverlay(p) {
    setPhaseOverlay(p)
    setTimeout(() => setPhaseOverlay(null), 1000)
  }

  // Ref allows nextPhase (defined before handCards state) to read current hand size
  const handCardsRef = useRef([])

  const nextPhase = useCallback(() => {
    // Hand size limit: cannot leave END phase with more than 6 cards
    setPhaseIndex(prev => {
      const currentPhase = PHASES[prev]
      if (currentPhase.id === 'END' && handCardsRef.current.length > 6) {
        setInstruction(`HAND LIMIT — DISCARD ${handCardsRef.current.length - 6} CARD(S) TO END TURN`)
        return prev  // block advance
      }
      const next = prev + 1
      if (next >= PHASES.length) {
        setTurn(t => t + 1)
        setDrawnThisTurn(false)
        setFlags({ normalSummonedThisTurn: false, positionChangedZones: new Set(), attackedZones: new Set() })
        triggerOverlay(PHASES[0])
        return 0
      }
      triggerOverlay(PHASES[next])
      return next
    })
  }, [])

  const markDrawn = useCallback(() => setDrawnThisTurn(true), [])

  // ── LP ────────────────────────────────────────────────
  const [playerLP,   setPlayerLP]   = useState(8000)
  const [opponentLP, setOpponentLP] = useState(6000)
  const [winner,     setWinner]     = useState(null) // 'player' | 'opponent' | null

  const dealDamage = useCallback((amount, target = 'opponent') => {
    if (target === 'opponent') setOpponentLP(v => { const n = Math.max(0, v - amount); if (n === 0) { setWinner('player'); sfxVictory() } else sfxDamage(); return n })
    else                       setPlayerLP  (v => { const n = Math.max(0, v - amount); if (n === 0) { setWinner('opponent'); sfxDefeat() } else sfxDamage(); return n })
  }, [])

  // ── Deck ──────────────────────────────────────────────
  const [deckCards,      setDeckCards]      = useState([])
  const [deckRemaining,  setDeckRemaining]  = useState([])
  const [deckViewerOpen, setDeckViewerOpen] = useState(false)
  const [gyViewer, setGyViewer] = useState(null) // 'player' | 'opponent' | null

  const initDeck = useCallback(async () => {
    try {
      const res  = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0')
      const data = await res.json()
      setDeckCards(data.data)
      setDeckRemaining(shuffle(data.data.map((_, i) => i)))
    } catch {
      const cards = Array.from({ length: 20 }, (_, i) => ({
        id: i, name: `Carta ${i+1}`,
        type: ['Normal Monster','Spell Card','Trap Card'][i % 3],
        card_images: [{ image_url: '' }],
      }))
      setDeckCards(cards)
      setDeckRemaining(shuffle(cards.map((_, i) => i)))
    }
  }, [])

  const drawFromDeck = useCallback(() => {
    if (!canDraw || deckRemaining.length === 0) return null
    const rem  = [...deckRemaining]
    const idx  = rem.pop()
    const card = deckCards[idx]
    setDeckRemaining(rem)
    markDrawn()
    return card
  }, [canDraw, deckRemaining, deckCards, markDrawn])

  // ── Hand ──────────────────────────────────────────────
  const [handCards, setHandCards] = useState([])
  // Keep ref in sync so nextPhase can read current length without closure issues
  useEffect(() => { handCardsRef.current = handCards }, [handCards])
  const addCardToHand      = useCallback((card)  => setHandCards(prev => prev.length < 10 ? [...prev, card] : prev), [])
  const removeCardFromHand = useCallback((index) => setHandCards(prev => prev.filter((_, i) => i !== index)), [])
  const discardFromHand    = useCallback((index) => {
    setHandCards(prev => {
      const card = prev[index]
      if (card) setPlayerGY(gy => [...gy, card])
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // ── Field zones ───────────────────────────────────────
  const [occupiedZones, setOccupiedZones] = useState({})
  // slotData = { card, dataUrl, position?, faceDown?, summonedThisTurn? }
  const placeCardInZone = useCallback((zoneKey, slotData) => {
    setOccupiedZones(prev => ({ ...prev, [zoneKey]: slotData }))
  }, [])

  // ── Graveyard ─────────────────────────────────────────
  const [playerGY,   setPlayerGY]   = useState([])
  const [opponentGY, setOpponentGY] = useState([])

  const sendToGraveyard = useCallback((zoneKey, side = 'opponent') => {
    setOccupiedZones(prev => {
      const slot = prev[zoneKey]
      if (!slot) return prev
      const next = { ...prev }
      delete next[zoneKey]
      if (side === 'player') {
        setPlayerGY(gy => [...gy, slot.card])
      } else {
        setOpponentGY(gy => [...gy, slot.card])
      }
      return next
    })
  }, [])

  // ── WebSocket / engine connection ─────────────────────
  // wsStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [duelId,   setDuelId]   = useState(null)

  // Aplica DuelStateDTO mapeado ao estado React.
  // Chamado quando o servidor envia update via STOMP.
  const applyServerState = useCallback((s) => {
    if (s.phaseId) {
      const idx = PHASES.findIndex(p => p.id === s.phaseId)
      if (idx >= 0) setPhaseIndex(idx)
    }
    if (s.turn          != null) setTurn(s.turn)
    if (s.playerLP      != null) setPlayerLP(s.playerLP)
    if (s.opponentLP    != null) setOpponentLP(s.opponentLP)
    if (s.winner        != null) setWinner(s.winner)
    if (s.occupiedZones != null) setOccupiedZones(s.occupiedZones)
    if (s.handCards     != null) setHandCards(s.handCards)
    if (s.playerGY      != null) setPlayerGY(s.playerGY)
    if (s.opponentGY    != null) setOpponentGY(s.opponentGY)
  }, [])

  useEffect(() => {
    setWsStatus('connecting')
    engine.connect({
      onState:        applyServerState,
      onConnected:    (id) => { setWsStatus('connected'); if (id) setDuelId(id) },
      onDisconnected: ()   => setWsStatus('disconnected'),
      onError:        (msg) => {
        setWsStatus('error')
        setInstruction('⚠ ' + msg)
      },
    })
    return () => engine.disconnect()
  }, []) // eslint-disable-line

  /** Entra em um duelo no servidor (envia JOIN via STOMP). */
  const joinDuel = useCallback((payload) => engine.joinDuel?.(payload), [])

  // ── Mock opponent field ────────────────────────────────
  const MOCK_OPPONENT = [
    { id: 89631139, name: 'Blue-Eyes White Dragon',
      type: 'Normal Monster', attribute: 'LIGHT', level: 8, atk: 3000, def: 2500,
      card_images: [{ image_url: 'https://images.ygoprodeck.com/images/cards/89631139.jpg' }] },
    { id: 46986414, name: 'Dark Magician',
      type: 'Normal Monster', attribute: 'DARK', level: 7, atk: 2500, def: 2100,
      card_images: [{ image_url: 'https://images.ygoprodeck.com/images/cards/46986414.jpg' }] },
    { id: 15025844, name: 'Mystical Elf',
      type: 'Normal Monster', attribute: 'LIGHT', level: 4, atk: 800, def: 2000,
      card_images: [{ image_url: 'https://images.ygoprodeck.com/images/cards/15025844.jpg' }] },
  ]
  const MOCK_POSITIONS = ['attack', 'attack', 'defense']

  const populateMockOpponent = useCallback(() => {
    setOccupiedZones(prev => {
      const next = { ...prev }
      MOCK_OPPONENT.forEach((card, i) => {
        const zk = `om${i}`
        next[zk] = {
          card, dataUrl: card.card_images[0].image_url,
          position: MOCK_POSITIONS[i], faceDown: false,
          summonedThisTurn: false, hasAttackedThisTurn: false,
        }
      })
      return next
    })
  }, []) // eslint-disable-line

  useEffect(() => { populateMockOpponent() }, []) // eslint-disable-line

  // ── Drag ─────────────────────────────────────────────
  const [dragState, setDragState] = useState({ active: false, fromIndex: null, card: null })
  const startDrag = useCallback((fromIndex, card) => setDragState({ active: true, fromIndex, card }), [])
  const endDrag   = useCallback(() => setDragState({ active: false, fromIndex: null, card: null }), [])

  // ── Attack ────────────────────────────────────────────
  const [attackingZone, setAttackingZone] = useState(null)
  const startAttack  = useCallback((zk) => setAttackingZone(zk), [])
  const cancelAttack = useCallback(() => setAttackingZone(null), [])

  // ── Selected card ─────────────────────────────────────
  // { card, location: 'hand'|'field', index?, zoneKey?, position? }
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  // tributePending: { card, index, tributesNeeded, tributesSoFar: [] }
  const [tributePending, setTributePending] = useState(null)

  const selectCard = useCallback((info) => {
    clearZoneHighlights()
    setSelectedCard(info)
    setActiveAction(null)
    setAttackingZone(null)
  }, [])

  const clearSelection = useCallback(() => {
    clearZoneHighlights()
    setSelectedCard(null)
    setActiveAction(null)
    setAttackingZone(null)
    setTributePending(null)
  }, [])

  // ── Instruction bar ───────────────────────────────────
  const [instruction, setInstruction] = useState('')

  useEffect(() => {
    if (selectedCard) return
    const msgs = {
      DRAW:    !drawnThisTurn ? 'CLIQUE NO DECK PARA COMPRAR UMA CARTA' : 'DRAW PHASE — CARTA JÁ COMPRADA',
      STANDBY: 'STANDBY PHASE — AGUARDE EFEITOS CONTÍNUOS',
      MAIN1:   'MAIN PHASE 1 — SELECIONE UMA CARTA NA MÃO OU NO CAMPO',
      BATTLE:  attackingZone ? 'CLIQUE EM UMA ZONA DO OPONENTE PARA ATACAR' : 'BATTLE PHASE — SELECIONE UM MONSTRO PARA ATACAR',
      MAIN2:   'MAIN PHASE 2 — SELECIONE UMA CARTA NA MÃO OU NO CAMPO',
      END:     'END PHASE — AVANCE PARA FINALIZAR O TURNO',
    }
    setInstruction(msgs[phase.id] ?? '')
  }, [phase.id, drawnThisTurn, attackingZone, selectedCard])

  // ── executeAction ─────────────────────────────────────
  const executeAction = useCallback((actionId) => {
    if (!selectedCard) return
    switch (actionId) {
      case 'normal-summon':
      case 'set-monster': {
        const freeIdx = [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`])
        if (freeIdx === undefined) { setInstruction('NO FREE MONSTER ZONE'); break }
        const rawImg = selectedCard.card?.url || selectedCard.card?.card_images?.[0]?.image_url || ''
        const displayUrl = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : ''
        const isSet = actionId === 'set-monster'
        setOccupiedZones(prev => ({
          ...prev,
          [`pm${freeIdx}`]: {
            card: selectedCard.card,
            dataUrl: displayUrl,
            position: isSet ? 'defense' : 'attack',
            faceDown: isSet,
            summonedThisTurn: true,
          }
        }))
        setHandCards(prev => prev.filter((_, i) => i !== selectedCard.index))
        setNormalSummoned()
        clearZoneHighlights()
        setSelectedCard(null)
        setActiveAction(null)
        if (isSet) { sfxCardSet(); setInstruction('MONSTER SET') }
        else        { sfxSummon(); setInstruction('SUMMONED!') }
        break
      }
      case 'tribute-summon': {
        const level = selectedCard.card?.level ?? 0
        const tributesNeeded = level >= 7 ? 2 : 1
        setTributePending({ card: selectedCard.card, index: selectedCard.index, tributesNeeded, tributesSoFar: [] })
        setActiveAction('tribute-summon')
        highlightTributeTargets()
        setInstruction(`SELECT ${tributesNeeded} MONSTER(S) TO TRIBUTE`)
        break
      }
      case 'activate-spell':
      case 'set-spell':
      case 'set-trap': {
        const freeIdx = [0,1,2,3,4].find(i => !occupiedZones[`ps${i}`])
        if (freeIdx === undefined) { setInstruction('NO FREE SPELL/TRAP ZONE'); break }
        const rawImg = selectedCard.card?.url || selectedCard.card?.card_images?.[0]?.image_url || ''
        const displayUrl = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : ''
        const faceDown = actionId !== 'activate-spell'
        setOccupiedZones(prev => ({
          ...prev,
          [`ps${freeIdx}`]: {
            card: selectedCard.card,
            dataUrl: displayUrl,
            position: 'spell',
            faceDown,
            summonedThisTurn: true,
          }
        }))
        setHandCards(prev => prev.filter((_, i) => i !== selectedCard.index))
        clearZoneHighlights()
        setSelectedCard(null)
        setActiveAction(null)
        if (faceDown) { sfxCardSet(); setInstruction('CARD SET') }
        else          { sfxSummon();  setInstruction('SPELL ACTIVATED!') }
        break
      }
      case 'attack':
        setActiveAction('attack')
        setAttackingZone(selectedCard.zoneKey)
        highlightAttackTargets()
        setInstruction('CHOOSE AN OPPONENT TARGET TO ATTACK')
        break
      case 'flip-summon':
        // Flip face-down monster to face-up attack
        if (selectedCard.zoneKey) {
          setOccupiedZones(prev => {
            const e = prev[selectedCard.zoneKey]
            if (!e) return prev
            return { ...prev, [selectedCard.zoneKey]: { ...e, position: 'attack', faceDown: false, summonedThisTurn: true } }
          })
          setNormalSummoned()
        }
        clearSelection()
        sfxFlip()
        setInstruction('FLIP SUMMON!')
        break
      case 'change-position':
        if (selectedCard.zoneKey) {
          setOccupiedZones(prev => {
            const e = prev[selectedCard.zoneKey]
            if (!e) return prev
            const toDefense = e.position !== 'defense'
            return { ...prev, [selectedCard.zoneKey]: { ...e, position: toDefense ? 'defense' : 'attack', faceDown: false } }
          })
          setPositionChanged(selectedCard.zoneKey)
        }
        clearSelection()
        setInstruction('BATTLE POSITION CHANGED')
        break
      case 'discard':
        if (selectedCard.index != null) {
          discardFromHand(selectedCard.index)
        }
        clearSelection()
        setInstruction('CARD DISCARDED')
        break
      case 'activate-set':
        if (selectedCard.zoneKey) {
          const zk = selectedCard.zoneKey
          setOccupiedZones(prev => {
            const e = prev[zk]
            if (!e) return prev
            return { ...prev, [zk]: { ...e, faceDown: false, summonedThisTurn: false } }
          })
          // Spell/Trap goes to GY after activation resolves
          setTimeout(() => {
            setOccupiedZones(prev => {
              const e = prev[zk]
              if (!e) return prev
              const next = { ...prev }
              delete next[zk]
              setPlayerGY(gy => [...gy, e.card])
              return next
            })
          }, 800)
        }
        clearSelection()
        setInstruction('CARD ACTIVATED!')
        break
      case 'view-details':
        // Panel already shows the card; just close the menu
        clearSelection()
        break
      case 'cancel':
        clearSelection()
        break
      default:
        break
    }
  }, [selectedCard, occupiedZones, setNormalSummoned, setPositionChanged, discardFromHand, clearSelection])

  // ── Panel ─────────────────────────────────────────────
  const [panelMode,     setPanelMode]     = useState('idle')
  const [panelData,     setPanelData]     = useState(null)
  const [panelLastData, setPanelLastData] = useState(null)
  const panelTimerRef = useRef(null)

  const updatePanel = useCallback((mode, data, force = false) => {
    setPanelMode(prev => (!force && prev === 'card' && mode !== 'card') ? prev : mode)
    setPanelData(prev => (!force && panelMode === 'card' && mode !== 'card') ? prev : data)
    if (data) setPanelLastData(data)
    clearTimeout(panelTimerRef.current)
  }, [panelMode])

  const scheduleIdle = useCallback(() => {
    clearTimeout(panelTimerRef.current)
    panelTimerRef.current = setTimeout(() => { setPanelMode('idle'); setPanelData(null) }, 6000)
  }, [])

  // Auto-clear selection once card is placed via action bar
  const prevOccupied = useRef(occupiedZones)
  useEffect(() => {
    if (!activeAction || activeAction === 'attack' || activeAction === 'view-details') return
    if (occupiedZones !== prevOccupied.current) {
      prevOccupied.current = occupiedZones
      clearSelection()
    }
  }, [occupiedZones, activeAction, clearSelection])

  const resetDuel = useCallback(() => {
    setTurn(1)
    setPhaseIndex(0)
    setDrawnThisTurn(false)
    setPhaseOverlay(null)
    setFlags({ normalSummonedThisTurn: false, positionChangedZones: new Set(), attackedZones: new Set() })
    setPlayerLP(8000)
    setOpponentLP(6000)
    setWinner(null)
    setHandCards([])
    setOccupiedZones({})
    setPlayerGY([])
    setOpponentGY([])
    setAttackingZone(null)
    setSelectedCard(null)
    setActiveAction(null)
    setInstruction('NOVO DUELO — COMPRE UMA CARTA PARA COMEÇAR')
    setTimeout(() => populateMockOpponent(), 50)
  }, [populateMockOpponent]) // eslint-disable-line

  // expose for Zone (avoids circular context dep)
  useEffect(() => {
    window.__duelCtx = { selectedCard, clearSelection, removeCardFromHand }
  })

  return (
    <DuelContext.Provider value={{
      turn, phase, phaseIndex, drawnThisTurn,
      canDraw, canSummon, canAttack,
      nextPhase, markDrawn, phaseOverlay,
      flags, setNormalSummoned, setPositionChanged, setZoneAttacked,
      playerLP, opponentLP, dealDamage, winner, resetDuel,
      deckCards, deckRemaining, initDeck, drawFromDeck,
      deckViewerOpen, setDeckViewerOpen, gyViewer, setGyViewer,
      handCards, addCardToHand, removeCardFromHand, setHandCards, discardFromHand,
      tributePending, setTributePending,
      occupiedZones, placeCardInZone, setOccupiedZones,
      sendToGraveyard, playerGY, opponentGY,
      dragState, startDrag, endDrag,
      attackingZone, startAttack, cancelAttack, setAttackingZone,
      selectedCard, selectCard, clearSelection,
      activeAction, setActiveAction, executeAction,
      panelMode, panelData, panelLastData, updatePanel, scheduleIdle,
      instruction, setInstruction,
      wsStatus, duelId, joinDuel,
    }}>
      {children}
    </DuelContext.Provider>
  )
}

export const useDuel = () => useContext(DuelContext)