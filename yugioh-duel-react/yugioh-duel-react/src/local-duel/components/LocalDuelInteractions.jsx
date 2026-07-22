import { useLayoutEffect, useMemo, useState } from 'react'
import * as Y from 'ygopro-msg-encode'
import PromptPanel from './PromptPanel'

function cardAnchorKey(card) {
  const controller = Number(card?.controller)
  const location = Number(card?.location)
  const sequence = Number(card?.sequence)
  if (![controller, location, sequence].every(Number.isFinite)) return ''
  return `${controller}:${location}:${sequence}`
}

function groupActions(actions) {
  const groups = new Map()
  actions.forEach(action => {
    const key = action.anchorKey || `code:${action.code}:${action.id}`
    if (!groups.has(key)) groups.set(key, { key, code: action.code, actions: [] })
    groups.get(key).actions.push(action)
  })
  return [...groups.values()]
}

function spatialPrompt(prompt, onGame) {
  const message = prompt?.type === 'game' ? prompt.message : null
  if (message instanceof Y.YGOProMsgSelectIdleCmd) {
    const groups = [
      [Y.IdleCmdType.SUMMON, 'Invocar', message.summonableCards],
      [Y.IdleCmdType.SPSUMMON, 'Invocacao especial', message.spSummonableCards],
      [Y.IdleCmdType.REPOS, 'Mudar posicao', message.reposableCards],
      [Y.IdleCmdType.MSET, 'Baixar', message.msetableCards],
      [Y.IdleCmdType.SSET, 'Baixar', message.ssetableCards],
      [Y.IdleCmdType.ACTIVATE, 'Ativar', message.activatableCards],
    ]
    return {
      actions: groups.flatMap(([type, label, cards]) => cards.map((card, index) => ({
        id: `${type}-${index}`,
        label,
        code: Number(card.code) || 0,
        anchorKey: cardAnchorKey(card),
        run: () => onGame(message.prepareResponse(type, Y.IndexResponse(index))),
      }))),
      commands: [
        message.canBp && { label: 'Fase de Batalha', run: () => onGame(message.prepareResponse(Y.IdleCmdType.TO_BP)) },
        message.canEp && { label: 'Encerrar turno', run: () => onGame(message.prepareResponse(Y.IdleCmdType.TO_EP)) },
        message.canShuffle && { label: 'Embaralhar mao', run: () => onGame(message.prepareResponse(Y.IdleCmdType.SHUFFLE)) },
      ].filter(Boolean),
    }
  }

  if (message instanceof Y.YGOProMsgSelectBattleCmd) {
    return {
      actions: [
        ...message.activatableCards.map((card, index) => ({
          id: `activate-${index}`,
          label: 'Ativar',
          code: Number(card.code) || 0,
          anchorKey: cardAnchorKey(card),
          run: () => onGame(message.prepareResponse(Y.BattleCmdType.ACTIVATE, Y.IndexResponse(index))),
        })),
        ...message.attackableCards.map((card, index) => ({
          id: `attack-${index}`,
          label: card.directAttack ? 'Ataque direto' : 'Atacar',
          code: Number(card.code) || 0,
          anchorKey: cardAnchorKey(card),
          run: () => onGame(message.prepareResponse(Y.BattleCmdType.ATTACK, Y.IndexResponse(index))),
        })),
      ],
      commands: [
        message.canM2 && { label: 'Main Phase 2', run: () => onGame(message.prepareResponse(Y.BattleCmdType.TO_M2)) },
        message.canEp && { label: 'Encerrar turno', run: () => onGame(message.prepareResponse(Y.BattleCmdType.TO_EP)) },
      ].filter(Boolean),
    }
  }

  return null
}

function CardActionLayer({ actions }) {
  const groups = useMemo(() => groupActions(actions), [actions])
  const [placements, setPlacements] = useState([])

  useLayoutEffect(() => {
    const position = () => {
      const elements = [...document.querySelectorAll('[data-ocg-key], [data-card-code]')]
      setPlacements(groups.map(group => {
        const element = elements.find(candidate => candidate.dataset.ocgKey === group.key)
          || elements.find(candidate => Number(candidate.dataset.cardCode) === group.code)
        if (!element) return { ...group, anchor: null }
        const rect = element.getBoundingClientRect()
        const actionGroup = [...document.querySelectorAll('.local-card-action-group')]
          .find(candidate => candidate.dataset.anchorKey === group.key)
        const actionRect = actionGroup?.getBoundingClientRect()
        const halfWidth = (actionRect?.width || 0) / 2
        const actionHeight = actionRect?.height || 0
        const placeBelow = rect.top - actionHeight - 6 < 104
        return {
          ...group,
          anchor: {
            left: Math.max(8 + halfWidth, Math.min(window.innerWidth - 8 - halfWidth, rect.left + rect.width / 2)),
            top: placeBelow ? rect.bottom + 6 : rect.top - 6,
            placeBelow,
          },
        }
      }))
    }
    const frame = requestAnimationFrame(position)
    const timer = setTimeout(position, 120)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [groups])

  const missing = placements.filter(group => !group.anchor).flatMap(group => group.actions)

  return (
    <>
      {placements.filter(group => group.anchor).map(group => (
        <div
          className={`local-card-action-group ${group.anchor.placeBelow ? 'is-below' : ''}`}
          key={group.key}
          data-anchor-key={group.key}
          style={{ left: group.anchor.left, top: group.anchor.top }}
        >
          {group.actions.map(action => (
            <button type="button" key={action.id} onClick={action.run}>{action.label}</button>
          ))}
        </div>
      ))}
      {missing.length > 0 && (
        <div className="local-action-fallback">
          {missing.map(action => <button type="button" key={action.id} onClick={action.run}>{action.label}</button>)}
        </div>
      )}
    </>
  )
}

export default function LocalDuelInteractions({ prompt, onLobby, onGame }) {
  const spatial = useMemo(() => spatialPrompt(prompt, onGame), [prompt, onGame])

  if (!prompt) return null

  if (spatial) {
    return (
      <>
        <CardActionLayer actions={spatial.actions} />
        {spatial.commands.length > 0 && (
          <div className="local-global-command-dock">
            {spatial.commands.map(command => (
              <button type="button" key={command.label} onClick={command.run}>{command.label}</button>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div className="ocg-local-actions local-prompt-dock">
      <PromptPanel prompt={prompt} onLobby={onLobby} onGame={onGame} />
    </div>
  )
}
