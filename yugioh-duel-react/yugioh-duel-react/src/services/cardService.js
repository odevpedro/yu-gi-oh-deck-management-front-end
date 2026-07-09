const CARD_API = import.meta.env.VITE_CARD_API_BASE ?? 'http://localhost:8080'
const YGO_API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php'

function normalizeFromCardService(card) {
  return {
    id: card.cardId,
    name: card.name,
    type: typeEnumToFull(card.type),
    card_images: [{ image_url: card.imageUrl ?? '' }],
    desc: card.description ?? '',
    atk: card.atk,
    def: card.def,
    level: card.level,
  }
}

function typeEnumToFull(type) {
  const map = {
    MONSTER: 'Normal Monster',
    SPELL: 'Spell Card',
    TRAP: 'Trap Card',
  }
  return map[type] ?? type
}

function typeFullToEnum(type) {
  const up = (type ?? '').toUpperCase()
  if (up.includes('SPELL')) return 'SPELL'
  if (up.includes('TRAP')) return 'TRAP'
  return 'MONSTER'
}

async function fetchFromCardService(path) {
  const res = await fetch(`${CARD_API}${path}`)
  if (!res.ok) throw new Error(`card-service ${res.status}`)
  return res.json()
}

export async function searchCards({ fname, type, page = 0, size = 20 } = {}) {
  const params = new URLSearchParams({ page, size })
  if (fname) params.set('fname', fname)
  if (type) params.set('type', typeFullToEnum(type))
  try {
    const data = await fetchFromCardService(`/cards?${params}`)
    const content = data.content?.map(normalizeFromCardService) ?? []
    if (content.length > 0) return content
  } catch {
  }
  const fallbackParams = new URLSearchParams({ num: String(size), offset: String(page * size) })
  if (fname) fallbackParams.set('fname', fname)
  const res = await fetch(`${YGO_API}?${fallbackParams}`)
  const json = await res.json()
  return json.data ?? []
}

export async function getCardsByIds(ids) {
  if (!ids?.length) return []
  try {
    const data = await fetchFromCardService(`/cards/internal?ids=${ids.join(',')}`)
    const cards = (data ?? []).map(normalizeFromCardService)
    if (cards.length > 0) return cards
  } catch {
  }
  const res = await fetch(`${YGO_API}?id=${ids.join(',')}`)
  const json = await res.json()
  return json.data ?? []
}

export async function getCardById(id) {
  try {
    const card = normalizeFromCardService(await fetchFromCardService(`/cards/internal/${id}`))
    if (card) return card
  } catch {
  }
  const res = await fetch(`${YGO_API}?id=${id}`)
  const json = await res.json()
  return json.data?.[0] ?? null
}

export async function fetchSampleDeck(size = 20) {
  try {
    const data = await fetchFromCardService(`/cards?page=0&size=${size}`)
    const content = data.content?.map(normalizeFromCardService) ?? []
    if (content.length > 0) return content
  } catch {
  }
  const res = await fetch(`${YGO_API}?num=${size}&offset=0`)
  const json = await res.json()
  return json.data ?? []
}
