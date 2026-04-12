// ═══════════════════════════════════════════════════════════
// FXManager.js — Orquestrador central de efeitos visuais
// ═══════════════════════════════════════════════════════════

import { attackArrow }           from './effects/AttackArrow'
import {
  normalSummonFX,
  specialSummonFX,
  spellActivationFX,
  sobelEdgeGlow,
  drawCardAnimation,
  attackFX as legacyAttackFX,
  lpDamageFX as legacyLpFX,
  phaseTransitionFX,
  showPhaseBlock,
} from '../utils/fx'

class FXManager {

  attack(attackerEl, targetEl, onImpact) {
    if (!attackerEl) { onImpact?.(); return }
    attackArrow.fire(attackerEl, targetEl ?? null, onImpact)
  }

  lpDamage(amount, barEl, valEl, newLpPct) {
    legacyLpFX(amount, barEl, valEl, newLpPct)
  }

  normalSummon(zoneEl)             { normalSummonFX(zoneEl) }
  specialSummon(zoneEl, cardType)  { specialSummonFX(zoneEl, cardType) }
  spellActivation(zoneEl, isSpell) { spellActivationFX(zoneEl, isSpell) }
  sobelGlow(zoneEl, dataUrl)       { sobelEdgeGlow(zoneEl, dataUrl) }
  drawCard(card, deckEl, handEl, cb) { drawCardAnimation(card, deckEl, handEl, cb) }
  phase(phaseObj)                  { phaseTransitionFX(phaseObj) }
  phaseBlocked(anchorEl, msg)      { showPhaseBlock(anchorEl, msg) }

  // Stubs — implementados nos próximos sprints
  destroy(zoneEl, dataUrl, onComplete) { onComplete?.() }
  flip(zoneEl, onRevealed)             { onRevealed?.() }
  graveyardFlight(zoneEl, gyEl, dataUrl) {}
  clearHighlights()                    {}
}

export const fx = new FXManager()