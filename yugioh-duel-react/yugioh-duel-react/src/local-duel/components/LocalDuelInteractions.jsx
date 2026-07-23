import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

function CardActionPopup({ open, groups, onClose }) {
  const [placement, setPlacement] = useState(null)

  useLayoutEffect(() => {
    if (!open) return
    const elements = [...document.querySelectorAll('[data-ocg-key], [data-card-code], [data-zone-key]')]
    const element = open.zoneKey
      ? elements.find(candidate => candidate.dataset.zoneKey === open.zoneKey)
      : elements.find(candidate => candidate.dataset.ocgKey === open.groupKey)
        || elements.find(candidate => Number(candidate.dataset.cardCode) === open.code)
    if (!element) { setPlacement(null); return }
    const rect = element.getBoundingClientRect()
    setPlacement({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
  }, [open])

  if (!open || !placement) return null
  return createPortal(
    <div style={{
      position: 'fixed', zIndex: 500, pointerEvents: 'all',
      left: placement.left, top: placement.top,
      width: placement.width, height: placement.height,
    }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: '100%', mb: 4,
        display: 'flex', flexDirection: 'column', gap: 2,
        alignItems: 'stretch',
      }}>
        {open.actions.map(action => (
          <button
            key={action.id}
            type="button"
            className={`local-inline-action ${action.selected ? 'is-selected' : ''}`}
            onClick={() => { action.run(); onClose() }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}

function actionListLabel(groups) {
  if (!groups?.length) return null
  return groups.flatMap(g => g.actions).map(a => a.label).join(', ')
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

function useCloseOnOutsideClick(ref, active) {
  useEffect(() => {
    if (!active) return
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) active()
    }
    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [ref, active])
}

export default function LocalDuelInteractions({ prompt, localPlayer, windBotThinking, onLobby, onGame }) {
  const message = prompt?.type === 'game' ? prompt.message : null
  const [selectedCards, setSelectedCards] = useState([])
  const [selectedPlaces, setSelectedPlaces] = useState([])
  const [activeActionKey, setActiveActionKey] = useState(null)
  const actionsRef = useRef(null)

  useEffect(() => {
    setSelectedCards([])
    setSelectedPlaces([])
    setActiveActionKey(null)
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

  const groups = useMemo(() => {
    const spatial = selection || immediate
    if (!spatial?.actions?.length) return []
    return groupActions(spatial.actions)
  }, [selection, immediate])

  useCloseOnOutsideClick(actionsRef, () => setActiveActionKey(null))

  const activeGroup = useMemo(() => {
    if (!activeActionKey) return null
    const g = groups.find(group => group.key === activeActionKey || group.actions.some(a => a.id === activeActionKey))
    const actions = g?.actions || groups.flatMap(gg => gg.actions).filter(a => a.id === activeActionKey)
    if (!actions.length) return null
    return {
      groupKey: g?.key || activeActionKey,
      zoneKey: g?.zoneKey || null,
      code: g?.code || actions[0]?.code || 0,
      actions,
    }
  }, [activeActionKey, groups])

  if (!prompt && windBotThinking) {
    return <WindBotThinking />
  }

  if (!prompt && !windBotThinking) return null

  const spatial = selection || immediate
  if (spatial && spatial.actions.length > 0) {
    return (
      <>
        {windBotThinking && <WindBotThinking />}
        <CardActionPopup open={activeGroup} groups={groups} onClose={() => setActiveActionKey(null)} />
        <div className="local-global-command-dock" ref={actionsRef}>
          {spatial.label && <span>{spatial.label}</span>}
          <div className="local-action-strip">
            {groups.map(group => {
              const first = group.actions[0]
              return (
                <button
                  type="button"
                  key={group.key}
                  className={activeActionKey === group.key ? 'is-active' : ''}
                  onClick={() => setActiveActionKey(prev => prev === group.key ? null : group.key)}
                >
                  {first.label}{group.actions.length > 1 ? ` (${group.actions.length})` : ''}
                </button>
              )
            })}
          </div>
          <div className="local-command-strip">
            {(spatial.commands || []).map(cmd => (
              <button type="button" key={cmd.label} disabled={cmd.disabled} onClick={cmd.run}>
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (spatial && !spatial.actions.length && spatial.commands?.length) {
    return (
      <>
        {windBotThinking && <WindBotThinking />}
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
