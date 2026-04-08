// ═══════════════════════════════════════════════════════════
// LocalEngine.js — Implementação local da engine de duelo
//
// Contém TODA a lógica de regras do jogo.
// Quando o ygopro core (JNI/WebSocket) for integrado,
// substituir por WebSocketEngine que implementa a mesma interface.
// ═══════════════════════════════════════════════════════════

import { DuelEngineAdapter }  from './DuelEngineAdapter'
import { logger }              from '../utils/logger'
import { resolveActions }     from '../utils/actionResolver'
import { imageToDataURL, proxiedUrl } from '../utils/cardHelpers'
import { attackArrow }        from '../fx/effects/AttackArrow'
import { destroyFX }          from '../utils/fx'

export class LocalEngine extends DuelEngineAdapter {

  // ── Helpers privados ────────────────────────────────────

  _rawImg(card) {
    return card?.url || card?.card_images?.[0]?.image_url || ''
  }

  _displayUrl(card) {
    const raw = this._rawImg(card)
    return raw ? proxiedUrl(raw) : ''
  }

  _freeMonsterZone(occupiedZones) {
    return [0,1,2,3,4].find(i => !occupiedZones[`pm${i}`])
  }

  _freeSpellZone(occupiedZones) {
    return [0,1,2,3,4].find(i => !occupiedZones[`ps${i}`])
  }

  // ── getAvailableActions ──────────────────────────────────

  getAvailableActions(gameState) {
    const { selectedCard, phase, flags, occupiedZones } = gameState
    return resolveActions(selectedCard, phase, flags, occupiedZones)
  }

  // ── requestAction ────────────────────────────────────────

  requestAction(actionId, gameState, mutations) {
    const { selectedCard, occupiedZones } = gameState
    const {
      setOccupiedZones, setHandCards, setInstruction,
      setSelectedCard, setActiveAction, setAttackingZone,
      setNormalSummoned, setPositionChanged,
      clearSelection, clearZoneHighlights,
      highlightSummonZones, highlightSpellZones, highlightAttackTargets,
      sendToGraveyard,
    } = mutations

    if (!selectedCard) return

    switch (actionId) {

      case 'normal-summon':
      case 'set-monster': {
        const freeIdx = this._freeMonsterZone(occupiedZones)
        if (freeIdx === undefined) { setInstruction('NO FREE MONSTER ZONE'); return }

        const zk      = `pm${freeIdx}`
        const isSet   = actionId === 'set-monster'
        const snap    = selectedCard
        const rawImg  = this._rawImg(snap.card)
        const dispUrl = this._displayUrl(snap.card)

        // Remove da mão imediatamente (feedback visual)
        setHandCards(prev => prev.filter((_, i) => i !== snap.index))
        setNormalSummoned()
        clearZoneHighlights()
        setSelectedCard(null)
        setActiveAction(null)
        setInstruction(isSet ? 'MONSTER SET' : 'SUMMONED!')

        // Coloca no campo após delay (sensação de deslocamento)
        setTimeout(() => {
          setOccupiedZones(prev => ({
            ...prev,
            [zk]: {
              card: snap.card,
              dataUrl: dispUrl,
              position: isSet ? 'defense' : 'attack',
              faceDown: isSet,
              summonedThisTurn: true,
              hasAttackedThisTurn: false,
            }
          }))
          // Fetch real dataUrl em background para Sobel glow
          if (rawImg && !isSet) {
            imageToDataURL(rawImg)
              .then(dataUrl => dataUrl && setOccupiedZones(prev => {
                const slot = prev[zk]
                if (!slot) return prev
                return { ...prev, [zk]: { ...slot, dataUrl } }
              }))
              .catch(() => {})
          }
        }, 220)
        break
      }

      case 'activate-spell':
      case 'set-spell':
      case 'set-trap': {
        const freeIdx = this._freeSpellZone(occupiedZones)
        if (freeIdx === undefined) { setInstruction('NO FREE SPELL/TRAP ZONE'); return }

        const zk       = `ps${freeIdx}`
        const faceDown = actionId !== 'activate-spell'
        const snap     = selectedCard
        const rawImg   = this._rawImg(snap.card)
        const dispUrl  = this._displayUrl(snap.card)

        setHandCards(prev => prev.filter((_, i) => i !== snap.index))
        clearZoneHighlights()
        setSelectedCard(null)
        setActiveAction(null)
        setInstruction(faceDown ? 'CARD SET' : 'SPELL ACTIVATED!')

        setTimeout(() => {
          setOccupiedZones(prev => ({
            ...prev,
            [zk]: {
              card: snap.card,
              dataUrl: dispUrl,
              position: 'spell',
              faceDown,
              summonedThisTurn: true,
            }
          }))
          if (rawImg && !faceDown) {
            imageToDataURL(rawImg)
              .then(dataUrl => dataUrl && setOccupiedZones(prev => {
                const slot = prev[zk]
                if (!slot) return prev
                return { ...prev, [zk]: { ...slot, dataUrl } }
              }))
              .catch(() => {})
          }
        }, 220)
        break
      }

      case 'attack':
        logger.attack('Declaring attack', { attackingZone: selectedCard.zoneKey, card: selectedCard.card?.name })
        setAttackingZone(selectedCard.zoneKey)
        setSelectedCard(null)
        setActiveAction(null)
        clearZoneHighlights()
        highlightAttackTargets()
        setInstruction('CHOOSE AN OPPONENT TARGET TO ATTACK')
        break

      case 'flip-summon':
        if (selectedCard.zoneKey) {
          setOccupiedZones(prev => {
            const e = prev[selectedCard.zoneKey]
            if (!e) return prev
            return {
              ...prev,
              [selectedCard.zoneKey]: {
                ...e,
                position: 'attack',
                faceDown: false,
                summonedThisTurn: true,
                hasAttackedThisTurn: false,
              }
            }
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
            return {
              ...prev,
              [selectedCard.zoneKey]: {
                ...e,
                position: toDefense ? 'defense' : 'attack',
                faceDown: false,
              }
            }
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
            return {
              ...prev,
              [selectedCard.zoneKey]: {
                ...e,
                faceDown: false,
                summonedThisTurn: false,
              }
            }
          })
        }
        clearSelection()
        setInstruction('CARD ACTIVATED!')
        break

      case 'view-details':
        clearSelection()
        break

      case 'cancel':
        clearSelection()
        break

      default:
        break
    }
  }

