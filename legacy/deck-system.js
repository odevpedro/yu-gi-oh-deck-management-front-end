// ═══════════════════════════════════════════════════════════
// deck-system.js — Deck do jogador, draw e visualizador
// ═══════════════════════════════════════════════════════════

import { canDraw, TurnState, onPhaseChange } from './turn-system.js';

// ── Estado do deck ───────────────────────────────────────
export const DeckState = {
  cards:    [],   // todas as cartas do deck (objetos)
  remaining: [],  // índices ainda no deck (embaralhados)
  name:     'Main Deck',
};

// ── Callbacks de draw registrados externamente ───────────
const drawListeners = [];
export function onDraw(fn) { drawListeners.push(fn); }

// ── Init deck com cartas da API ──────────────────────────
export async function initDeck() {
  try {
    const res  = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0');
    const data = await res.json();
    DeckState.cards     = data.data;
    DeckState.remaining = data.data.map((_, i) => i);
    shuffle(DeckState.remaining);
  } catch {
    // fallback mock
    DeckState.cards     = Array.from({ length: 20 }, (_, i) => ({
      id: i, name: `Carta ${i+1}`,
      type: ['Normal Monster','Spell Card','Trap Card'][i % 3],
      card_images: [{ image_url: '' }],
    }));
    DeckState.remaining = DeckState.cards.map((_, i) => i);
  }
  renderDeckZone();
  renderDeckCount();

  // quando a fase muda, atualiza visual do deck
  onPhaseChange(() => {
    renderDeckZone();
    renderDeckCount();
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Render visual da zona do deck ────────────────────────
function renderDeckZone() {
  const zone = document.getElementById('playerDeckZone');
  if (!zone) return;

  const count    = DeckState.remaining.length;
  const drawable = canDraw();

  zone.innerHTML = `
    <div class="deck-pile ${drawable ? 'deck-pile--drawable' : ''}">
      <div class="deck-pile-cards">
        <div class="deck-pile-card dp-c3"></div>
        <div class="deck-pile-card dp-c2"></div>
        <div class="deck-pile-card dp-c1"></div>
      </div>
      <div class="deck-count">${count}</div>
      ${drawable ? '<div class="deck-draw-hint">CLIQUE<br>COMPRAR</div>' : ''}
    </div>
  `;

  zone.onclick = handleDeckClick;
}

function renderDeckCount() {
  const zone = document.getElementById('playerDeckZone');
  const el   = zone?.querySelector('.deck-count');
  if (el) el.textContent = DeckState.remaining.length;
}

// ── Click no deck ────────────────────────────────────────
function handleDeckClick(e) {
  e.stopPropagation();
  if (canDraw()) {
    drawCard();
  } else {
    openDeckViewer();
  }
}

// ── Draw card ────────────────────────────────────────────
export function drawCard() {
  if (!canDraw()) return;
  if (DeckState.remaining.length === 0) {
    showDeckEmpty(); return;
  }

  const idx  = DeckState.remaining.pop();
  const card = DeckState.cards[idx];
  TurnState.drawnThisTurn = true;

  drawCardAnimation(card, () => {
    drawListeners.forEach(fn => fn(card));
    renderDeckZone();
    renderDeckCount();
  });
}

// ── Animação: carta sai do deck e vai para a mão ─────────
function drawCardAnimation(card, onComplete) {
  const zone = document.getElementById('playerDeckZone');
  const hand = document.getElementById('hand');
  if (!zone || !hand) { onComplete(); return; }

  const zR = zone.getBoundingClientRect();
  const hR = hand.getBoundingClientRect();

  const ghost = document.createElement('div');
  ghost.className = 'draw-ghost';
  const rawImg = card.card_images?.[0]?.image_url ?? '';
  const img    = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : '';
  ghost.innerHTML = img
    ? `<img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:5px;">`
    : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#1a0a3a,#0a0a1a);border-radius:5px;"></div>`;

  ghost.style.cssText = `
    position:fixed;
    left:${zR.left + zR.width/2 - 37}px;
    top:${zR.top}px;
    width:74px; height:108px;
    pointer-events:none;
    z-index:8000;
    border-radius:5px;
    border:1px solid rgba(0,200,255,.6);
    box-shadow:0 0 20px rgba(0,200,255,.5);
    transform-origin:center bottom;
  `;
  document.body.appendChild(ghost);

  // destino: centro-direita da mão
  const destX = hR.left + hR.width * 0.7 - 37;
  const destY = hR.top  + 20;

  ghost.animate([
    { transform: 'scale(1)   rotate(0deg)',   opacity: 1 },
    { transform: 'scale(1.15) rotate(-8deg)', opacity: 1, offset: .4 },
    { transform: `translateX(${destX - (zR.left + zR.width/2 - 37)}px)
                  translateY(${destY - zR.top}px)
                  scale(.85) rotate(0deg)`,   opacity: .8 },
  ], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
    .finished.then(() => {
      ghost.remove();

      // flash na mão
      const handEl = document.getElementById('hand');
      handEl?.animate([
        { filter: 'brightness(1)' },
        { filter: 'brightness(1.6)' },
        { filter: 'brightness(1)' },
      ], { duration: 300 });

      onComplete();
    });
}

function showDeckEmpty() {
  const zone = document.getElementById('playerDeckZone');
  if (!zone) return;
  zone.animate([
    { borderColor: 'rgba(255,50,50,.8)' },
    { borderColor: 'rgba(255,50,50,0)' },
  ], { duration: 600 });
}

// ── Deck Viewer ──────────────────────────────────────────
export function openDeckViewer() {
  if (document.getElementById('deckViewer')) return;

  const viewer = document.createElement('div');
  viewer.id = 'deckViewer';
  viewer.className = 'deck-viewer';
  viewer.innerHTML = `
    <div class="dv-panel">
      <div class="dv-header">
        <div class="dv-title">
          <span class="dv-icon">◈</span>
          <span>${DeckState.name}</span>
        </div>
        <div class="dv-meta">${DeckState.remaining.length} cartas restantes</div>
        <button class="dv-close" id="dvClose">✕</button>
      </div>
      <div class="dv-rule-notice">
        <span>⚠</span> Visualização permitida apenas fora do duelo ativo. Durante o duelo, o deck deve permanecer oculto.
      </div>
      <div class="dv-grid" id="dvGrid"></div>
    </div>
  `;
  document.body.appendChild(viewer);

  // popula grid
  const grid = document.getElementById('dvGrid');
  DeckState.cards.forEach((c, i) => {
    const inDeck = DeckState.remaining.includes(i);
    const rawImg = c.card_images?.[0]?.image_url ?? '';
    const img    = rawImg ? `https://corsproxy.io/?url=${encodeURIComponent(rawImg)}` : '';
    const card   = document.createElement('div');
    card.className = `dv-card ${inDeck ? '' : 'dv-card--used'}`;
    card.innerHTML = img
      ? `<img src="${img}" alt="${c.name}" loading="lazy">`
      : `<div class="dv-card-placeholder">${c.name}</div>`;
    card.title = c.name;
    grid.appendChild(card);
  });

  // fechar
  document.getElementById('dvClose').onclick = closeDeckViewer;
  viewer.addEventListener('click', e => {
    if (e.target === viewer) closeDeckViewer();
  });

  viewer.animate([
    { opacity: 0 },
    { opacity: 1 },
  ], { duration: 200, fill: 'forwards' });
}

export function closeDeckViewer() {
  const v = document.getElementById('deckViewer');
  if (!v) return;
  v.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' })
    .finished.then(() => v.remove());
}