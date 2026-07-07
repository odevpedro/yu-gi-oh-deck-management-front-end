import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

const DUEL_WS_URL = import.meta.env.VITE_DUEL_WS_URL ?? 'http://localhost:8084/ws'

function parseMessageBody(message) {
  try {
    return JSON.parse(message.body)
  } catch {
    return message.body
  }
}

export function createDuelClient({ duelId, token, onStateUpdate, onGameOver, onError }) {
  const client = new Client({
    webSocketFactory: () => new SockJS(DUEL_WS_URL),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 3000,
    onConnect: () => {
      client.subscribe(`/topic/duel/${duelId}`, (message) => {
        onStateUpdate?.(parseMessageBody(message))
      })
      client.subscribe(`/topic/duel/${duelId}/over`, (message) => {
        onGameOver?.(parseMessageBody(message))
      })
    },
    onStompError: (frame) => {
      onError?.(frame.headers?.message ?? 'STOMP error')
    },
    onWebSocketError: () => {
      onError?.('WebSocket connection failed')
    },
  })

  client.activate()
  return client
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
