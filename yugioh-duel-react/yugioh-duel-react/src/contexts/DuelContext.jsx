// ═══════════════════════════════════════════════════════════
// DuelContext.jsx — Estado global do duelo
// ═══════════════════════════════════════════════════════════
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

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
    normalSummonedThisTurn:  false,
    positionChangedThisTurn: false,
    attackedZones:           new Set(),
  })
  const setNormalSummoned  = useCallback(() => setFlags(f => ({ ...f, normalSummonedThisTurn: true })), [])
  const setPositionChanged = useCallback(() => setFlags(f => ({ ...f, positionChangedThisTurn: true })), [])
  const setZoneAttacked    = useCallback((zk) => setFlags(f => ({
    ...f, attackedZones: new Set([...f.attackedZones, zk]),
  })), [])

  function triggerOverlay(p) {
    setPhaseOverlay(p)
    setTimeout(() => setPhaseOverlay(null), 1000)
  }

  const nextPhase = useCallback(() => {
    setPhaseIndex(prev => {
      const next = prev + 1
      if (next >= PHASES.length) {
        setTurn(t => t + 1)
        setDrawnThisTurn(false)
        setFlags({ normalSummonedThisTurn: false, positionChangedThisTurn: false, attackedZones: new Set() })
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
  const dealDamage = useCallback((amount, target = 'opponent') => {
    if (target === 'opponent') setOpponentLP(v => Math.max(0, v - amount))
    else setPlayerLP(v => Math.max(0, v - amount))
  }, [])

  // ── Deck ──────────────────────────────────────────────
  const [deckCards,      setDeckCards]      = useState([])
  const [deckRemaining,  setDeckRemaining]  = useState([])
  const [deckViewerOpen, setDeckViewerOpen] = useState(false)

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
  const addCardToHand      = useCallback((card)  => setHandCards(prev => prev.length < 10 ? [...prev, card] : prev), [])
  const removeCardFromHand = useCallback((index) => setHandCards(prev => prev.filter((_, i) => i !== index)), [])

  // ── Field zones ───────────────────────────────────────
  const [occupiedZones, setOccupiedZones] = useState({})
  const [playerGY,   setPlayerGY]   = useState([])
  const [opponentGY, setOpponentGY] = useState([])

  const sendToGraveyard = useCallback((zoneKey, owner = 'player') => {
    setOccupiedZones(prev => {
      const entry = prev[zoneKey]
      if (!entry) return prev
      if (owner === 'player') setPlayerGY(gy => [...gy, entry.card])
      else                    setOpponentGY(gy => [...gy, entry.card])
      const next = { ...prev }
      delete next[zoneKey]
      return next
    })
  }, [])
  // slotData = { card, dataUrl, position?, faceDown?, summonedThisTurn? }
  const placeCardInZone = useCallback((zoneKey, slotData) => {
    setOccupiedZones(prev => ({ ...prev, [zoneKey]: slotData }))
  }, [])

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
        setInstruction(isSet ? 'MONSTER SET' : 'SUMMONED!')
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
        setInstruction(faceDown ? 'CARD SET' : 'SPELL ACTIVATED!')
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
          setPositionChanged()
        }
        clearSelection()
        setInstruction('BATTLE POSITION CHANGED')
        break
      case 'activate-set':
        if (selectedCard.zoneKey) {
          setOccupiedZones(prev => {
            const e = prev[selectedCard.zoneKey]
            if (!e) return prev
            return { ...prev, [selectedCard.zoneKey]: { ...e, faceDown: false, summonedThisTurn: false } }
          })
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
  }, [selectedCard, occupiedZones, setNormalSummoned, setPositionChanged, clearSelection])

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
      playerLP, opponentLP, dealDamage,
      deckCards, deckRemaining, initDeck, drawFromDeck,
      deckViewerOpen, setDeckViewerOpen,
      handCards, addCardToHand, removeCardFromHand, setHandCards,
      occupiedZones, setOccupiedZones, placeCardInZone,
      playerGY, opponentGY, sendToGraveyard,
      dragState, startDrag, endDrag,
      attackingZone, startAttack, cancelAttack, setAttackingZone,
      selectedCard, selectCard, clearSelection,
      activeAction, setActiveAction, executeAction,
      panelMode, panelData, panelLastData, updatePanel, scheduleIdle,
      instruction, setInstruction,
    }}>
      {children}
    </DuelContext.Provider>
  )
}

export const useDuel = () => useContext(DuelContext)