import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import * as Y from 'ygopro-msg-encode'
import PromptPanel from './PromptPanel'

const VISIBLE_CARD_LOCATIONS = new Set([2, 4, 8])

function cardAnchorKey(card) {
  const controller = Number(card?.controller)
  const location = Number(card?.location)
  const sequence = Number(card?.sequence)
  if (![controller, location, sequence].every(Number.isFinite)) return ''
  return `${controller}:${location}:${sequence}`
}

function zoneKeyForPlace(place, localPlayer) {
  const own = Number(place.player) === Number(localPlayer)
  const prefix = Number(place.location) === 4
    ? (own ? 'pm' : 'om')
    : (own ? 'ps' : 'os')
  return `${prefix}${place.sequence}`
}

function isVisibleCard(card) {
  return VISIBLE_CARD_LOCATIONS.has(Number(card?.location))
}

function groupActions(actions) {
  const groups = new Map()
  actions.forEach(action => {
    const key = action.zoneKey
      ? `zone:${action.zoneKey}`
      : action.anchorKey || `code:${action.code}:${action.id}`
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        code: action.code,
        zoneKey: action.zoneKey,
        actions: [],
      })
    }
    groups.get(key).actions.push(action)
  })
  return [...groups.values()]
}

function immediateSpatialPrompt(prompt, onGame) {
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

  if (message instanceof Y.YGOProMsgSelectEffectYn && isVisibleCard(message)) {
    return {
      label: 'Ativar efeito?',
      actions: [
        {
          id: 'effect-yes',
          label: 'Ativar',
          code: Number(message.code) || 0,
          anchorKey: cardAnchorKey(message),
          run: () => onGame(message.prepareResponse(true)),
        },
        {
          id: 'effect-no',
          label: 'Ignorar',
          code: Number(message.code) || 0,
          anchorKey: cardAnchorKey(message),
          run: () => onGame(message.prepareResponse(false)),
        },
      ],
      commands: [],
    }
  }

  if (message instanceof Y.YGOProMsgSelectChain && message.chains.length > 0) {
    const forced = message.chains.some(chain => chain.forced)
    return {
      label: 'Corrente',
      actions: message.chains.map((card, index) => ({
        id: `chain-${index}`,
        label: 'Encadear',
        code: Number(card.code) || 0,
        anchorKey: cardAnchorKey(card),
        run: () => onGame(message.prepareResponse(Y.IndexResponse(index))),
      })),
      commands: forced
        ? []
        : [{ label: 'Nao responder', run: () => onGame(message.prepareResponse(null)) }],
    }
  }

  if (message instanceof Y.YGOProMsgSelectUnselectCard) {
    return {
      label: 'Selecione ou remova',
      actions: [
        ...message.selectableCards.map((card, index) => ({
          id: `select-${index}`,
          label: 'Selecionar',
          code: Number(card.code) || 0,
          anchorKey: cardAnchorKey(card),
          run: () => onGame(message.prepareResponse(Y.IndexResponse(index))),
        })),
        ...message.unselectableCards.map((card, index) => ({
          id: `unselect-${index}`,
          label: 'Remover',
          selected: true,
          code: Number(card.code) || 0,
          anchorKey: cardAnchorKey(card),
          run: () => onGame(message.prepareResponse(Y.IndexResponse(message.selectableCount + index))),
        })),
      ],
      commands: [
        message.finishable && { label: 'Concluir', run: () => onGame(message.prepareResponse(null)) },
        message.cancelable && { label: 'Cancelar', run: () => onGame(message.prepareResponse(null)) },
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
      const elements = [...document.querySelectorAll('[data-ocg-key], [data-card-code], [data-zone-key]')]
      setPlacements(groups.map(group => {
        const element = group.zoneKey
          ? elements.find(candidate => candidate.dataset.zoneKey === group.zoneKey)
          : elements.find(candidate => candidate.dataset.ocgKey === group.key)
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
            <button
              type="button"
              className={action.selected ? 'is-selected' : ''}
              key={action.id}
              onClick={action.run}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
      {missing.length > 0 && (
        <div className="local-action-fallback">
          {missing.map(action => (
            <button type="button" className={action.selected ? 'is-selected' : ''} key={action.id} onClick={action.run}>
              {action.label} {action.code || ''}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function GlobalCommands({ label, commands }) {
  if (!label && !commands.length) return null
  return (
    <div className="local-global-command-dock">
      {label && <span>{label}</span>}
      {commands.map(command => (
        <button type="button" key={command.label} disabled={command.disabled} onClick={command.run}>
          {command.label}
        </button>
      ))}
    </div>
  )
}

function WindBotThinking() {
  return (
    <div className="windbot-thinking">
      <span className="windbot-thinking-dot" />
      <span className="windbot-thinking-dot" />
      <span className="windbot-thinking-dot" />
      <span>WindBot pensando</span>
    </div>
  )
}

export default function LocalDuelInteractions({ prompt, localPlayer, windBotThinking, onLobby, onGame }) {
  const message = prompt?.type === 'game' ? prompt.message : null
  const [selectedCards, setSelectedCards] = useState([])
  const [selectedPlaces, setSelectedPlaces] = useState([])

  useEffect(() => {
    setSelectedCards([])
    setSelectedPlaces([])
  }, [message])

  const immediate = useMemo(() => immediateSpatialPrompt(prompt, onGame), [prompt, onGame])

  const selection = useMemo(() => {
    if (message instanceof Y.YGOProMsgSelectCard
        || message instanceof Y.YGOProMsgSelectTribute
        || message instanceof Y.YGOProMsgSelectSum) {
      const cards = message.cards || []
      if (!cards.length || !cards.every(isVisibleCard)) return null
      const minimum = message instanceof Y.YGOProMsgSelectSum ? 1 : message.min
      const maximum = message.max || cards.length
      const valid = selectedCards.length >= minimum && selectedCards.length <= maximum
      return {
        label: `Selecione cartas (${minimum}-${maximum})`,
        actions: cards.map((card, index) => ({
          id: `target-${index}`,
          label: selectedCards.includes(index) ? 'Selecionada' : 'Selecionar',
          selected: selectedCards.includes(index),
          code: Number(card.code) || 0,
          anchorKey: cardAnchorKey(card),
          run: () => setSelectedCards(current => current.includes(index)
            ? current.filter(value => value !== index)
            : current.length < maximum ? [...current, index] : current),
        })),
        commands: [
          {
            label: 'Confirmar',
            disabled: !valid,
            run: () => onGame(message.prepareResponse(selectedCards.map(Y.IndexResponse))),
          },
          message.cancelable && { label: 'Cancelar', run: () => onGame(message.prepareResponse(null)) },
        ].filter(Boolean),
      }
    }

    if (message instanceof Y.YGOProMsgSelectPlace || message instanceof Y.YGOProMsgSelectDisField) {
      const places = message.getSelectablePlaces()
      const valid = selectedPlaces.length === message.count
      return {
        label: `Selecione ${message.count} zona(s)`,
        actions: places.map((place, index) => ({
          id: `place-${index}`,
          label: selectedPlaces.includes(index) ? 'Selecionada' : 'Selecionar zona',
          selected: selectedPlaces.includes(index),
          zoneKey: zoneKeyForPlace(place, localPlayer),
          run: () => setSelectedPlaces(current => current.includes(index)
            ? current.filter(value => value !== index)
            : current.length < message.count ? [...current, index] : current),
        })),
        commands: [{
          label: 'Confirmar zonas',
          disabled: !valid,
          run: () => onGame(message.prepareResponse(selectedPlaces.map(index => places[index]))),
        }],
      }
    }

    return null
  }, [message, localPlayer, onGame, selectedCards, selectedPlaces])

  if (!prompt && windBotThinking) {
    return <WindBotThinking />
  }

  if (!prompt && !windBotThinking) return null

  const spatial = selection || immediate
  if (spatial) {
    return (
      <>
        {windBotThinking && <WindBotThinking />}
        <CardActionLayer actions={spatial.actions} />
        <GlobalCommands label={spatial.label} commands={spatial.commands} />
      </>
    )
  }

  return (
    <div className="ocg-local-actions local-prompt-dock">
      {windBotThinking && <WindBotThinking />}
      <PromptPanel prompt={prompt} onLobby={onLobby} onGame={onGame} />
    </div>
  )
}
