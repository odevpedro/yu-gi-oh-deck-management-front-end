import { createContext, useContext, useState, useCallback, useRef, useEffect, useReducer } from 'react'
import { mapRemoteDuelState } from '../utils/remoteStateMapper'
import { fetchSampleDeck } from '../services/cardService'
import { proxiedUrl } from '../utils/cardHelpers'
import { reducer, initialState, PHASES } from './duelReducer'

const DuelContext = createContext(null)

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function backendCardId(card) {
  return card?.cardId ?? card?.id
}

function zoneIndexFromKey(zoneKey) {
  const match = String(zoneKey ?? '').match(/\d+$/)
  return match ? Number(match[0]) : undefined
}

function isSpellOrTrap(card) {
  const type = String(card?.type ?? '').toUpperCase()
  return type.includes('SPELL') || type.includes('TRAP')
}

function remoteActionPayload(actionId, selectedCard) {
  const cardId = backendCardId(selectedCard?.card)
  switch (actionId) {
    case 'normal-summon': return { actionType: 'SUMMON', cardId }
    case 'set-monster': case 'set-spell': case 'set-trap': return { actionType: 'SET', cardId }
    case 'activate-spell': case 'activate-set': return { actionType: 'SPELL', cardId }
    default: return null
  }
}

function remoteZoneActionPayload(card, zoneKey, actionId) {
  const cardId = backendCardId(card)
  if (!cardId) return null
  let actionType = 'SUMMON'
  if (actionId === 'activate-spell') actionType = 'SPELL'
  else if (actionId?.startsWith('set') || isSpellOrTrap(card)) actionType = 'SET'
  return { actionType, cardId, zoneIndex: zoneIndexFromKey(zoneKey) }
}

export function clearZoneHighlights() {
  document.querySelectorAll('.zone--action-target,.zone--attack-valid,.field-selected,.drop-target,.zone--invalid')
    .forEach(el => el.classList.remove('zone--action-target','zone--attack-valid','field-selected','drop-target','zone--invalid'))
}
export function highlightSummonZones() {
  clearZoneHighlights()
  document.querySelectorAll('#playerZones .zone--monster:not(.occupied)').forEach(el => el.classList.add('zone--action-target'))
}
export function highlightSpellZones() {
  clearZoneHighlights()
  document.querySelectorAll('#playerSpellZones .zone--spell:not(.occupied)').forEach(el => el.classList.add('zone--action-target'))
}
export function highlightAttackTargets() {
  clearZoneHighlights()
  document.querySelectorAll('.field-side--opponent .zone--monster,.field-side--opponent .zone--spell')
    .forEach(el => el.classList.add('zone--attack-valid'))
}

