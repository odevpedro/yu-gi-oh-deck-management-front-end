import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const DUEL_WS_URL = import.meta.env.VITE_DUEL_WS_URL ?? 'http://localhost:8084/ws'
const MAX_RECONNECT_ATTEMPTS = 10
const BASE_DELAY = 2000

function parseMessageBody(message) {
  try {
    return JSON.parse(message.body)
  } catch {
    return message.body
  }
}

export function createDuelClient({ duelId, token, onStateUpdate, onGameOver, onError, onReconnect, onChatMessage }) {
  let attempt = 0

  const client = new Client({
    webSocketFactory: () => new SockJS(DUEL_WS_URL),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    reconnectDelay: BASE_DELAY,
    onConnect: () => {
      attempt = 0
      onReconnect?.()
      client.subscribe(`/topic/duel/${duelId}`, (message) => {
        onStateUpdate?.(parseMessageBody(message))
      })
      client.subscribe(`/topic/duel/${duelId}/over`, (message) => {
        onGameOver?.(parseMessageBody(message))
      })
      client.subscribe(`/topic/duel/${duelId}/chat`, (message) => {
        onChatMessage?.(parseMessageBody(message))
      })
    },
    onStompError: (frame) => {
      onError?.(frame.headers?.message ?? 'STOMP error')
    },
    onWebSocketClose: () => {
      attempt++
      if (attempt > MAX_RECONNECT_ATTEMPTS) {
        onError?.('Conexao perdida. Recarregue a pagina.')
        client.deactivate()
      }
    },
    onWebSocketError: () => {
      onError?.('WebSocket connection failed')
    },
  })

  client.activate()
  return client
}

export function sendChatMessage(client, duelId, message, playerId) {
  client.publish({
    destination: '/app/duel.chat',
    body: JSON.stringify({ duelId, message, playerId }),
  })
}

export function sendAction(client, action) {
  client.publish({
    destination: '/app/duel.action',
    body: JSON.stringify(action),
  })
}

export function advancePhase(client, duelId) {
  client.publish({
    destination: '/app/duel.phase',
    body: JSON.stringify({ duelId }),
  })
}
