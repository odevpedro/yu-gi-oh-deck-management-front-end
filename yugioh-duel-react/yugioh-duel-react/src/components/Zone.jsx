// ═══════════════════════════════════════════════════════════
// Zone.jsx — 100% declarativo, sem escrita imperativa no DOM
// ═══════════════════════════════════════════════════════════
import { useRef, useEffect, useCallback, useState } from 'react'
import { useDuel }         from '../contexts/DuelContext'
import { engine }           from '../engine'
import { logger }           from '../utils/logger'
import { isExtraType, imageToDataURL, proxiedUrl } from '../utils/cardHelpers'
import { sfxAttack }        from '../utils/sfx'
import {
  normalSummonFX, specialSummonFX, spellActivationFX,
  sobelEdgeGlow, lpDamageFX as lpDamageFXUtil,
} from '../utils/fx'

const TYPE_CLASS = {
  monster: 'zone--monster',
  spell:   'zone--spell',
  gy:      'zone--gy',
  extra:   'zone--extra',
  field:   'zone--field',
  deck:    'zone--deck',
}
const ZONE_LABELS = {
  monster: 'MONSTER',
  spell:   'SPELL/TRAP',
  gy:      'GY',
  extra:   'EXTRA',
  field:   'FIELD',
  deck:    'DECK',
}

