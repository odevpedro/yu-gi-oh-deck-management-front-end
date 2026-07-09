// ═══════════════════════════════════════════════════════════
// context-panel.js — Sidebar contextual do campo de duelo
// ═══════════════════════════════════════════════════════════

// ── Estado global do painel ──────────────────────────────
const PanelState = {
  mode: 'idle',       // 'idle' | 'card' | 'zone' | 'stack'
  data: null,         // payload do item em hover
  lastData: null,     // mantém o último item por IDLE_DELAY ms
  idleTimer: null,
};

const IDLE_DELAY = 6000; // ms antes de voltar ao idle

// ── Descrições fixas das zonas ───────────────────────────
const ZONE_INFO = {
  monster:  { name: 'Main Monster Zone',     desc: 'Zona para invocar monstros. Até 5 monstros simultâneos. Cartas em Defense Position são giradas 90°.' },
  spell:    { name: 'Spell & Trap Zone',     desc: 'Ativa Spells e coloca Traps. 5 zonas disponíveis. Spells resolvem imediatamente; Traps ficam face-down.' },
  field:    { name: 'Field Zone',            desc: 'Uma Field Spell pode ser ativada aqui. Cada jogador tem sua própria zona; uma nova substitui a anterior.' },
  gy:       { name: 'Graveyard',             desc: 'Cemitério. Cartas descartadas, destruídas ou usadas vão aqui. Ambos os jogadores podem verificar o conteúdo.' },
  extra:    { name: 'Extra Deck',            desc: 'Contém Fusion, Synchro, XYZ e Link Monsters. Máximo 15 cartas. Ficam face-down até serem invocadas.' },
  deck:     { name: 'Main Deck',             desc: 'O deck principal. Mínimo 40, máximo 60 cartas. Compre 1 carta por turno na Draw Phase.' },
  emz:      { name: 'Extra Monster Zone',    desc: 'Zona exclusiva para Link e outros Extra Deck Monsters invocados. Compartilhada — cada jogador pode ocupar 1.' },
  banish:   { name: 'Banish Pile',           desc: 'Cartas removidas do jogo. Por padrão ficam face-up e visíveis para ambos os jogadores.' },
};

// ── Helpers ──────────────────────────────────────────────
function zoneTypeFromEl(el) {
  if (el.classList.contains('zone--monster')) return 'monster';
  if (el.classList.contains('zone--spell'))   return 'spell';
  if (el.classList.contains('zone--field'))   return 'field';
  if (el.classList.contains('zone--gy'))      return 'gy';
  if (el.classList.contains('zone--extra'))   return 'extra';
  if (el.classList.contains('zone--deck'))    return 'deck';
  if (el.classList.contains('zone--emz'))     return 'emz';
  if (el.classList.contains('zone--banish'))  return 'banish';
  return null;
}

function isStackZone(type) {
  return ['gy','extra','deck','banish','field'].includes(type);
}

// ── Atualiza painel ──────────────────────────────────────
function updatePanel(mode, data) {
  // modo 'card' só é substituído por outro 'card' — zona/pilha não sobrescreve
  if (PanelState.mode === 'card' && mode !== 'card') return;

  clearTimeout(PanelState.idleTimer);
  PanelState.mode     = mode;
  PanelState.data     = data;
  PanelState.lastData = data;
  renderPanel();
}

// updatePanel irrestrito — usado apenas por clique em pilha
function forceUpdatePanel(mode, data) {
  clearTimeout(PanelState.idleTimer);
  PanelState.mode     = mode;
  PanelState.data     = data;
  PanelState.lastData = data;
  renderPanel();
}

function scheduleIdle() {
  clearTimeout(PanelState.idleTimer);
  PanelState.idleTimer = setTimeout(() => {
    PanelState.mode = 'idle';
    PanelState.data = null;
    renderPanel();
  }, IDLE_DELAY);
}

// ── Render ───────────────────────────────────────────────
function renderPanel() {
  const panel = document.getElementById('contextPanel');
  if (!panel) return;

  const { mode, data, lastData } = PanelState;
  const payload = data ?? lastData;

  panel.className = `context-panel context-panel--${mode}`;

  switch (mode) {
    case 'card':  panel.innerHTML = renderCard(payload);  break;
    case 'zone':  panel.innerHTML = renderZone(payload);  break;
    case 'stack': panel.innerHTML = renderStack(payload); break;
    default:      panel.innerHTML = renderIdle(payload);  break;
  }
}

// ── Templates ────────────────────────────────────────────
function renderIdle(last) {
  return `
    <div class="cp-idle">
      <div class="cp-logo">
        <span class="cp-logo-icon">◈</span>
        <span class="cp-logo-text">CONTEXT</span>
      </div>
      <div class="cp-idle-hint">
        Passe o mouse sobre uma<br>carta ou zona do campo
      </div>
      ${last ? `
      <div class="cp-last">
        <div class="cp-last-label">ÚLTIMO VISUALIZADO</div>
        <div class="cp-last-name">${last.name ?? last.zoneName ?? '—'}</div>
      </div>` : ''}
    </div>`;
}

