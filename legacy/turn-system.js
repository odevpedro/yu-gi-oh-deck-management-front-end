// ═══════════════════════════════════════════════════════════
// turn-system.js — Fases do turno e controle de ações
// ═══════════════════════════════════════════════════════════

export const PHASES = [
  { id: 'DRAW',    label: 'DRAW',    short: 'DP' },
  { id: 'STANDBY', label: 'STANDBY', short: 'SBP' },
  { id: 'MAIN1',   label: 'MAIN 1',  short: 'MP1' },
  { id: 'BATTLE',  label: 'BATTLE',  short: 'BP' },
  { id: 'MAIN2',   label: 'MAIN 2',  short: 'MP2' },
  { id: 'END',     label: 'END',     short: 'EP' },
];

export const TurnState = {
  turn:        1,
  phaseIndex:  0,          // começa na DRAW
  drawnThisTurn: false,    // só pode comprar 1x por turno
  get phase() { return PHASES[this.phaseIndex]; },
};

// ── Gates de ação ────────────────────────────────────────
export function canDraw() {
  return TurnState.phase.id === 'DRAW' && !TurnState.drawnThisTurn;
}

export function canSummon() {
  return TurnState.phase.id === 'MAIN1' || TurnState.phase.id === 'MAIN2';
}

export function canAttack() {
  return TurnState.phase.id === 'BATTLE';
}

export function canActivateSpell() {
  return ['MAIN1','MAIN2','BATTLE'].includes(TurnState.phase.id);
}

// ── Avançar fase ─────────────────────────────────────────
export function nextPhase() {
  TurnState.phaseIndex++;
  if (TurnState.phaseIndex >= PHASES.length) {
    // novo turno
    TurnState.phaseIndex  = 0;
    TurnState.turn++;
    TurnState.drawnThisTurn = false;
  }
  renderPhaseHUD();
  phaseTransitionFX(TurnState.phase);
  broadcastPhaseChange(TurnState.phase);
}

// ── Callbacks registrados externamente ───────────────────
const phaseListeners = [];
export function onPhaseChange(fn) { phaseListeners.push(fn); }
function broadcastPhaseChange(phase) {
  phaseListeners.forEach(fn => fn(phase));
}

// ── HUD dinâmico ─────────────────────────────────────────
export function renderPhaseHUD() {
  const block = document.getElementById('turnBlock');
  if (!block) return;

  const { turn, phase, phaseIndex } = TurnState;

  block.innerHTML = `
    <div class="turn-num">TURNO ${turn}</div>
    <div class="phase-track">
      ${PHASES.map((p, i) => `
        <div class="phase-pip ${i === phaseIndex ? 'active' : ''} ${i < phaseIndex ? 'done' : ''}"
             title="${p.label}">
          <span class="phase-pip-label">${p.short}</span>
        </div>
      `).join('')}
    </div>
    <div class="turn-phase">${phase.label} PHASE</div>
    <button class="phase-next-btn" id="phaseNextBtn">
      ${phaseIndex === PHASES.length - 1 ? 'FIM DE TURNO' : 'PRÓXIMA FASE ›'}
    </button>
  `;

  document.getElementById('phaseNextBtn')
    ?.addEventListener('click', () => nextPhase());

  // atualiza instruction bar
  updateInstruction();
}

function updateInstruction() {
  const el = document.getElementById('instruction');
  if (!el) return;
  const msgs = {
    DRAW:    canDraw() ? 'CLIQUE NO DECK PARA COMPRAR UMA CARTA' : 'DRAW PHASE — CARTA JÁ COMPRADA',
    STANDBY: 'STANDBY PHASE — AGUARDE EFEITOS CONTÍNUOS',
    MAIN1:   'MAIN PHASE 1 — INVOQUE MONSTROS E ATIVE SPELLS',
    BATTLE:  'BATTLE PHASE — CLIQUE EM UMA CARTA NO CAMPO PARA ATACAR',
    MAIN2:   'MAIN PHASE 2 — INVOQUE MONSTROS E ATIVE SPELLS',
    END:     'END PHASE — AVANCE PARA FINALIZAR O TURNO',
  };
  el.textContent = msgs[TurnState.phase.id] ?? '';
}

// ── Overlay de transição de fase ─────────────────────────
function phaseTransitionFX(phase) {
  const overlay = document.createElement('div');
  overlay.className = 'phase-overlay';
  overlay.innerHTML = `
    <div class="phase-overlay-name">${phase.label}</div>
    <div class="phase-overlay-sub">PHASE</div>
  `;
  document.body.appendChild(overlay);
  overlay.animate([
    { opacity: 0, transform: 'translateY(-12px) scale(.96)' },
    { opacity: 1, transform: 'translateY(0)     scale(1)',   offset: .2 },
    { opacity: 1, transform: 'translateY(0)     scale(1)',   offset: .7 },
    { opacity: 0, transform: 'translateY(8px)  scale(.98)' },
  ], { duration: 900, easing: 'ease-in-out', fill: 'forwards' })
    .finished.then(() => overlay.remove());
}

// ── Init ─────────────────────────────────────────────────
export function initTurnSystem() {
  renderPhaseHUD();
}