export default function Zone({
  zoneKey,
  type      = 'monster',
  label,
  side      = 'player',
  dataZone,
  className = '',
}) {
  const {
    occupiedZones, placeCardInZone, setOccupiedZones,
    dragState, endDrag, removeCardFromHand, setHandCards,
    attackingZone, setAttackingZone,
    dealDamage, setInstruction,
    sendToGraveyard, setPlayerGY,
    updatePanel,
    selectedCard, selectCard,
    activeAction, clearSelection,
    phase, flags, setZoneAttacked, setNormalSummoned,
    tributePending, setTributePending,
    playerGY, opponentGY, gyViewer, setGyViewer,
  } = useDuel()

  const zoneRef     = useRef(null)
  const prevZoneId  = useRef(null)  // tracks which card last triggered FX
  const fxLock      = useRef(false)
  const prevFaceDown = useRef(null)

  const cardData   = zoneKey ? occupiedZones[zoneKey] : null
  const isOccupied = !!cardData
  const [flipping, setFlipping] = useState(false)

  // ── FX when card lands ─────────────────────────────────
  // Use card.id as stable identity key
  const cardId = cardData?.card?.id ?? null

  // ── Flip animation when faceDown→false ────────────────
  useEffect(() => {
    if (!isOccupied) { prevFaceDown.current = null; return }
    const wasFaceDown = prevFaceDown.current
    const isFaceDown  = cardData?.faceDown ?? false
    prevFaceDown.current = isFaceDown
    if (wasFaceDown === true && isFaceDown === false) {
      setFlipping(true)
      setTimeout(() => setFlipping(false), 420)
    }
  }, [cardData?.faceDown, isOccupied]) // eslint-disable-line

  // ── FX when card lands ────────────────────────────────
  useEffect(() => {
    if (!cardData || prevZoneId.current === cardId || fxLock.current) return
    prevZoneId.current = cardId
    fxLock.current = true

    requestAnimationFrame(() => requestAnimationFrame(() => {
      fxLock.current = false
      const el = zoneRef.current
      if (!el || el.clientWidth === 0) return

      const fullType = (cardData.card?.type || '').toUpperCase()
      const isSpell  = fullType.includes('SPELL')
      const isTrap   = fullType.includes('TRAP')
      const isExtra  = isExtraType(cardData.card?.type)

      if (isSpell || isTrap)  spellActivationFX(el, isSpell)
      else if (isExtra)       specialSummonFX(el, cardData.card?.type ?? '')
      else                    normalSummonFX(el)

      if (cardData.dataUrl) setTimeout(() => sobelEdgeGlow(el, cardData.dataUrl), 900)
    }))
  }, [cardId]) // eslint-disable-line

  // ── Sobel glow quando dataUrl real chega (background fetch) ──
  useEffect(() => {
    const el = zoneRef.current
    if (!cardData?.dataUrl || !el || cardData.faceDown) return
    // só dispara se for dataURL real (não proxied URL)
    if (!cardData.dataUrl.startsWith('data:')) return
    const tid = setTimeout(() => sobelEdgeGlow(el, cardData.dataUrl), 300)
    return () => clearTimeout(tid)
  }, [cardData?.dataUrl]) // eslint-disable-line

  // ── Hover → painel ────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    if (!cardData) return
    updatePanel('card', {
      ...cardData.card,
      imageUrl:   cardData.dataUrl,
      controller: side === 'player' ? 'Você' : 'Oponente',
      position:   cardData.position ?? 'Attack Position',
      faceDown:   false,
    })
  }, [cardData, side, updatePanel])

  // ── Aceite de drop (drag ou action bar) ───────────────
  const actionPending =
    activeAction === 'normal-summon' || activeAction === 'set-monster' ||
    activeAction === 'activate-spell' || activeAction === 'set-spell'  ||
    activeAction === 'set-trap'

  const isValidDrop = !isOccupied && side === 'player' && (() => {
    if (dragState.active) {
      const ct = (dragState.card?.type || '').toUpperCase()
      return ct.includes('SPELL') || ct.includes('TRAP')
        ? type === 'spell'
        : type === 'monster'
    }
    if (actionPending) {
      if (activeAction === 'normal-summon' || activeAction === 'set-monster') return type === 'monster'
      if (['activate-spell','set-spell','set-trap'].includes(activeAction)) return type === 'spell'
    }
    return false
  })()

  // ── Commita carta na zona (sem escrita no DOM) ────────
  const commitCard = useCallback(async (card, fromIndex, action) => {
    if (!card) return
    const rawImg    = card.url || card.card_images?.[0]?.image_url || ''
    // Use proxied URL directly for display — no fetch needed, browser handles it
    const displayUrl = proxiedUrl(rawImg)

    prevZoneId.current = null

    const isSet           = action === 'set-monster'
    const isFaceDownSpell = action === 'set-spell' || action === 'set-trap'
    const position        = isSet ? 'defense' : 'attack'
    const faceDown        = isSet || isFaceDownSpell

    placeCardInZone(zoneKey, { card, dataUrl: displayUrl, position, faceDown, summonedThisTurn: true })
    if (fromIndex != null) removeCardFromHand(fromIndex)

  }, [zoneKey, placeCardInZone, removeCardFromHand])

  // ── mouseUp (drag & drop) ─────────────────────────────
  const handleMouseUp = useCallback(async () => {
    if (!dragState.active || !isValidDrop) return
    const { fromIndex, card } = dragState
    endDrag()
    await commitCard(card, fromIndex, activeAction)
    clearSelection()
    setInstruction('SELECIONE UMA CARTA PARA CONTINUAR')
  }, [dragState, isValidDrop, endDrag, commitCard, clearSelection, setInstruction])

  // ── GY zone click → open viewer ───────────────────────
  const handleGyClick = useCallback(() => {
    setGyViewer(side)
  }, [side, setGyViewer])

  // ── click: zona alvo (action bar) ou seleção de campo ─
  const handlePlayerClick = useCallback(async (e) => {
    e.stopPropagation()

    // 1. Zona alvo de uma ação pendente
    if (isValidDrop && actionPending && selectedCard) {
      const { card, index: fromIndex } = selectedCard
      await commitCard(card, fromIndex ?? null, activeAction)
      clearSelection()
      setInstruction('CARD PLAYED')
      return
    }

    // 1b. Tribute selection mode
    if (tributePending && type === 'monster' && isOccupied && side === 'player') {
      const already = tributePending.tributesSoFar.includes(zoneKey)
      if (already) return
      const newSoFar = [...tributePending.tributesSoFar, zoneKey]
      if (newSoFar.length < tributePending.tributesNeeded) {
        // Need more tributes
        setTributePending({ ...tributePending, tributesSoFar: newSoFar })
        setInstruction(`SELECT ${tributePending.tributesNeeded - newSoFar.length} MORE MONSTER(S) TO TRIBUTE`)
        zoneRef.current?.classList.add('zone--tribute-selected')
        return
      }
      // All tributes selected — complete the summon
      const freeIdx = [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`] || newSoFar.includes(`pm${i}`))
      if (freeIdx === undefined) { setInstruction('NO FREE MONSTER ZONE'); return }
      const rawImg = tributePending.card?.url || tributePending.card?.card_images?.[0]?.image_url || ''
      const displayUrl = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : ''
      setOccupiedZones(prev => {
        const next = { ...prev }
        newSoFar.forEach(zk => {
          if (next[zk]) {
            setPlayerGY(gy => [...gy, next[zk].card])
            delete next[zk]
          }
        })
        next[`pm${freeIdx}`] = {
          card: tributePending.card, dataUrl: displayUrl,
          position: 'attack', faceDown: false, summonedThisTurn: true,
        }
        return next
      })
      setHandCards(prev => prev.filter((_, i) => i !== tributePending.index))
      setNormalSummoned()
      clearSelection()
      document.querySelectorAll('.zone--tribute-selected').forEach(el => el.classList.remove('zone--tribute-selected'))
      setInstruction('TRIBUTE SUMMON!')
      return
    }

    // 2. Selecionar carta no campo → abre action bar
    if (isOccupied && (type === 'monster' || type === 'spell')) {
      const entry = occupiedZones[zoneKey]
      if (!entry) return

      // Battle Phase shortcut: clicking your own monster auto-declares it as attacker
      if (phase?.id === 'BATTLE' && type === 'monster' && !entry.faceDown && !flags?.attackedZones?.has(zoneKey)) {
        setAttackingZone(zoneKey)
        selectCard({ card: entry.card, location: 'field', zoneKey, position: entry.position ?? 'attack', menuAnchor: null })
        setInstruction('CHOOSE AN OPPONENT TARGET TO ATTACK')
        document.querySelectorAll('.field-selected').forEach(el => el.classList.remove('field-selected'))
        zoneRef.current?.classList.add('field-selected')
        return
      }

      const rect = zoneRef.current?.getBoundingClientRect()
      selectCard({
        card: entry.card, location: 'field', zoneKey,
        position: entry.position ?? 'attack',
        menuAnchor: rect ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height } : null,
      })
      updatePanel('card', {
        ...entry.card,
        imageUrl:   entry.dataUrl,
        controller: 'Você',
        position:   entry.position ?? 'Attack Position',
      })
      document.querySelectorAll('.field-selected')
        .forEach(el => el.classList.remove('field-selected'))
      zoneRef.current?.classList.add('field-selected')
    }
  }, [
    isValidDrop, actionPending, selectedCard,
    isOccupied, type, occupiedZones, zoneKey, phase, flags,
    commitCard, clearSelection, selectCard, updatePanel, setInstruction, setAttackingZone,
    tributePending, setTributePending, setOccupiedZones, setHandCards, setPlayerGY, setNormalSummoned,
  ])

  // ── Zona oponente: recebe ataque ──────────────────────
  const handleOpponentClick = useCallback((e) => {
    e.stopPropagation()
    logger.attack('Zone clicked', { attackingZone, selectedCard, targetZone: zoneKey, side })

    const resolveAttack = (fromZone) => {
      setZoneAttacked(fromZone)
      sfxAttack()
      const gameState = { occupiedZones }
      const mutations = {
        setOccupiedZones,
        setAttackingZone, dealDamage, sendToGraveyard, setInstruction,
        lpDamageFX: lpDamageFXUtil,
      }
      engine.handleAttackTarget(fromZone, zoneKey || null, gameState, mutations)
    }

    // Path 1: attack already declared via action bar
    if (attackingZone) {
      resolveAttack(attackingZone)
      return
    }

    if (phase?.id !== 'BATTLE') {
      logger.attack('Aborted — not Battle Phase')
      return
    }

    // Path 2: monster selected on field
    if (selectedCard?.location === 'field' && selectedCard?.zoneKey) {
      const slot = occupiedZones[selectedCard.zoneKey]
      if (slot && !slot.faceDown && !flags?.attackedZones?.has(selectedCard.zoneKey)) {
        setAttackingZone(selectedCard.zoneKey)
        resolveAttack(selectedCard.zoneKey)
        return
      }
    }

    // Path 3: auto-pick first eligible player monster
    const PLAYER_ZONES = ['pm0','pm1','pm2','pm3','pm4']
    const attacker = PLAYER_ZONES.find(zk => {
      const s = occupiedZones[zk]
      return s && !s.faceDown && !flags?.attackedZones?.has(zk)
    })
    if (attacker) {
      logger.attack('Auto-picked attacker', attacker)
      setAttackingZone(attacker)
      resolveAttack(attacker)
      return
    }

    logger.attack('Aborted — no eligible attacker on field')
  }, [
    attackingZone, selectedCard, phase, flags, occupiedZones, zoneKey,
    setAttackingZone, dealDamage, sendToGraveyard, setInstruction,
  ])

  // ── Classes ───────────────────────────────────────────
  const hasAttacked = isOccupied && side === 'player' && flags?.attackedZones?.has(zoneKey)

  const classes = [
    'zone',
    TYPE_CLASS[type] ?? '',
    isOccupied  ? 'occupied'     : '',
    isValidDrop ? 'drop-target'  : '',
    side === 'opponent' && attackingZone ? 'attack-target' : '',
    flipping ? 'zone--flipping' : '',
    hasAttacked ? 'zone--exhausted' : '',
    className,
  ].filter(Boolean).join(' ')

  // Landing animation — add class briefly when card is placed
  const landingRef = useRef(false)
  useEffect(() => {
    if (!isOccupied || landingRef.current === cardId) return
    landingRef.current = cardId
    const el = zoneRef.current
    if (!el) return
    el.classList.add('card-landing')
    const tid = setTimeout(() => el.classList.remove('card-landing'), 450)
    return () => clearTimeout(tid)
  }, [cardId, isOccupied]) // eslint-disable-line

  return (
    <div
      ref={zoneRef}
      className={classes}
      data-zone={dataZone}
      data-zone-key={zoneKey}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onClick={type === 'gy' ? handleGyClick : side === 'player' ? handlePlayerClick : handleOpponentClick}
      style={{ position: 'relative', overflow: 'visible' }}
    >
      {/* Label — só quando vazia */}
      {!isOccupied && (
        <div className="zone-label">{label ?? ZONE_LABELS[type] ?? type.toUpperCase()}</div>
      )}

      {/* GY count badge */}
      {type === 'gy' && (() => {
        const count = side === 'player' ? (playerGY?.length ?? 0) : (opponentGY?.length ?? 0)
        if (count === 0) return null
        return (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{
              fontFamily: 'Orbitron, monospace', fontSize: '.55rem',
              fontWeight: 700, color: 'rgba(180,150,110,.75)',
              textShadow: '0 0 8px rgba(120,80,20,.6)',
            }}>{count}</span>
            <span style={{
              fontFamily: 'Orbitron, monospace', fontSize: '.25rem',
              color: 'rgba(140,110,70,.45)', letterSpacing: '.1em',
            }}>CARDS</span>
          </div>
        )
      })()}

      {/* Carta face-down (Set) — mostra verso, rotacionada se monstro */}
      {isOccupied && cardData?.faceDown && (
        <img
          src="/card-back.png"
          alt="Face Down"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', borderRadius: '3px',
            zIndex: 1, pointerEvents: 'none',
            filter: 'brightness(.85)',
            transform: cardData.position === 'defense' ? 'rotate(90deg) scaleX(.82)' : 'none',
          }}
        />
      )}

      {/* Carta face-up — mostra arte */}
      {isOccupied && !cardData?.faceDown && (
        cardData?.dataUrl
          ? <img
              src={cardData.dataUrl}
              alt={cardData.card?.name ?? ''}
              style={{
                position: 'absolute',
                width:  cardData.position === 'defense' ? '100%' : '100%',
                height: cardData.position === 'defense' ? '100%' : '100%',
                objectFit: 'cover', objectPosition: 'top center',
                borderRadius: '3px', zIndex: 1, pointerEvents: 'none',
                inset: 0,
                transform: cardData.position === 'defense' ? 'rotate(90deg) scaleX(.82)' : 'none',
                transition: 'transform .28s cubic-bezier(.23,1,.32,1)',
              }}
            />
          : <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(145deg, #0e1828, #090f1e)',
              borderRadius: '3px', padding: '6px', pointerEvents: 'none',
            }}>
              <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>🃏</span>
              <span style={{
                fontFamily: 'Orbitron, monospace', fontSize: '.28rem',
                color: 'rgba(160,200,255,.55)', textAlign: 'center',
                marginTop: 5, lineHeight: 1.4,
              }}>
                {cardData?.card?.name ?? ''}
              </span>
            </div>
      )}

      {/* ── ATK/DEF badges (monstro face-up) ── */}
      {isOccupied && !cardData?.faceDown && type === 'monster' && (
        (() => {
          const atk = cardData.card?.atk
          const def = cardData.card?.def
          const isDefPos = cardData.position === 'defense'
          if (atk == null && def == null) return null
          return (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              zIndex: 4, display: 'flex', justifyContent: 'center',
              gap: '3px', padding: '0 2px 3px', pointerEvents: 'none',
            }}>
              {atk != null && (
                <span style={{
                  fontFamily: 'Orbitron, monospace', fontSize: '.28rem',
                  fontWeight: 700, letterSpacing: '.04em',
                  background: 'rgba(10,4,4,.88)',
                  color: isDefPos ? 'rgba(180,130,60,.7)' : 'rgba(220,80,70,1)',
                  padding: '1px 4px', borderRadius: '2px',
                  border: `1px solid ${isDefPos ? 'rgba(120,70,20,.4)' : 'rgba(200,50,50,.5)'}`,
                  minWidth: '28px', textAlign: 'center',
                }}>
                  {isDefPos ? 'ATK' : atk}
                </span>
              )}
              {def != null && (
                <span style={{
                  fontFamily: 'Orbitron, monospace', fontSize: '.28rem',
                  fontWeight: 700, letterSpacing: '.04em',
                  background: 'rgba(4,8,14,.88)',
                  color: isDefPos ? 'rgba(70,150,220,1)' : 'rgba(80,130,180,.7)',
                  padding: '1px 4px', borderRadius: '2px',
                  border: `1px solid ${isDefPos ? 'rgba(40,90,160,.5)' : 'rgba(30,60,100,.4)'}`,
                  minWidth: '28px', textAlign: 'center',
                }}>
                  {isDefPos ? def : 'DEF'}
                </span>
              )}
            </div>
          )
        })()
      )}

      {/* Badge DEF position label (quando face-up defesa) */}
      {isOccupied && !cardData?.faceDown && cardData?.position === 'defense' && (
        <div style={{
          position: 'absolute', top: 3, left: 0, right: 0,
          zIndex: 4, textAlign: 'center', pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'Orbitron, monospace', fontSize: '.27rem',
            background: 'rgba(4,10,20,.85)', color: 'rgba(70,140,210,.85)',
            padding: '1px 5px', borderRadius: '2px',
            border: '1px solid rgba(40,90,160,.4)', letterSpacing: '.1em',
          }}>DEF</span>
        </div>
      )}

      {/* Badge SET (face-down) */}
      {isOccupied && cardData?.faceDown && (
        <div style={{
          position: 'absolute', bottom: 4, left: 0, right: 0,
          zIndex: 3, textAlign: 'center', pointerEvents: 'none',
        }}>
          <span style={{
            fontFamily: 'Orbitron, monospace', fontSize: '.3rem',
            background: 'rgba(8,4,16,.85)', color: 'rgba(160,120,255,.8)',
            padding: '1px 5px', borderRadius: '2px',
            border: '1px solid rgba(100,50,180,.35)', letterSpacing: '.1em',
          }}>SET</span>
        </div>
      )}

      {/* ── Exhausted overlay (já atacou) ── */}
      {hasAttacked && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'rgba(0,0,0,.45)',
          borderRadius: '3px', pointerEvents: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: '4px',
        }}>
          <span style={{
            fontFamily: 'Orbitron, monospace', fontSize: '.26rem',
            letterSpacing: '.08em', color: 'rgba(180,60,60,.9)',
            background: 'rgba(0,0,0,.7)', padding: '1px 5px',
            borderRadius: '2px', border: '1px solid rgba(160,40,40,.4)',
          }}>ATTACKED</span>
        </div>
      )}
    </div>
  )
}