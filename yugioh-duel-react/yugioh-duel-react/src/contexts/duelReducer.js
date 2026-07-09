export const PHASES = [
  { id: 'DRAW',    label: 'DRAW',    short: 'DP'  },
  { id: 'STANDBY', label: 'STANDBY', short: 'SBP' },
  { id: 'MAIN1',   label: 'MAIN 1',  short: 'MP1' },
  { id: 'BATTLE',  label: 'BATTLE',  short: 'BP'  },
  { id: 'MAIN2',   label: 'MAIN 2',  short: 'MP2' },
  { id: 'END',     label: 'END',     short: 'EP'  },
]

export const initialState = {
  turn: 1,
  phaseIndex: 0,
  drawnThisTurn: false,
  turnTimer: 60,
  playerLP: 8000,
  opponentLP: 6000,
  deckCards: [],
  deckRemaining: [],
  handCards: [],
  opponentHand: [],
  opponentDeckCards: [],
  opponentDeckRemaining: [],
  occupiedZones: {},
  playerGY: [],
  opponentGY: [],
  playerBanished: [],
  opponentBanished: [],
  flags: {
    normalSummonedThisTurn: false,
    positionChangedThisTurn: false,
    attackedZones: new Set(),
  },
}

function shuffle(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialState }

    case 'NEXT_PHASE': {
      const next = state.phaseIndex + 1
      if (next >= PHASES.length) {
        return {
          ...state,
          turn: state.turn + 1,
          phaseIndex: 0,
          drawnThisTurn: false,
          turnTimer: 60,
          flags: { normalSummonedThisTurn: false, positionChangedThisTurn: false, attackedZones: new Set() },
        }
      }
      return { ...state, phaseIndex: next, turnTimer: 60 }
    }

    case 'SET_PHASE':
      return { ...state, phaseIndex: action.phaseIndex, turnTimer: 60 }

    case 'SET_TURN':
      return { ...state, turn: action.turn, turnTimer: 60 }

    case 'TICK_TIMER':
      return { ...state, turnTimer: Math.max(0, state.turnTimer - 1) }

    case 'MARK_DRAWN':
      return { ...state, drawnThisTurn: true }

    case 'DEAL_DAMAGE': {
      const key = action.target === 'player' ? 'playerLP' : 'opponentLP'
      return { ...state, [key]: Math.max(0, state[key] - action.amount) }
    }

    case 'SET_DECK_CARDS':
      return { ...state, deckCards: action.cards }

    case 'SET_DECK_REMAINING':
      return { ...state, deckRemaining: action.remaining }

    case 'INIT_DECK': {
      const shuffled = shuffle(action.cards.map((_, i) => i))
      return { ...state, deckCards: action.cards, deckRemaining: shuffled }
    }

    case 'DRAW_CARD': {
      if (state.deckRemaining.length === 0) return state
      const rem = [...state.deckRemaining]
      const idx = rem.pop()
      return {
        ...state,
        deckRemaining: rem,
        handCards: state.handCards.length < 10 ? [...state.handCards, state.deckCards[idx]] : state.handCards,
        drawnThisTurn: true,
      }
    }

    case 'SET_HAND':
      return { ...state, handCards: action.cards }

    case 'ADD_TO_HAND':
      return state.handCards.length < 10
        ? { ...state, handCards: [...state.handCards, action.card] }
        : state

    case 'REMOVE_FROM_HAND': {
      const hand = state.handCards.filter((_, i) => i !== action.index)
      return { ...state, handCards: hand }
    }

    case 'SET_OPPONENT_HAND':
      return { ...state, opponentHand: action.cards }

    case 'SET_OPPONENT_DECK':
      return { ...state, opponentDeckCards: action.cards, opponentDeckRemaining: action.remaining }

    case 'INIT_OPPONENT': {
      const indices = shuffle(action.cards.map((_, i) => i))
      const hand = indices.slice(-5).map(i => action.cards[i])
      const remaining = indices.slice(0, -5)
      return { ...state, opponentDeckCards: action.cards, opponentDeckRemaining: remaining, opponentHand: hand }
    }

    case 'OPPONENT_DRAW': {
      if (state.opponentDeckRemaining.length === 0) return state
      const rem = [...state.opponentDeckRemaining]
      const idx = rem.pop()
      return {
        ...state,
        opponentDeckRemaining: rem,
        opponentHand: [...state.opponentHand, state.opponentDeckCards[idx]],
      }
    }

    case 'PLACE_IN_ZONE':
      return { ...state, occupiedZones: { ...state.occupiedZones, [action.zoneKey]: action.slotData } }

    case 'SET_OCCUPIED_ZONES':
      return { ...state, occupiedZones: action.zones }

    case 'REMOVE_FROM_ZONE': {
      const next = { ...state.occupiedZones }
      delete next[action.zoneKey]
      return { ...state, occupiedZones: next }
    }

    case 'SEND_TO_GRAVEYARD': {
      const entry = state.occupiedZones[action.zoneKey]
      if (!entry) return state
      const zones = { ...state.occupiedZones }
      delete zones[action.zoneKey]
      const gyKey = action.owner === 'player' ? 'playerGY' : 'opponentGY'
      return { ...state, occupiedZones: zones, [gyKey]: [...state[gyKey], entry.card] }
    }

    case 'SEND_TO_BANISHED': {
      const key = action.owner === 'player' ? 'playerBanished' : 'opponentBanished'
      return { ...state, [key]: [...state[key], action.card] }
    }

    case 'SET_PLAYER_GY':
      return { ...state, playerGY: action.cards }

    case 'SET_OPPONENT_GY':
      return { ...state, opponentGY: action.cards }

    case 'SET_GAME_STATE':
      return { ...state, ...action.payload }

    case 'NORMAL_SUMMONED':
      return { ...state, flags: { ...state.flags, normalSummonedThisTurn: true } }

    case 'POSITION_CHANGED':
      return { ...state, flags: { ...state.flags, positionChangedThisTurn: true } }

    case 'ZONE_ATTACKED': {
      const zones = new Set(state.flags.attackedZones)
      zones.add(action.zoneKey)
      return { ...state, flags: { ...state.flags, attackedZones: zones } }
    }

    default:
      return state
  }
}
