import { useEffect, useRef } from 'react'
import { useDuel } from '../contexts/DuelContext'

const AI_DELAY = 1000

function isMonster(type) {
  const t = String(type ?? '').toUpperCase()
  return t.includes('MONSTER') && !t.includes('SPELL') && !t.includes('TRAP')
}

function isSpellOrTrap(type) {
  const t = String(type ?? '').toUpperCase()
  return t.includes('SPELL') || t.includes('TRAP')
}

function monsterAtk(card) { return card?.atk ?? 0 }

function monsterDef(card) { return card?.def ?? 0 }

export function useAiOpponent(isLocal) {
  const duel = useDuel()
  const runningRef = useRef(false)

  const isOpponentTurn = duel.turn > 1 && duel.turn % 2 === 0

  useEffect(() => {
    if (!isLocal || runningRef.current || !isOpponentTurn || duel.phaseOverlay) return

    const {
      phase, drawnThisTurn,
      opponentHand, opponentDraw, addCardToOpponentHand,
      removeFromOpponentHand,
      occupiedZones, setOccupiedZones, opponentLP, playerLP, dealDamage,
      opponentGY, setOpponentGY, playerGY, setPlayerGY,
      nextPhase, setInstruction, setFlags,
    } = duel

    const playerMonsterZones = ['pm0','pm1','pm2','pm3','pm4']
    const opponentMonsterZones = ['om0','om1','om2','om3','om4']
    const opponentSpellZones = ['os0','os1','os2','os3','os4']

    runningRef.current = true

    async function run() {
      const wait = (ms) => new Promise(r => setTimeout(r, ms))

      try {
        if (phase.id === 'DRAW') {
          if (!drawnThisTurn) {
            const card = opponentDraw()
            if (card) addCardToOpponentHand(card)
            setInstruction('OPONENTE — COMPROU CARTA')
            await wait(AI_DELAY)
          }
          nextPhase()
          await wait(AI_DELAY / 2)
          runningRef.current = false
          return
        }

        if (phase.id === 'MAIN1' || phase.id === 'MAIN2') {
          const freeMonsterZones = opponentMonsterZones.filter(z => !occupiedZones[z])
          const freeSpellZones = opponentSpellZones.filter(z => !occupiedZones[z])

          if (phase.id === 'MAIN1') {
            const playerAttackers = playerMonsterZones
              .map(z => occupiedZones[z])
              .filter(e => e?.card && e.position !== 'defense')

            const bestDefender = (playerAttackers.length > 0)
              ? opponentHand
                  .filter(c => c && isMonster(c.type) && freeMonsterZones.length > 0)
                  .sort((a, b) => monsterDef(b) - monsterDef(a))[0]
              : null

            if (bestDefender && freeMonsterZones.length > 0) {
              const idx = opponentHand.indexOf(bestDefender)
              if (idx >= 0) {
                const zone = freeMonsterZones[0]
                removeFromOpponentHand(idx)
                setOccupiedZones(prev => ({
                  ...prev,
                  [zone]: {
                    card: bestDefender,
                    position: 'defense',
                    faceDown: true,
                    summonedThisTurn: true,
                  }
                }))
                setInstruction(`OPONENTE — BAIXOU ${bestDefender.name} EM DEFESA`)
                await wait(AI_DELAY)
              }
            }

            const bestAttacker = opponentHand
              .filter(c => c && isMonster(c.type) && freeMonsterZones.length > 0)
              .sort((a, b) => monsterAtk(b) - monsterAtk(a))[0]

            if (bestAttacker && freeMonsterZones.length > 0) {
              const idx = opponentHand.indexOf(bestAttacker)
              if (idx >= 0) {
                const zone = freeMonsterZones[0]
                removeFromOpponentHand(idx)
                setOccupiedZones(prev => ({
                  ...prev,
                  [zone]: {
                    card: bestAttacker,
                    position: 'attack',
                    faceDown: false,
                    summonedThisTurn: true,
                  }
                }))
                setInstruction(`OPONENTE — INVOCou ${bestAttacker.name} (ATK ${bestAttacker.atk})`)
                await wait(AI_DELAY)
              }
            }

            const stIdx = opponentHand.findIndex(c => c && isSpellOrTrap(c.type))
            if (stIdx >= 0 && freeSpellZones.length > 0) {
              const card = opponentHand[stIdx]
              removeFromOpponentHand(stIdx)
              setOccupiedZones(prev => ({
                ...prev,
                [freeSpellZones[0]]: { card, position: 'spell', faceDown: true, summonedThisTurn: true }
              }))
              setInstruction(`OPONENTE — BAIXOU ${card.name}`)
              await wait(AI_DELAY / 2)
            }
          }

          if (phase.id === 'MAIN2') {
            const stIdx = opponentHand.findIndex(c => c && isSpellOrTrap(c.type))
            if (stIdx >= 0 && freeSpellZones.length > 0) {
              const card = opponentHand[stIdx]
              removeFromOpponentHand(stIdx)
              setOccupiedZones(prev => ({
                ...prev,
                [freeSpellZones[0]]: { card, position: 'spell', faceDown: true, summonedThisTurn: true }
              }))
              setInstruction(`OPONENTE — BAIXOU ${card.name}`)
              await wait(AI_DELAY / 2)
            }
          }

          nextPhase()
          await wait(AI_DELAY / 2)
          runningRef.current = false
          return
        }

        if (phase.id === 'BATTLE') {
          const opponentAttackers = opponentMonsterZones
            .map(z => ({ zoneKey: z, ...(occupiedZones[z] || {}) }))
            .filter(e => e.card && e.position !== 'defense')

          const playerDefenders = playerMonsterZones
            .map(z => ({ zoneKey: z, ...(occupiedZones[z] || {}) }))
            .filter(e => e.card)

          if (opponentAttackers.length > 0) {
            const sortedAttackers = [...opponentAttackers].sort((a, b) =>
              monsterAtk(b.card) - monsterAtk(a.card)
            )

            for (const attacker of sortedAttackers) {
              const opponentDefenders = playerMonsterZones
                .filter(z => occupiedZones[z]?.card)
                .filter(z => occupiedZones[z].card.cardId !== attacker.card.cardId || true)
                .map(z => ({ zoneKey: z, ...(occupiedZones[z] || {}) }))

              const atk = monsterAtk(attacker.card)

              const canDestroy = opponentDefenders.filter(t =>
                monsterAtk(t.card) < atk || (t.position === 'defense' && monsterDef(t.card) < atk)
              )
              const weakestTarget = canDestroy.length > 0
                ? canDestroy.sort((a, b) => monsterAtk(a.card) - monsterAtk(b.card))[0]
                : null

              if (weakestTarget) {
                const def = weakestTarget.position === 'defense' ? monsterDef(weakestTarget.card) : monsterAtk(weakestTarget.card)
                const dmg = Math.abs(atk - def)

                setOccupiedZones(prev => {
                  const next = { ...prev }
                  delete next[weakestTarget.zoneKey]
                  return next
                })
                setPlayerGY(prev => [...prev, weakestTarget.card])
                const damageToPlayer = weakestTarget.position === 'attack' ? dmg : 0
                if (damageToPlayer > 0) dealDamage(damageToPlayer, 'player')
                setInstruction(`OPONENTE — ${attacker.card.name} DESTRUIU ${weakestTarget.card.name}`)
              } else if (opponentDefenders.length === 0) {
                dealDamage(atk, 'player')
                setInstruction(`OPONENTE — ATAQUE DIRETO (${atk} DMG)`)
              } else {
                const strongest = opponentDefenders.sort((a, b) => monsterAtk(b.card) - monsterAtk(a.card))[0]
                if (monsterAtk(strongest.card) > atk) {
                  setOccupiedZones(prev => {
                    const next = { ...prev }
                    delete next[attacker.zoneKey]
                    return next
                  })
                  setOpponentGY(prev => [...prev, attacker.card])
                  const dmg = monsterAtk(strongest.card) - atk
                  dealDamage(dmg, 'opponent')
                  setInstruction(`OPONENTE — ${attacker.card.name} FOI DESTRUÍDO (-${dmg} LP)`)
                }
              }

              setFlags(f => ({ ...f, attackedZones: new Set([...f.attackedZones, attacker.zoneKey]) }))
              await wait(AI_DELAY)
            }
          }

          nextPhase()
          await wait(AI_DELAY / 2)
          runningRef.current = false
          return
        }

        if (phase.id === 'END') {
          nextPhase()
          await wait(AI_DELAY / 2)
          runningRef.current = false
          return
        }

        nextPhase()
        await wait(AI_DELAY / 2)
        runningRef.current = false
      } catch {
        runningRef.current = false
      }
    }

    run()

    return () => {
      runningRef.current = false
    }
  }, [duel.turn, duel.phase.id, duel.phaseOverlay, isLocal, isOpponentTurn])
}