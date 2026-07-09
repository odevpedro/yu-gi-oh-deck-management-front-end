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
          const freeZone = opponentMonsterZones.find(z => !occupiedZones[z])
          const monsterIdx = opponentHand.findIndex((_, i) => {
            const c = opponentHand[i]
            return c && isMonster(c.type) && freeZone
          })

          if (monsterIdx >= 0 && freeZone) {
            const card = opponentHand[monsterIdx]
            removeFromOpponentHand(monsterIdx)
            setOccupiedZones(prev => ({
              ...prev,
              [freeZone]: {
                card,
                position: 'attack',
                faceDown: false,
                summonedThisTurn: true,
              }
            }))
            setInstruction(`OPONENTE — INVOCou ${card.name}`)
            await wait(AI_DELAY)
          }

          if (phase.id === 'MAIN2') {
            const stIdx = opponentHand.findIndex(c => c && isSpellOrTrap(c.type))
            if (stIdx >= 0) {
              const freeST = opponentSpellZones.find(z => !occupiedZones[z])
              if (freeST) {
                const card = opponentHand[stIdx]
                removeFromOpponentHand(stIdx)
                setOccupiedZones(prev => ({
                  ...prev,
                  [freeST]: { card, position: 'spell', faceDown: true, summonedThisTurn: true }
                }))
                setInstruction(`OPONENTE — BAIXOU ${card.name}`)
                await wait(AI_DELAY / 2)
              }
            }
          }

          nextPhase()
          await wait(AI_DELAY / 2)
          runningRef.current = false
          return
        }

        if (phase.id === 'BATTLE') {
          const opponentAttackers = opponentMonsterZones
            .map((z, i) => ({ zoneKey: z, ...(occupiedZones[z] || {}) }))
            .filter(e => e.card && e.position !== 'defense')

          const playerDefenders = playerMonsterZones
            .map(z => ({ zoneKey: z, ...(occupiedZones[z] || {}) }))
            .filter(e => e.card)

          if (opponentAttackers.length > 0) {
            const attacker = opponentAttackers.reduce((a, b) =>
              (a.card.atk || 0) > (b.card.atk || 0) ? a : b
            )

            const target = playerDefenders.length > 0
              ? playerDefenders.reduce((a, b) =>
                  (a.card.atk || 0) < (b.card.atk || 0) ? a : b
                )
              : null

            setInstruction(
              target
                ? `OPONENTE — ATACOU ${target.card.name} COM ${attacker.card.name}`
                : `OPONENTE — ATAQUE DIRETO COM ${attacker.card.name}`
            )
            await wait(AI_DELAY)

            const atk = attacker.card.atk || 0
            const def = target?.card?.def || attacker.card.def || 0
            const pos = target?.position || 'attack'

            const targetDef = pos === 'defense' ? (target?.card?.def || 0) : atk

            if (target && (atk > targetDef || atk > (target.card.atk || 0))) {
              setOccupiedZones(prev => {
                const next = { ...prev }
                delete next[target.zoneKey]
                return next
              })
              setPlayerGY(prev => [...prev, target.card])
              const dmg = pos === 'defense' ? Math.abs(atk - targetDef) : atk - (target.card.atk || 0)
              dealDamage(dmg, 'player')
              setInstruction(`OPONENTE — ${attacker.card.name} DESTRUIU ${target.card.name} (${dmg} DMG)`)
            } else if (!target) {
              dealDamage(atk, 'player')
              setInstruction(`OPONENTE — ATAQUE DIRETO (${atk} DMG)`)
            } else {
              setOccupiedZones(prev => {
                const next = { ...prev }
                delete next[attacker.zoneKey]
                return next
              })
              setOpponentGY(prev => [...prev, attacker.card])
              const dmg = (target.card.atk || 0) - atk
              dealDamage(dmg, 'opponent')
              setInstruction(`OPONENTE — ${attacker.card.name} FOI DESTRUÍDO (${dmg} DMG)`)
            }

            setFlags(f => ({ ...f, attackedZones: new Set([...f.attackedZones, attacker.zoneKey]) }))
            await wait(AI_DELAY)
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