  // ── handleAttackTarget ───────────────────────────────────

  handleAttackTarget(attackingZone, targetZone, gameState, mutations) {
    const { occupiedZones } = gameState
    const {
      setOccupiedZones, setInstruction,
      setAttackingZone, dealDamage, sendToGraveyard, lpDamageFX,
    } = mutations

    const attackerSlot = occupiedZones[attackingZone]
    const targetSlot   = targetZone ? occupiedZones[targetZone] : null

    const attackerEl = document.querySelector(`[data-zone-key="${attackingZone}"]`)
    const targetEl   = targetZone
      ? document.querySelector(`[data-zone-key="${targetZone}"]`)
      : document.querySelector('.field-side--opponent')

    setAttackingZone(null)

    setOccupiedZones(prev => {
      const slot = prev[attackingZone]
      if (!slot) return prev
      return { ...prev, [attackingZone]: { ...slot, hasAttackedThisTurn: true } }
    })

    const resolve = () => {
      this._resolveBattle(attackingZone, targetZone, targetSlot, attackerSlot, {
        ...mutations, lpDamageFX,
      })
    }

    logger.attack('handleAttackTarget', { attackingZone, targetZone, hasAttackerEl: !!attackerEl, hasTargetEl: !!targetEl })
    if (attackerEl) {
      logger.fx('Firing attackArrow')
      attackArrow.fire(attackerEl, targetEl, () => {
        logger.attack('Arrow impact — resolving battle')
        resolve()
      })
    } else {
      logger.attack('No attackerEl found — resolving directly')
      resolve()
    }
  }

  _resolveBattle(attackingZone, targetZone, targetSlot, attackerSlot, mutations) {
    const { dealDamage, sendToGraveyard, setInstruction, lpDamageFX } = mutations

    // ── Ataque direto ──────────────────────────────────────
    if (!targetSlot) {
      const atk   = attackerSlot?.card?.atk ?? 0
      const barEl = document.getElementById('opponentLpBar')
      const valEl = document.getElementById('opponentLpVal')
      dealDamage(atk, 'opponent')
      if (lpDamageFX) lpDamageFX(atk, barEl, valEl, 45)
      setInstruction(`DIRECT ATTACK — ${atk} DAMAGE!`)
      return
    }

    // ── Monster vs Monster ────────────────────────────────
    const atkA = attackerSlot?.card?.atk ?? 0
    const statB = targetSlot.position === 'defense'
      ? (targetSlot.card?.def ?? 0)
      : (targetSlot.card?.atk ?? 0)
    const diff = atkA - statB

    const destroyZone = (zoneKey, side) => {
      const el = document.querySelector(`[data-zone-key="${zoneKey}"]`)
      destroyFX(el, () => sendToGraveyard(zoneKey, side))
    }

    if (diff > 0) {
      destroyZone(targetZone, 'opponent')
      setInstruction(`DESTROYED! (${atkA} vs ${statB})`)
    } else if (diff < 0) {
      const dmg = Math.abs(diff)
      if (targetSlot.position !== 'defense') {
        destroyZone(attackingZone, 'player')
      }
      const barEl = document.getElementById('playerLpBar')
      const valEl = document.getElementById('playerLpVal')
      dealDamage(dmg, 'player')
      if (lpDamageFX) lpDamageFX(dmg, barEl, valEl, 45)
      setInstruction(`BLOCKED — ${dmg} DAMAGE TAKEN`)
    } else {
      destroyZone(targetZone,    'opponent')
      destroyZone(attackingZone, 'player')
      setInstruction('TIE — BOTH DESTROYED')
    }
  }

  // ── Limpa flags por turno nos slots ─────────────────────
  // Chamado pelo DuelContext ao virar o turno (nextPhase no END)
  clearTurnSlotFlags(occupiedZones, setOccupiedZones) {
    setOccupiedZones(prev => {
      const next = { ...prev }
      for (const zk of Object.keys(next)) {
        if (next[zk]) {
          next[zk] = {
            ...next[zk],
            summonedThisTurn:    false,
            hasAttackedThisTurn: false,
          }
        }
      }
      return next
    })
  }
}