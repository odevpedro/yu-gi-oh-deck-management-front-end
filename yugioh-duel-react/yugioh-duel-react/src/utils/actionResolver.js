// ═══════════════════════════════════════════════════════════
// actionResolver.js — Resolve ações disponíveis por contexto
// Regras oficiais Yu-Gi-Oh aplicadas
// ═══════════════════════════════════════════════════════════

const ACTION_DEFS = {
  // ── Monstro na mão ────────────────────────────────────
  'normal-summon': {
    id: 'normal-summon', label: 'Summon',
    icon: '▲', color: 'gold', group: 'summon',
  },
  'set-monster': {
    id: 'set-monster', label: 'Set',
    icon: '▼', color: 'blue', group: 'summon',
  },
  // ── Spell na mão ─────────────────────────────────────
  'activate-spell': {
    id: 'activate-spell', label: 'Activate',
    icon: '✦', color: 'green', group: 'activate',
  },
  'set-spell': {
    id: 'set-spell', label: 'Set',
    icon: '▼', color: 'teal', group: 'set',
  },
  // ── Trap na mão ──────────────────────────────────────
  'set-trap': {
    id: 'set-trap', label: 'Set',
    icon: '▼', color: 'purple', group: 'set',
  },
  // ── Monstro no campo ─────────────────────────────────
  'attack': {
    id: 'attack', label: 'Attack',
    icon: '⚔', color: 'red', group: 'battle',
  },
  'change-position': {
    id: 'change-position', label: 'Change Position',
    icon: '↺', color: 'blue', group: 'position',
  },
  'flip-summon': {
    id: 'flip-summon', label: 'Flip Summon',
    icon: '↑', color: 'gold', group: 'summon',
  },
  // ── Spell/Trap no campo ───────────────────────────────
  'activate-set': {
    id: 'activate-set', label: 'Activate',
    icon: '✦', color: 'green', group: 'activate',
  },
  // ── Universal ────────────────────────────────────────
  'view-details': {
    id: 'view-details', label: 'View Details',
    icon: '◈', color: 'neutral', group: 'info',
  },
  'cancel': {
    id: 'cancel', label: 'Cancel',
    icon: '✕', color: 'dim', group: 'cancel',
  },
}

// ── Helpers ───────────────────────────────────────────────
function isMonster(type = '') {
  const u = type.toUpperCase()
  return !u.includes('SPELL') && !u.includes('TRAP')
}
function isSpell(type = '') { return type.toUpperCase().includes('SPELL') }
function isTrap(type  = '') { return type.toUpperCase().includes('TRAP')  }
function isExtraMonster(type = '') {
  return ['FUSION','SYNCHRO','XYZ','LINK','RITUAL'].some(k => type.toUpperCase().includes(k))
}
function isQuickSpell(type = '') { return type.toUpperCase().includes('QUICK') }
function isFieldSpell(type  = '') { return type.toUpperCase().includes('FIELD') }
function freeMonsterZones(oz) { return [0,1,2,3,4].filter(i => !oz[`pm${i}`]).length }
function freeSpellZones(oz)   { return [0,1,2,3,4].filter(i => !oz[`ps${i}`]).length }

function make(id, available, reason = null) {
  return { ...ACTION_DEFS[id], available, reason }
}

// ── RESOLVER PRINCIPAL ────────────────────────────────────
/**
 * @param {object} selected       { card, location, zoneKey?, position? }
 * @param {object} phase          { id, label }
 * @param {object} flags          { normalSummonedThisTurn, positionChangedThisTurn, attackedZones: Set }
 * @param {object} occupiedZones  { [zoneKey]: { card, dataUrl, position, faceDown, summonedThisTurn } }
 */