export function DuelProvider({ children }) {
  const remoteTransportRef = useRef(null)
  const [gameState, dispatch] = useReducer(reducer, initialState)
  const [isRemoteDuel, setIsRemoteDuel] = useState(false)
  const [phaseOverlay, setPhaseOverlay] = useState(null)
  const [deckViewerOpen, setDeckViewerOpen] = useState(false)
  const [dragState, setDragState] = useState({ active: false, fromIndex: null, card: null })
  const [attackingZone, setAttackingZone] = useState(null)
  const [selectedCard, setSelectedCard] = useState(null)
  const [activeAction, setActiveAction] = useState(null)
  const [gameResult, setGameResult] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [detailCard, setDetailCard] = useState(null)
  const [panelMode, setPanelMode] = useState('idle')
  const [panelData, setPanelData] = useState(null)
  const [panelLastData, setPanelLastData] = useState(null)
  const [pendingSummon, setPendingSummon] = useState(null)
  const [chain, setChain] = useState([])
  const panelTimerRef = useRef(null)

  const {
    turn, phaseIndex, drawnThisTurn, turnTimer, playerLP, opponentLP,
    deckCards, deckRemaining, handCards,
    opponentHand, opponentDeckCards, opponentDeckRemaining,
    occupiedZones, playerGY, opponentGY, playerBanished, opponentBanished, flags,
  } = gameState

  const phase = PHASES[phaseIndex]
  const canDraw = phase.id === 'DRAW' && !drawnThisTurn
  const canSummon = phase.id === 'MAIN1' || phase.id === 'MAIN2'
  const canAttack = phase.id === 'BATTLE'

  const setNormalSummoned = useCallback(() => dispatch({ type: 'NORMAL_SUMMONED' }), [])
  const setPositionChanged = useCallback(() => dispatch({ type: 'POSITION_CHANGED' }), [])
  const setZoneAttacked = useCallback((zk) => dispatch({ type: 'ZONE_ATTACKED', zoneKey: zk }), [])

  function triggerOverlay(p) {
    setPhaseOverlay(p)
    setTimeout(() => setPhaseOverlay(null), 1000)
  }

  const nextPhase = useCallback(() => {
    if (remoteTransportRef.current) { remoteTransportRef.current.advancePhase(); return }
    dispatch({ type: 'NEXT_PHASE' })
    const next = (phaseIndex + 1) >= PHASES.length ? 0 : phaseIndex + 1
    triggerOverlay(PHASES[next])
  }, [phaseIndex])

  const markDrawn = useCallback(() => dispatch({ type: 'MARK_DRAWN' }), [])

  const dealDamage = useCallback((amount, target = 'opponent') => {
    dispatch({ type: 'DEAL_DAMAGE', amount, target })
  }, [])

  const initDeck = useCallback(async () => {
    try {
      const cards = await fetchSampleDeck(20)
      dispatch({ type: 'INIT_DECK', cards })
    } catch {
      const cards = Array.from({ length: 20 }, (_, i) => ({
        id: i, name: `Carta ${i+1}`,
        type: ['Normal Monster','Spell Card','Trap Card'][i % 3],
        card_images: [{ image_url: '' }],
      }))
      dispatch({ type: 'INIT_DECK', cards })
    }
  }, [])

  const drawFromDeck = useCallback(() => {
    if (!canDraw || deckRemaining.length === 0) return null
    const rem = [...deckRemaining]
    const idx = rem.pop()
    const card = deckCards[idx]
    dispatch({ type: 'DRAW_CARD' })
    return card
  }, [canDraw, deckRemaining, deckCards])

  const addCardToHand = useCallback((card) => dispatch({ type: 'ADD_TO_HAND', card }), [])
  const removeCardFromHand = useCallback((index) => dispatch({ type: 'REMOVE_FROM_HAND', index }), [])

  const addCardToOpponentHand = useCallback((card) => dispatch({ type: 'SET_OPPONENT_HAND', cards: [...opponentHand, card] }), [opponentHand])
  const removeFromOpponentHand = useCallback((index) => {
    const cards = opponentHand.filter((_, i) => i !== index)
    dispatch({ type: 'SET_OPPONENT_HAND', cards })
  }, [opponentHand])

  const setHandCards = useCallback((cards) => dispatch({ type: 'SET_HAND', cards }), [])

  const initOpponent = useCallback(async () => {
    let cards
    try { cards = await fetchSampleDeck(20) } catch {
      cards = Array.from({ length: 20 }, (_, i) => ({
        id: 1000 + i, name: `Opponent Card ${i+1}`,
        type: ['Normal Monster','Spell Card','Trap Card'][i % 3],
        card_images: [{ image_url: '' }],
      }))
    }
    dispatch({ type: 'INIT_OPPONENT', cards })
  }, [])

  const opponentDraw = useCallback(() => {
    if (opponentDeckRemaining.length === 0) return null
    const rem = [...opponentDeckRemaining]
    const idx = rem.pop()
    const card = opponentDeckCards[idx]
    dispatch({ type: 'OPPONENT_DRAW' })
    return card
  }, [opponentDeckCards, opponentDeckRemaining])

  const setOccupiedZones = useCallback((zones) => dispatch({ type: 'SET_OCCUPIED_ZONES', zones }), [])

  const placeCardInZone = useCallback((zoneKey, slotData) => {
    dispatch({ type: 'PLACE_IN_ZONE', zoneKey, slotData })
  }, [])

  const sendToBanished = useCallback((card, owner = 'player') => {
    dispatch({ type: 'SEND_TO_BANISHED', card, owner })
  }, [])

  const sendToGraveyard = useCallback((zoneKey, owner = 'player') => {
    dispatch({ type: 'SEND_TO_GRAVEYARD', zoneKey, owner })
  }, [])

  const startDrag = useCallback((fromIndex, card) => setDragState({ active: true, fromIndex, card }), [])
  const endDrag = useCallback(() => setDragState({ active: false, fromIndex: null, card: null }), [])
  const startAttack = useCallback((zk) => setAttackingZone(zk), [])
  const cancelAttack = useCallback(() => setAttackingZone(null), [])

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

  const configureRemoteTransport = useCallback((transport) => {
    remoteTransportRef.current = transport
    setIsRemoteDuel(!!transport)
  }, [])

  const sendRemoteAttackTarget = useCallback((attackerZoneKey, targetZoneKey) => {
    const attacker = occupiedZones[attackerZoneKey]?.card
    const target = targetZoneKey ? occupiedZones[targetZoneKey]?.card : null
    if (!remoteTransportRef.current || !attacker) return
    remoteTransportRef.current.sendAction({
      actionType: 'ATTACK', cardId: backendCardId(attacker), targetId: backendCardId(target),
    })
    setAttackingZone(null)
    clearZoneHighlights()
    setInstruction('ATAQUE ENVIADO')
  }, [occupiedZones])

  const sendRemoteCardToZone = useCallback((card, zoneKey, actionId) => {
    if (!remoteTransportRef.current) return false
    const payload = remoteZoneActionPayload(card, zoneKey, actionId)
    if (!payload) return false
    remoteTransportRef.current.sendAction(payload)
    clearZoneHighlights()
    setInstruction('ACAO ENVIADA')
    return true
  }, [])

  useEffect(() => {
    if (gameResult || isRemoteDuel) return
    if (playerLP <= 0 || opponentLP <= 0) {
      const playerLost = playerLP <= 0
      setGameResult({ isVictory: !playerLost, isDraw: false, playerLP, opponentLP, turn })
      setShowResult(true)
      setInstruction(playerLost ? 'VITORIA DO OPONENTE' : 'VITORIA!')
    }
  }, [playerLP, opponentLP, turn, gameResult, isRemoteDuel])

  const applyRemoteState = useCallback((remoteState, playerId) => {
    const mapped = mapRemoteDuelState(remoteState, playerId)
    if (!mapped) return
    dispatch({ type: 'SET_GAME_STATE', payload: {
      turn: mapped.turn,
      phaseIndex: mapped.phaseIndex,
      playerLP: mapped.playerLP,
      opponentLP: mapped.opponentLP,
      handCards: mapped.handCards,
      deckCards: mapped.deckCards,
      deckRemaining: mapped.deckRemaining,
      occupiedZones: mapped.occupiedZones,
      playerGY: mapped.playerGY,
      opponentGY: mapped.opponentGY,
      drawnThisTurn: true,
    }})
    if (mapped.status === 'FINISHED') {
      const isDraw = !mapped.winnerId
      const isVictory = !isDraw && mapped.winnerId === playerId
      setInstruction(isDraw ? 'EMPATE' : isVictory ? 'VITORIA' : 'DERROTA')
      setGameResult({ winnerId: mapped.winnerId, isVictory, isDraw, playerLP: mapped.playerLP, opponentLP: mapped.opponentLP, turn: mapped.turn })
      setShowResult(true)
    } else {
      setInstruction(mapped.isPlayerTurn ? 'SEU TURNO' : 'TURNO DO OPONENTE')
    }
  }, [])

  const prevPhaseRef = useRef(null)
  useEffect(() => {
    if (prevPhaseRef.current !== phase.id) {
      prevPhaseRef.current = phase.id
      if (phase.id === 'DRAW' && !drawnThisTurn && !isRemoteDuel) {
        const card = drawFromDeck()
        if (card) setInstruction('CARTA COMPRADA')
      }
    }
  }, [phase.id, drawnThisTurn, isRemoteDuel, drawFromDeck])

  useEffect(() => {
    if (selectedCard) return
    const msgs = {
      DRAW: !drawnThisTurn ? 'CLIQUE NO DECK PARA COMPRAR UMA CARTA' : 'DRAW PHASE — CARTA JA COMPRADA',
      STANDBY: 'STANDBY PHASE — AGUARDE EFEITOS CONTINUOS',
      MAIN1: 'MAIN PHASE 1 — SELECIONE UMA CARTA NA MAO OU NO CAMPO',
      BATTLE: attackingZone ? 'CLIQUE EM UMA ZONA DO OPONENTE PARA ATACAR' : 'BATTLE PHASE — SELECIONE UM MONSTRO PARA ATACAR',
      MAIN2: 'MAIN PHASE 2 — SELECIONE UMA CARTA NA MAO OU NO CAMPO',
      END: 'END PHASE — AVANCE PARA FINALIZAR O TURNO',
    }
    setInstruction(msgs[phase.id] ?? '')
  }, [phase.id, drawnThisTurn, attackingZone, selectedCard])

  const executeAction = useCallback((actionId) => {
    if (!selectedCard) return
    if (remoteTransportRef.current) {
      if (actionId === 'attack') {
        setActiveAction('attack')
        setAttackingZone(selectedCard.zoneKey)
        highlightAttackTargets()
        setInstruction('CHOOSE AN OPPONENT TARGET TO ATTACK')
        return
      }
      const payload = remoteActionPayload(actionId, selectedCard)
      if (payload) { remoteTransportRef.current.sendAction(payload); clearSelection(); setInstruction('ACAO ENVIADA') }
      return
    }
    switch (actionId) {
      case 'tribute-summon':
        if (selectedCard?.card) { startTributeSummon(selectedCard.card, selectedCard.index, 'tribute-summon'); clearSelection() }
        break
      case 'special-summon': {
        setInstruction(`SPECIAL SUMMON: ${selectedCard?.card?.name ?? ''}`)
        addToChain(selectedCard?.card, 'SPECIAL_SUMMON')
        const freeIdxSS = [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`])
        if (freeIdxSS !== undefined && selectedCard?.card) {
          const rawImg = selectedCard.card?.url || selectedCard.card?.card_images?.[0]?.image_url || ''
          const displayUrl = proxiedUrl(rawImg)
          dispatch({ type: 'PLACE_IN_ZONE', zoneKey: `pm${freeIdxSS}`, slotData: { card: selectedCard.card, dataUrl: displayUrl, position: 'attack', faceDown: false, summonedThisTurn: true } })
          dispatch({ type: 'REMOVE_FROM_HAND', index: selectedCard.index })
        }
        clearSelection()
        break
      }
      case 'normal-summon':
      case 'set-monster': {
        const freeIdx = [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`])
        if (freeIdx === undefined) { setInstruction('NO FREE MONSTER ZONE'); break }
        const rawImg = selectedCard.card?.url || selectedCard.card?.card_images?.[0]?.image_url || ''
        const displayUrl = proxiedUrl(rawImg)
        const isSet = actionId === 'set-monster'
        dispatch({ type: 'PLACE_IN_ZONE', zoneKey: `pm${freeIdx}`, slotData: { card: selectedCard.card, dataUrl: displayUrl, position: isSet ? 'defense' : 'attack', faceDown: isSet, summonedThisTurn: true } })
        dispatch({ type: 'REMOVE_FROM_HAND', index: selectedCard.index })
        dispatch({ type: 'NORMAL_SUMMONED' })
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
        const displayUrl = proxiedUrl(rawImg)
        const faceDown = actionId !== 'activate-spell'
        dispatch({ type: 'PLACE_IN_ZONE', zoneKey: `ps${freeIdx}`, slotData: { card: selectedCard.card, dataUrl: displayUrl, position: 'spell', faceDown, summonedThisTurn: true } })
        dispatch({ type: 'REMOVE_FROM_HAND', index: selectedCard.index })
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
        if (selectedCard.zoneKey) {
          const e = occupiedZones[selectedCard.zoneKey]
          if (e) dispatch({ type: 'PLACE_IN_ZONE', zoneKey: selectedCard.zoneKey, slotData: { ...e, position: 'attack', faceDown: false, summonedThisTurn: true } })
          dispatch({ type: 'NORMAL_SUMMONED' })
        }
        clearSelection()
        setInstruction('FLIP SUMMON!')
        break
      case 'change-position':
        if (selectedCard.zoneKey) {
          const e = occupiedZones[selectedCard.zoneKey]
          if (e) {
            const toDefense = e.position !== 'defense'
            dispatch({ type: 'PLACE_IN_ZONE', zoneKey: selectedCard.zoneKey, slotData: { ...e, position: toDefense ? 'defense' : 'attack', faceDown: false } })
          }
          dispatch({ type: 'POSITION_CHANGED' })
        }
        clearSelection()
        setInstruction('BATTLE POSITION CHANGED')
        break
      case 'activate-set':
        if (selectedCard.zoneKey) {
          const e = occupiedZones[selectedCard.zoneKey]
          if (e) dispatch({ type: 'PLACE_IN_ZONE', zoneKey: selectedCard.zoneKey, slotData: { ...e, faceDown: false, summonedThisTurn: false } })
        }
        clearSelection()
        setInstruction('CARD ACTIVATED!')
        break
      case 'view-details':
        if (selectedCard) setDetailCard(selectedCard.card)
        clearSelection()
        break
      case 'cancel':
        clearSelection()
        break
      default: break
    }
  }, [selectedCard, occupiedZones, setNormalSummoned, setPositionChanged, clearSelection])

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

  const prevOccupied = useRef(occupiedZones)
  useEffect(() => {
    if (!activeAction || activeAction === 'attack' || activeAction === 'view-details') return
    if (occupiedZones !== prevOccupied.current) {
      prevOccupied.current = occupiedZones
      clearSelection()
    }
  }, [occupiedZones, activeAction, clearSelection])

  const startTributeSummon = useCallback((card, index, actionId) => {
    const level = card.level ?? 0
    const required = level >= 7 ? 2 : 1
    setPendingSummon({ card, index, actionId, requiredTributes: required, selectedTributes: [] })
    setInstruction(`SELECIONE ${required} MONSTRO(S) PARA TRIBUTAR`)
    document.querySelectorAll('#playerZones .zone--monster.occupied').forEach(el => el.classList.add('zone--action-target'))
  }, [])

  const addTribute = useCallback((zoneKey) => {
    setPendingSummon(prev => {
      if (!prev) return prev
      const already = prev.selectedTributes.includes(zoneKey)
      if (already) return prev
      const next = { ...prev, selectedTributes: [...prev.selectedTributes, zoneKey] }
      if (next.selectedTributes.length >= next.requiredTributes) {
        next.selectedTributes.forEach(zk => sendToGraveyard(zk, 'player'))
        dispatch({ type: 'REMOVE_FROM_HAND', index: next.index })
        dispatch({ type: 'NORMAL_SUMMONED' })
        clearZoneHighlights()
        const isSet = next.actionId === 'set-monster'
        const freeIdx = [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`])
        if (freeIdx !== undefined) {
          const rawImg = next.card?.url || next.card?.card_images?.[0]?.image_url || ''
          const displayUrl = proxiedUrl(rawImg)
          dispatch({ type: 'PLACE_IN_ZONE', zoneKey: `pm${freeIdx}`, slotData: { card: next.card, dataUrl: displayUrl, position: isSet ? 'defense' : 'attack', faceDown: isSet, summonedThisTurn: true } })
        }
        setInstruction(isSet ? 'TRIBUTE SET!' : 'TRIBUTE SUMMON!')
        return null
      }
      setInstruction(`SELECIONE MAIS ${next.requiredTributes - next.selectedTributes.length} MONSTRO(S)`)
      return next
    })
  }, [sendToGraveyard, occupiedZones])

  const cancelPendingSummon = useCallback(() => {
    clearZoneHighlights()
    setPendingSummon(null)
    setInstruction('SUMMON CANCELED')
  }, [])

  const addToChain = useCallback((card, actionType) => {
    const speed = (card?.type ?? '').toUpperCase().includes('COUNTER') ? 3
      : ['QUICK','SPEED','TRAP'].some(k => (card?.type ?? '').toUpperCase().includes(k)) ? 2 : 1
    if (chain.length > 0 && speed < Math.max(...chain.map(l => l.speed))) {
      setInstruction('SPELL SPEED TOO LOW TO CHAIN')
      return false
    }
    setChain(prev => [...prev, { card, actionType, speed }])
    return true
  }, [chain])

  const resolveChain = useCallback(() => {
    if (chain.length === 0) return
    ;[...chain].reverse().forEach(link => setInstruction(`CHAIN RESOLVE: ${link.card?.name ?? ''} — ${link.actionType}`))
    setChain([])
  }, [chain])

  useEffect(() => { window.__duelCtx = { selectedCard, clearSelection, removeCardFromHand } })

  const resetDuel = useCallback(() => {
    dispatch({ type: 'RESET' })
    setDragState({ active: false, fromIndex: null, card: null })
    setAttackingZone(null)
    setSelectedCard(null)
    setActiveAction(null)
    setIsRemoteDuel(false)
    remoteTransportRef.current = null
    setGameResult(null)
    setShowResult(false)
    setInstruction('')
    setDetailCard(null)
    setPanelMode('idle')
    setPanelData(null)
    setPanelLastData(null)
    setPendingSummon(null)
    setChain([])
    setPhaseOverlay(null)
  }, [])

  return (
    <DuelContext.Provider value={{
      turn, phase, phaseIndex, drawnThisTurn, turnTimer,
      canDraw, canSummon, canAttack,
      nextPhase, markDrawn, phaseOverlay,
      flags, setNormalSummoned, setPositionChanged, setZoneAttacked,
      playerLP, opponentLP, dealDamage,
      deckCards, deckRemaining, initDeck, drawFromDeck,
      deckViewerOpen, setDeckViewerOpen,
      handCards, addCardToHand, removeCardFromHand, setHandCards,
      opponentHand, opponentDeckCards, opponentDeckRemaining,
      addCardToOpponentHand, removeFromOpponentHand,
      initOpponent, opponentDraw,
      occupiedZones, setOccupiedZones, placeCardInZone,
      playerGY, opponentGY, sendToGraveyard,
      playerBanished, opponentBanished, sendToBanished,
      dragState, startDrag, endDrag,
      attackingZone, startAttack, cancelAttack, setAttackingZone,
      isRemoteDuel, configureRemoteTransport, sendRemoteAttackTarget, sendRemoteCardToZone,
      selectedCard, selectCard, clearSelection,
      activeAction, setActiveAction, executeAction,
      applyRemoteState, resetDuel,
      gameResult, setGameResult, showResult, setShowResult,
      detailCard, setDetailCard,
      panelMode, panelData, panelLastData, updatePanel, scheduleIdle,
      instruction, setInstruction,
      pendingSummon, startTributeSummon, addTribute, cancelPendingSummon,
      chain, addToChain, resolveChain,
    }}>
      {children}
    </DuelContext.Provider>
  )
}

export const useDuel = () => useContext(DuelContext)