function renderCard(card) {
  const stars = card.level
    ? `<div class="cp-stars">${'★'.repeat(Math.min(card.level, 12))}</div>`
    : card.rank
    ? `<div class="cp-stars rank">${'✦'.repeat(Math.min(card.rank, 13))}</div>`
    : card.linkval
    ? `<div class="cp-tag cp-tag--link">LINK ${card.linkval}</div>`
    : '';

  const atkdef = (card.atk !== undefined)
    ? `<div class="cp-stats">
        <div class="cp-stat"><span class="cp-stat-label">ATK</span><span class="cp-stat-val atk">${card.atk ?? '?'}</span></div>
        ${card.def !== undefined ? `<div class="cp-stat"><span class="cp-stat-label">DEF</span><span class="cp-stat-val def">${card.def ?? '?'}</span></div>` : ''}
       </div>`
    : '';

  const attribute = card.attribute
    ? `<div class="cp-tag cp-tag--attr cp-attr--${card.attribute.toLowerCase()}">${card.attribute}</div>`
    : '';

  const position = card.position
    ? `<div class="cp-tag cp-tag--pos">${card.position}</div>`
    : '';

  return `
    <div class="cp-card">
      <div class="cp-section cp-section--header">
        <div class="cp-label">CARTA</div>
        <div class="cp-card-name">${card.name}</div>
        <div class="cp-card-type">${card.type ?? ''}</div>
        <div class="cp-tags">
          ${attribute}${position}
          ${card.faceDown ? '<div class="cp-tag cp-tag--facedown">FACE-DOWN</div>' : ''}
        </div>
        ${stars}
      </div>

      ${card.imageUrl ? `
      <div class="cp-section cp-section--art">
        <img class="cp-art" src="${card.imageUrl}" alt="${card.name}" loading="lazy">
      </div>` : ''}

      ${atkdef}

      ${card.desc ? `
      <div class="cp-section cp-section--effect">
        <div class="cp-label">EFEITO</div>
        <div class="cp-effect-text">${card.desc}</div>
      </div>` : ''}

      <div class="cp-section cp-section--meta">
        ${card.controller ? `<div class="cp-meta-row"><span>Controlador</span><span>${card.controller}</span></div>` : ''}
        ${card.zone       ? `<div class="cp-meta-row"><span>Zona</span><span>${card.zone}</span></div>` : ''}
      </div>
    </div>`;
}

function renderZone(zone) {
  const info = ZONE_INFO[zone.type] ?? { name: zone.type, desc: '' };
  return `
    <div class="cp-zone">
      <div class="cp-section cp-section--header">
        <div class="cp-label">ZONA</div>
        <div class="cp-zone-name">${info.name}</div>
        <div class="cp-tag ${zone.occupied ? 'cp-tag--occupied' : 'cp-tag--empty'}">
          ${zone.occupied ? 'OCUPADA' : 'VAZIA'}
        </div>
      </div>
      <div class="cp-section">
        <div class="cp-label">FUNÇÃO</div>
        <div class="cp-zone-desc">${info.desc}</div>
      </div>
    </div>`;
}

function renderStack(stack) {
  const info = ZONE_INFO[stack.type] ?? { name: stack.type, desc: '' };
  return `
    <div class="cp-stack">
      <div class="cp-section cp-section--header">
        <div class="cp-label">PILHA</div>
        <div class="cp-zone-name">${info.name}</div>
        <div class="cp-count">
          <span class="cp-count-num">${stack.count}</span>
          <span class="cp-count-label">cartas</span>
        </div>
      </div>
      <div class="cp-section">
        <div class="cp-label">REGRA</div>
        <div class="cp-zone-desc">${info.desc}</div>
      </div>
      ${stack.topCard ? `
      <div class="cp-section">
        <div class="cp-label">TOPO</div>
        <div class="cp-last-name">${stack.topCard}</div>
      </div>` : ''}
    </div>`;
}

// ── Integração com zonas do campo ────────────────────────
export function initContextPanel() {
  renderPanel(); // estado inicial idle

  document.querySelectorAll('.zone').forEach(el => {
    const type = zoneTypeFromEl(el);
    if (!type) return;

    const trigger = isStackZone(type) ? 'click' : 'mouseenter';

    el.addEventListener(trigger, () => {
      if (isStackZone(type)) {
        // clique em pilha usa force — usuário pediu explicitamente
        const count = el.dataset.count ? parseInt(el.dataset.count) : 0;
        forceUpdatePanel('stack', {
          type,
          zoneName: ZONE_INFO[type]?.name ?? type,
          count,
          topCard: el.dataset.topCard ?? null,
        });
      } else {
        const occupied = el.classList.contains('occupied');
        if (!occupied) return;
        updatePanel('zone', { type, zoneName: ZONE_INFO[type]?.name, occupied });
      }
    });

    el.addEventListener('mouseleave', () => {
      // nada — info persiste até próximo hover ativo
    });
  });
}

// ── Chamado externamente quando uma carta é colocada em campo ──
export function registerCardInZone(zoneEl, cardData) {
  zoneEl.addEventListener('mouseenter', () => {
    updatePanel('card', {
      ...cardData,
      zone: ZONE_INFO[zoneTypeFromEl(zoneEl)]?.name ?? '',
    });
  });
  // mouseleave de carta não dispara idle — info persiste no painel
}

// ── Chamado na mão para mostrar carta no hover ────────────
export function registerHandCard(wrapEl, cardData) {
  wrapEl.addEventListener('mouseenter', () => updatePanel('card', cardData));
  // mouseleave de carta não dispara idle — info persiste no painel
}