export function resolveActions(selected, phase, flags, occupiedZones) {
  if (!selected) return []
  const { card, location, zoneKey } = selected
  const phaseId  = phase.id
  const inMain   = phaseId === 'MAIN1' || phaseId === 'MAIN2'
  const inBattle = phaseId === 'BATTLE'
  const cardData = zoneKey ? occupiedZones[zoneKey] : null

  const actions = []

  // ══════════════════════════════════════════════════════
  // MONSTRO NA MÃO
  // ══════════════════════════════════════════════════════
  if (location === 'hand' && isMonster(card.type)) {
    const isExtra = isExtraMonster(card.type)
    const hasZone = freeMonsterZones(occupiedZones) > 0

    if (isExtra) {
      actions.push(make('normal-summon', false, 'Requires Special Summon conditions'))
      actions.push(make('set-monster',   false, 'Extra Deck monsters cannot be Set'))
    } else {
      const noSummonReason =
        !inMain                      ? `Only during Main Phase (current: ${phase.label})` :
        flags.normalSummonedThisTurn ? 'Normal Summon/Set already used this turn' :
        !hasZone                     ? 'No available Monster Zone' : null

      actions.push(make('normal-summon', !noSummonReason, noSummonReason))
      actions.push(make('set-monster',   !noSummonReason, noSummonReason))
    }
  }

  // ══════════════════════════════════════════════════════
  // SPELL NA MÃO
  // ══════════════════════════════════════════════════════
  if (location === 'hand' && isSpell(card.type)) {
    const hasZone   = freeSpellZones(occupiedZones) > 0
    const isQuick   = isQuickSpell(card.type)
    const isField   = isFieldSpell(card.type)
    // Field spells go to field zone (always available if empty); simplify: use spell zones
    const canAct    = (inMain || (isQuick && inBattle)) && hasZone

    actions.push(make(
      'activate-spell', canAct,
      !hasZone              ? 'No available Spell/Trap Zone' :
      !(inMain || (isQuick && inBattle)) ? `Cannot activate during ${phase.label} Phase` : null
    ))
    actions.push(make(
      'set-spell',
      inMain && hasZone,
      !inMain  ? `Can only Set during Main Phase (current: ${phase.label})` :
      !hasZone ? 'No available Spell/Trap Zone' : null
    ))
  }

  // ══════════════════════════════════════════════════════
  // TRAP NA MÃO
  // ══════════════════════════════════════════════════════
  if (location === 'hand' && isTrap(card.type)) {
    const hasZone = freeSpellZones(occupiedZones) > 0
    // Traps can ONLY be Set from hand (cannot activate from hand)
    actions.push(make(
      'set-trap',
      inMain && hasZone,
      !inMain  ? `Can only Set during Main Phase (current: ${phase.label})` :
      !hasZone ? 'No available Spell/Trap Zone' : null
    ))
  }

  // ══════════════════════════════════════════════════════
  // MONSTRO NO CAMPO
  // ══════════════════════════════════════════════════════
  if (location === 'field' && isMonster(card.type)) {
    const isFaceDown     = cardData?.faceDown === true
    const hasAttacked    = flags.attackedZones?.has(zoneKey)
    const setThisTurn    = cardData?.summonedThisTurn === true && isFaceDown

    // Attack — face-down monsters cannot attack
    actions.push(make(
      'attack',
      inBattle && !hasAttacked && !isFaceDown,
      isFaceDown   ? 'Face-down monsters cannot attack' :
      !inBattle    ? `Attack only during Battle Phase (current: ${phase.label})` :
      hasAttacked  ? 'This monster already attacked this turn' : null
    ))

    // Flip Summon — only face-down monsters can be Flip Summoned, during Main Phase
    if (isFaceDown) {
      actions.push(make(
        'flip-summon',
        inMain && !setThisTurn,
        setThisTurn ? 'Cannot Flip Summon a monster Set this turn' :
        !inMain     ? `Flip Summon only during Main Phase (current: ${phase.label})` : null
      ))
    }

    // Change Position — not if face-down was set this turn, not if already changed
    if (!isFaceDown) {
      actions.push(make(
        'change-position',
        inMain && !flags.positionChangedThisTurn,
        !inMain                       ? `Only during Main Phase (current: ${phase.label})` :
        flags.positionChangedThisTurn ? 'Battle position already changed this turn' : null
      ))
    }
  }

  // ══════════════════════════════════════════════════════
  // SPELL / TRAP NO CAMPO
  // ══════════════════════════════════════════════════════
  if (location === 'field' && (isSpell(card.type) || isTrap(card.type))) {
    const isFaceDown   = cardData?.faceDown === true
    const setThisTurn  = cardData?.summonedThisTurn === true
    const isTheTrap    = isTrap(card.type)

    // Trap: must be face-down, cannot activate the turn it was Set
    // Spell: can activate from face-up (was already activated/placed)
    let canAct = false
    let reason = null

    if (isTheTrap) {
      if (!isFaceDown)   { canAct = false; reason = 'Trap is not face-down' }
      else if (setThisTurn) { canAct = false; reason = 'Cannot activate a Trap the turn it was Set' }
      else                  { canAct = true }
    } else {
      // face-up spell on field (already activated / continuous)
      if (isFaceDown) {
        canAct = inMain && !setThisTurn
        reason = setThisTurn ? 'Cannot activate a Spell the turn it was Set' :
                 !inMain     ? `Only activate during Main Phase` : null
      } else {
        // continuous/field already face-up — no action needed in simplified model
        canAct = false; reason = 'Already active'
      }
    }

    actions.push(make('activate-set', canAct, reason))
  }

  actions.push(make('view-details', true, null))
  actions.push(make('cancel',       true, null))

  return actions
}
