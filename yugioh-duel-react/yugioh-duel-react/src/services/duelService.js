import { getAccessToken } from './tokenManager'

const DUEL_URL = import.meta.env.VITE_DUEL_URL ?? 'http://localhost:8084'

async function requestJson(path, options = {}) {
  const token = getAccessToken()
  const response = await fetch(`${DUEL_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }

  return response.json()
}

export function createDuel({ playerAId, playerBId, playerADeckId, playerBDeckId }) {
  return requestJson('/api/duels', {
    method: 'POST',
    body: JSON.stringify({
      playerAId,
      playerBId,
      playerADeckId: playerADeckId || null,
      playerBDeckId: playerBDeckId || null,
    }),
  })
}

export function getDuelState(duelId) {
  return requestJson(`/api/duels/${duelId}/state`)
}

export function getDuelHistory() {
  return requestJson('/api/duels/history')
}

export function getPlayerHistory(playerId) {
  return requestJson(`/api/duels/history/player/${playerId}`)
}
