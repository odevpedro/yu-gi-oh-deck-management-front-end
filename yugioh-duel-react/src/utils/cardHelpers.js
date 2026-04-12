// ── Card type helpers ────────────────────────────────────
export function cardType(t = '') {
  const u = t.toUpperCase()
  if (u.includes('SPELL')) return 'SPELL'
  if (u.includes('TRAP'))  return 'TRAP'
  return 'MONSTER'
}

export function isExtraType(t = '') {
  const u = t.toUpperCase()
  return ['FUSION','SYNCHRO','XYZ','LINK','RITUAL'].some(k => u.includes(k))
}

// ── Valid zone selector for a given card type ─────────────
export function validZoneSelector(type = '') {
  const t = type.toUpperCase()
  if (t.includes('SPELL') || t.includes('TRAP'))
    return '.player-spell-zone'
  return '.player-monster-zone'
}

// ── Tooltip condition text ───────────────────────────────
export function cardCondition(card) {
  const t = (card?.type || '').toUpperCase()
  if (t.includes('SPELL'))   return 'Ativar: coloque na Spell Zone'
  if (t.includes('TRAP'))    return 'Set face-down, ative no turno seguinte'
  if (t.includes('FUSION'))  return 'Invocação de Fusão necessária'
  if (t.includes('SYNCHRO')) return 'Sincronize: Tuner + não-Tuner'
  if (t.includes('XYZ'))     return 'Sobreponha monstros do mesmo nível'
  if (t.includes('LINK'))    return 'Invocação de Link necessária'
  if (t.includes('RITUAL'))  return 'Ritual Spell + tributo necessário'
  if (card?.atk !== undefined) {
    const lvl = card.level ? `Nível ${card.level} · ` : ''
    return `${lvl}Normal/Tribute Summon · ATK ${card.atk ?? '?'}`
  }
  return ''
}

// ── Domínios com CORS nativo (não precisam de proxy) ─────
const CORS_OK = [
  'ygoprodeck.com',
  'images.ygoprodeck.com',
  'cdn.ygoprodeck.com',
]
function needsProxy(url) {
  try {
    const host = new URL(url).hostname
    return !CORS_OK.some(d => host === d || host.endsWith('.' + d))
  } catch { return true }
}

// ── CORS-proxy URL ───────────────────────────────────────
export function proxiedUrl(rawUrl) {
  if (!rawUrl) return ''
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl
  if (!needsProxy(rawUrl)) return rawUrl
  return `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`
}

// ── Image → data URL (for canvas / FX) ───────────────────
// Nota: <img src> funciona sem proxy, mas fetch() para canvas exige
// header CORS que o ygoprodeck não serve — proxy sempre necessário aqui.
export async function imageToDataURL(url) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  const fetchUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  const res  = await fetch(fetchUrl)
  if (!res.ok) throw new Error(`Failed to load image (${res.status})`)
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}