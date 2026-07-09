import { getAccessToken } from './tokenManager'

const DECK_URL = import.meta.env.VITE_DECK_URL ?? 'http://localhost:8081'

function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listDecks() {
  const response = await fetch(`${DECK_URL}/decks`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (!response.ok) {
    if (response.status === 404) return []
    throw new Error(`deck-service HTTP ${response.status}`)
  }
  return response.json()
}

export async function getDeck(deckId) {
  const response = await fetch(`${DECK_URL}/decks/${deckId}/full`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  })
  if (!response.ok) throw new Error(`deck-service HTTP ${response.status}`)
  return response.json()
}
