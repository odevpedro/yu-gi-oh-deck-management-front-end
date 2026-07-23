# Plano de Implementação Visual — Especificação Técnica

## Stack Real do Projeto

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 (JSX) |
| Build | Vite 5 |
| Animações | framer-motion ^12.42.2 |
| Roteamento | react-router-dom ^7.18.1 |
| Áudio | howler ^2.2.4 |
| Efeitos Canvas | Canvas 2D API nativo |
| Efeitos SVG | SVG + Web Animations API |
| Estilos | CSS puro + CSS custom properties |
| Testes unitários | Vitest + @testing-library/react |
| Testes E2E | Playwright |
| Engine de regras | YGOPro via ygopro-msg-encode + ygopro-deck-encode |
| WebSocket | @stomp/stompjs + sockjs-client |
| Banco de cartas | sql.js (SQLite via HTTP) |
| Fontes | Orbitron (títulos), Exo 2 (corpo) |

## Arquitetura Atual do Front-End

```
src/
├── engine/           # DuelEngineAdapter, LocalEngine, WebSocketEngine
├── contexts/         # DuelContext (useReducer), AuthContext, ToastContext
├── components/       # Zone, CardWrap, PlayerHand, HUD, DuelField, ActionBar, etc.
├── pages/            # DuelPage, LocalDuelPage, LobbyPage, etc.
├── fx/               # FXManager, effects/AttackArrow
├── utils/            # fx.js (Canvas FX), animations.js (framer variants), sound.js (Howler)
├── services/         # API, WebSocket, cache, card service
├── styles/           # CSS files (duel-field.css, auth.css, etc.)
└── local-duel/       # Local duel mode (localStateMapper, duel client, components)
```

### Fluxo de Dados Atual

```
LocalEngine / WebSocketEngine
    ↓ (chamadas diretas de DuelContext)
DuelContext (useReducer + 30 action types)
    ↓ (React state)
Componentes (Zone, PlayerHand, HUD, etc.)
    ↓ (efeitos laterais)
FXManager / utils/fx.js / AttackArrow
```

**Problema arquitetural atual:** Efeitos visuais são disparados dentro de `Zone.jsx` via `useEffect` (linha 66-93), dentro de `handleAttackTarget` do `LocalEngine` (que chama `attackArrow.fire`), e dentro de `DuelContext` (que chama `screenShake` e `victoryParticles` diretamente). Não há uma fila de eventos visuais centralizada. Animações competem com lógica de regra.

---

## FASE 0 — LIMPEZA E FUNDAÇÃO (3 tarefas)

### VIS-000-A — Extrair tokens de design para CSS custom properties

**Arquivos:** `src/styles/tokens.css` (novo), `src/styles/duel-field.css` (remover `:root` daqui)

**Tecnologia:** CSS custom properties

**Passos:**
1. Criar `src/styles/tokens.css` com todo o bloco `:root` atual de `duel-field.css` separado por categoria:

```css
/* tokens.css */
:root {
  /* ══════ ColorTokens ══════ */
  --c-bg: #06080f; --c-surface: #0b0f1c; --c-panel: #0d1220;
  --c-blue: #2e8fd4; --c-blue-lt: #5ab4f0; --c-blue-dk: #1a5a8a;
  --c-gold: #e8a820; --c-gold-lt: #f5c84a;
  --c-red: #cc2233; --c-red-lt: #ee4455;
  --c-green: #2ab86a; --c-white: #e8eef8;
  --b-panel: #1e3050; --b-bright: #2e6090; --b-dim: rgba(46,80,120,.35);
  --z-monster: #7a4e1a; --z-spell: #1a5a6a; --z-field: #1a5a2a;
  --z-gy: #5a1a28; --z-deck: #5a4010; --z-extra: #4a1a7a; --z-banished: #2a1a3a;

  /* ══════ SpacingTokens ══════ */
  --space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px;

  /* ══════ CardTokens ══════ */
  --card-w: 85px; --card-h: 124px; --card-radius: 5px; --zone-gap: 8px;

  /* ══════ ZIndexTokens ══════ */
  --z-field: 0; --z-hud: 10; --z-field-center: 5;
  --z-card: 100; --z-hand: 100; --z-hand-hover: 200;
  --z-action-bar: 500; --z-arrow: 900; --z-overlay: 9000; --z-modal: 9500; --z-toast: 9900;

  /* ══════ MotionTokens ══════ */
  --ease-default: cubic-bezier(.23,1,.32,1);
  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --dur-fast: 150ms; --dur-normal: 250ms; --dur-slow: 400ms;
}

.light-theme { /* manter bloco light atual */ }
```

2. Importar `tokens.css` em `main.jsx` **antes** de `duel-field.css`.
3. Remover o bloco `:root` de `duel-field.css` (linhas 9-45).
4. Substituir números mágicos nos componentes por variáveis CSS:
   - `CardWrap.jsx` linha 43: `var(--hand-hover-lift, -72px)` manter fallback
   - Substituir `z-index: 200` em `CardWrap.jsx` linha 48 por `z-index: var(--z-hand-hover, 200)`
   - Substituir `z-index: 9000` em `duel-field.css` linha 463 por `z-index: var(--z-overlay)`
5. Buscar valores mágicos de cor/espacamento nos JSX (ex: `rgba(0,0,0,.85)` em Zone.jsx linha 245) e criar tokens quando aparecerem 2+ vezes.

**Critério:** Build passa. Nenhum valor visual muda (comparar screenshots). Zero valores mágicos duplicados nos componentes JSX.

---

### VIS-000-B — Criar VisualEventQueue (centralizar eventos visuais)

**Arquivos:** `src/fx/VisualEventQueue.js` (novo), `src/fx/FXManager.js` (refatorar)

**Tecnologia:** Classes JS nativas + Promises

**Contrato:**

```js
// VisualEventQueue.js
export class VisualEventQueue {
  constructor()
  enqueue(event: VisualEvent): Promise<void>  // retorna promise que resolve quando o evento terminar
  dequeue(): VisualEvent | null
  cancelAll(): void
  get pending(): number
  get isProcessing(): boolean
}

// Tipos de evento
export const VISUAL_EVENT_TYPES = {
  DUEL_START: 'DUEL_START',
  PHASE_CHANGE: 'PHASE_CHANGE',
  CARD_DRAW: 'CARD_DRAW',
  CARD_PLAY: 'CARD_PLAY',       // summon, set, activate
  ATTACK_DECLARE: 'ATTACK_DECLARE',
  ATTACK_IMPACT: 'ATTACK_IMPACT',
  DAMAGE: 'DAMAGE',
  DESTROY: 'DESTROY',
  BANISH: 'BANISH',
  RETURN_TO_HAND: 'RETURN_TO_HAND',
  SHUFFLE: 'SHUFFLE',
  CHAIN_START: 'CHAIN_START',
  CHAIN_RESOLVE: 'CHAIN_RESOLVE',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
}

// Estrutura do evento
export class VisualEvent {
  id: string
  type: string
  timestamp: number
  priority: number  // 0=cosmético, 1=normal, 2=crítico (bloqueante)
  blocking: boolean
  data: Record<string, any>  // { card, zoneKey, from, to, amount, etc }
  _resolve: Function | null
  _reject: Function | null
}
```

**Passos:**
1. Implementar `VisualEventQueue` com fila interna ordenada por prioridade, garantindo que eventos bloqueantes (priority >= 2) executem em ordem FIFO e eventos não-bloqueantes possam ser ignorados se a fila estiver cheia (>50 eventos).
2. Refatorar `FXManager.js` para usar a fila:

```js
class FXManager {
  constructor() { this.queue = new VisualEventQueue() }

  async fire(eventType, data) {
    const event = new VisualEvent(eventType, data)
    return this.queue.enqueue(event)
  }

  async processNext() { /* dequeue, dispatch to correct handler */ }

  cancelAll() { this.queue.cancelAll() }
}
```

3. Integrar no `DuelContext.jsx`:
   - Criar `fxQueueRef` (useRef(new VisualEventQueue()))
   - Em `executeAction`: após dispatch do reducer, chamar `fxQueueRef.current.enqueue(VISUAL_EVENT_TYPES.CARD_PLAY, { card, zoneKey, actionId })`
   - Em `dealDamage`: enfileirar `DAMAGE` ao invés de chamar `screenShake` diretamente
   - Em `handleAttackTarget`: enfileirar `ATTACK_DECLARE` + `ATTACK_IMPACT`

4. Adicionar `fxQueueRef.current.cancelAll()` dentro de `resetDuel`.

**Critério:** Eventos visuais são enfileirados e processados em ordem. `performance.now()` mostra latência < 16ms entre enqueue e processamento. Teste: 10 eventos simultâneos não estouram a pilha.

---

### VIS-000-C — Unificar disparo de eventos visuais do DuelContext

**Arquivos:** `src/contexts/DuelContext.jsx` (refatorar), `src/engine/LocalEngine.js` (remover chamadas FX)

**Tecnologia:** React hooks + VisualEventQueue

**Passos:**
1. Em `DuelContext.jsx`, criar hook `useVisualEvents` que escuta mudanças de estado e dispara eventos visuais automaticamente:

```js
// Monitora occupiedZones → detecta novas cartas → enfileira CARD_PLAY
useEffect(() => {
  const prevKeys = Object.keys(prevOccupiedZones.current)
  const currKeys = Object.keys(occupiedZones)
  // diferença = novas cartas no campo
  const newCards = currKeys.filter(k => !prevKeys.includes(k))
  newCards.forEach(zk => {
    if (fxQueueRef.current) {
      fxQueueRef.current.enqueue(VISUAL_EVENT_TYPES.CARD_PLAY, {
        zoneKey: zk, card: occupiedZones[zk]
      })
    }
  })
  prevOccupiedZones.current = occupiedZones
}, [occupiedZones])
```

2. Remover chamadas FX diretas de `LocalEngine.js`:
   - Linha 13: `import { attackArrow } from '../fx/effects/AttackArrow'` → mover para `FXManager`
   - Linha 284-288: `attackArrow.fire(attackerEl, targetEl, ...)` → substituir por retorno de callback
   - Linha 304: `lpDamageFX(atk, barEl, valEl, 45)` → substituir por evento

3. `LocalEngine.handleAttackTarget` agora retorna `{ type: 'ATTACK_DECLARE', data: {...} }` em vez de manipular DOM.

**Critério:** Nenhum componente ou engine manipula DOM diretamente para efeitos visuais. FXManager é o único ponto de entrada para efeitos.

---

## FASE 1 — CAMPO DE DUELO (5 tarefas)

### VIS-010 — Criar estrutura em camadas do campo

**Arquivos:** `src/components/DuelField.jsx` (refatorar), `src/styles/duel-field.css` (organizar)

**Tecnologia:** CSS Grid + posicionamento absoluto

**Passos:**
1. Reorganizar `DuelField.jsx` com wrapper de camadas:

```jsx
<div className="field-layers">
  <div className="field-layer field-layer--background" />   {/* gradiente + grid lines */}
  <div className="field-layer field-layer--ambient" />      {/* partículas de fundo */}
  <div className="field-layer field-layer--board">          {/* tabuleiro + zonas */}
    { /* conteúdo atual do DuelField */ }
  </div>
  <div className="field-layer field-layer--cards" />        {/* overlay das cartas */}
  <div className="field-layer field-layer--fx" />           {/* canvas/SVG FX */}
  <div className="field-layer field-layer--ui">             {/* instruction, HUD */}
  </div>
</div>
```

2. CSS para cada camada:

```css
.field-layers { position: relative; width: 100%; height: 100%; }
.field-layer { position: absolute; inset: 0; pointer-events: none; }
.field-layer--background { z-index: var(--z-field); }
.field-layer--board { z-index: calc(var(--z-field) + 1); pointer-events: all; }
.field-layer--cards { z-index: var(--z-card); }
.field-layer--fx { z-index: var(--z-arrow); }
.field-layer--ui { z-index: var(--z-hud); pointer-events: all; }
```

3. Manter estrutura funcional atual — apenas adicionar os divs wrapper, sem mudar comportamento.

**Critério:** Layout visual idêntico ao atual. Nenhum quebra de clique ou hover.

---

### VIS-011 — Melhorar materiais do tabuleiro com CSS

**Arquivos:** `src/styles/duel-field.css` (seções `.duel-field`, `.field-side`)

**Tecnologia:** CSS gradients + box-shadow

**Passos:**
1. Substituir o gradiente radial atual do `.duel-field` (linha 493-496) por um gradiente mais rico:

```css
.duel-field {
  background:
    radial-gradient(ellipse 60% 40% at 30% 50%, rgba(14,30,60,.3) 0%, transparent 60%),
    radial-gradient(ellipse 60% 40% at 70% 50%, rgba(60,14,30,.15) 0%, transparent 60%),
    radial-gradient(ellipse 80% 50% at 50% 50%, rgba(14,30,60,.7) 0%, transparent 70%),
    linear-gradient(180deg, #06080f 0%, #090d18 50%, #06080f 100%);
}
```

2. Adicionar `box-shadow` interno nas zonas para dar profundidade:

```css
.zone--monster {
  box-shadow: inset 0 1px 0 rgba(200,140,50,.1), 0 1px 3px rgba(0,0,0,.5);
}
```

3. Ajustar a textura de grid (`.duel-field::before`) para linhas mais sutis: `rgba(46,143,212,.025)` com `background-size: 40px 40px`.

**Critério:** Diferença visual perceptível mas sutil. Contraste das cartas não é reduzido.

---

### VIS-012 — Iluminação dinâmica via CSS

**Arquivos:** `src/styles/duel-field.css` + `src/components/DuelField.jsx` (classe condicional)

**Tecnologia:** CSS custom properties + transições

**Passos:**
1. Adicionar variáveis de iluminação em `tokens.css`:

```css
--light-neutral: rgba(0,0,0,0);
--light-player-turn: rgba(46,143,212,.08);
--light-opponent-turn: rgba(200,50,50,.05);
--light-battle: rgba(200,100,30,.12);
--light-critical: rgba(200,30,30,.15);
```

2. No `DuelField.jsx`, adicionar classe condicional no wrapper:
```jsx
<div className={`duel-field lighting--${lightingState}`}>
```
Onde `lightingState` é derivado de `turn`, `phase.id`, e `playerLP` / `opponentLP`.

3. CSS para cada estado:

```css
.duel-field { transition: background .8s var(--ease-default); }
.lighting--player-turn { background: radial-gradient(... rgba(46,143,212,.08) ...); }
.lighting--battle { background: radial-gradient(... rgba(200,100,30,.12) ...); }
.lighting--critical { background: radial-gradient(... rgba(200,30,30,.15) ...); }
```

4. Transições suaves com `transition: background .8s ease`.

**Critério:** Iluminação muda suavemente entre turnos/fases. Desligável via CSS (basta comentar). Não afeta FPS.

---

### VIS-013 — Ambiente animado com partículas CSS/Canvas

**Arquivos:** `src/components/AmbientParticles.jsx` (novo), `src/styles/duel-field.css`

**Tecnologia:** Canvas 2D + requestAnimationFrame (não Three.js)

**Passos:**
1. Criar componente que renderiza um `<canvas>` fullscreen com partículas mínimas:

```jsx
export default function AmbientParticles({ quality = 'medium' }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || quality === 'off') return
    const ctx = canvas.getContext('2d')
    // 15 partículas (tamanho 1-3px, opacidade 0.02-0.08, movimento lento)
    // cor: azul muito claro, movimento browniano
    let particles = Array.from({length: quality === 'high' ? 25 : 15}, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
      size: Math.random() * 2 + 1, alpha: Math.random() * 0.06 + 0.02,
    }))
    let running = true
    const loop = () => {
      if (!running) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(46, 143, 212, ${p.alpha})`
        ctx.fill()
      })
      animRef.current = requestAnimationFrame(loop)
    }
    loop()
    return () => { running = false; cancelAnimationFrame(animRef.current) }
  }, [quality])

  return <canvas ref={canvasRef} className="field-layer field-layer--ambient" />
}
```

2. Adicionar em `DuelField.jsx` no layer `--ambient`.
3. Pausar quando `document.hidden` for true (Page Visibility API):

```js
useEffect(() => {
  const onVisibility = () => {
    if (document.hidden) cancelAnimationFrame(animRef.current)
    else animRef.current = requestAnimationFrame(loop)
  }
  document.addEventListener('visibilitychange', onVisibility)
  return () => document.removeEventListener('visibilitychange', onVisibility)
}, [])
```

**Critério:** Consumo < 1% CPU em desktop. Partículas são imperceptíveis a menos que se preste atenção. Nenhum evento de clique é capturado pelo canvas. Partículas param quando a aba perde foco.

---

### VIS-014 — Sistema de skins de arena via CSS custom properties

**Arquivos:** `src/styles/arena-default.css` (novo), `src/styles/arena-alt.css` (novo), `src/contexts/DuelContext.jsx` (arena state)

**Tecnologia:** CSS custom properties temáticas

**Contrato:**

```js
const ARENA_THEMES = {
  default: {
    id: 'default', name: 'Standard Arena',
    cssFile: 'arena-default.css',
    // cores base, background gradient, zone colors
  },
  digital: {
    id: 'digital', name: 'Digital Grid',
    cssFile: 'arena-digital.css',
    // fundo mais escuro, grid azul neon
  },
}
```

**Passos:**
1. Extrair cores do campo para `var(--arena-bg)`, `var(--arena-grid-color)`, `var(--arena-zone-monster)` etc.
2. Criar `ARENA_CONTEXT` que carrega o CSS da arena ativa via `document.querySelector('link[data-arena]')?.remove()` + novo `<link data-arena>` no `<head>`.
3. Arena padrão = tema atual. Arena alternativa: fundo mais escuro, zonas com tom digital.

**Critério:** Trocar arena não causa re-render dos componentes — apenas troca CSS. Fallback para default se CSS não carregar.

---

## FASE 2 — CARTAS FÍSICAS (4 tarefas)

### VIS-020 — Estados de elevação e sombra unificados

**Arquivos:** `src/styles/duel-field.css` (seções `.card-wrap`, `.zone.occupied`), `src/components/CardWrap.jsx`

**Tecnologia:** CSS box-shadow + filter + classes de estado

**Passos:**
1. Definir tokens de elevação em CSS:

```css
:root {
  --elevation-rest: 0 2px 8px rgba(0,0,0,.8);
  --elevation-hover: 0 14px 50px rgba(0,0,0,.95), 0 0 28px 4px var(--card-glow);
  --elevation-selected: 0 14px 50px rgba(0,0,0,.95), 0 0 24px 6px var(--card-glow);
  --elevation-drag: 0 20px 60px rgba(0,0,0,.95);
  --elevation-invalid: 0 2px 8px rgba(0,0,0,.8);
  --elevation-target: 0 10px 40px rgba(42,184,106,.4);
  --elevation-playable: 0 2px 8px rgba(0,0,0,.8), 0 0 6px rgba(0,220,255,.4);
}
```

2. Unificar todos os `.card-wrap--hovered`, `.card-wrap--selected`, `.card-wrap--dimmed` para usar estes tokens.
3. Em `CardWrap.jsx`, usar `style={{ boxShadow: 'var(--elevation-hover)' }}` ao invés de múltiplas declarações CSS.

**Critério:** 6 tokens de elevação, zero valores mágicos de box-shadow. Estados visuais não dependem de cor como único indicador.

---

### VIS-021 — Inclinação 3D no hover (já parcialmente feito)

**Arquivos:** `src/components/CardWrap.jsx` (refatorar onPointerMove)

**Tecnologia:** CSS perspective + JS pointer tracking (já implementado)

**O que já existe (linhas 64-93 de CardWrap.jsx):**
- `onPointerMove` calcula `rx` e `ry` baseado na posição do cursor
- Aplica `--rx`, `--ry`, `--mx`, `--my`, `--o` no wrap
- Retorno suave em `onPointerLeave`

**Passos:**
1. Adicionar suporte a `Reduce Motion` via `prefers-reduced-motion`:

```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReduced) return // não aplica tilt
```

2. Limitar a 6 cartas simultaneamente para evitar performance issue:

```js
const tiltActiveCount = document.querySelectorAll('.card-wrap[style*="--rx"]').length
if (tiltActiveCount > 6) return
```

3. Garantir que hitbox não muda (já OK — tilt é puramente visual no `.card`, não no `.card-wrap`).

**Critério:** Hitbox permanece a mesma durante tilt. `pointer-events` não é afetado. Máximo 6 tilt ativos.

---

### VIS-022 — Reflexo holográfico (já parcialmente feito)

**Arquivos:** `src/components/CardWrap.jsx` (seção `.art::before`, `.art::after`, `.sparkles`)

**Tecnologia:** CSS gradients + mix-blend-mode (já implementado)

**O que já existe:**
- `.art::before`: radial gradient de glare (linha 1040-1045)
- `.art::after`: linear gradient holográfico (linha 1048-1059)
- `.sparkles`: repeating-radial-gradient com animação (linha 1062-1075)

**Passos:**
1. Extrair intensidade do holo para CSS custom property:

```css
.card-wrap { --holo-intensity: 0.8; }
.card-wrap[data-rarity="ultra"] { --holo-intensity: 1; }
.card-wrap[data-rarity="rare"] { --holo-intensity: 0.4; }
.card-wrap[data-rarity="common"] { --holo-intensity: 0; }
```

2. Aplicar `opacity: calc(var(--o) * var(--holo-intensity))` no `.art::after`.
3. Adicionar configuração `cardHolo` em `GraphicsSettings.js` (ver VIS-002) que define `document.documentElement.style.setProperty('--holo-intensity', '0')` quando desligado.

**Critério:** Holo desliga com `--holo-intensity: 0`. Fallback para common cards é transparente. Desempenho não é afetado (CSS puro).

---

### VIS-024 — Zoom de inspeção de carta

**Arquivos:** `src/components/CardDetailModal.jsx` (refatorar existente)

**Tecnologia:** React portal + framer-motion (já existe CardDetailModal.jsx)

**O que já existe:**
- `CardDetailModal.jsx` com portal, ESC handler, click-outside
- Atualmente exibe info básica

**Passos:**
1. Expandir `CardDetailModal.jsx` para exibir:
   - Arte em alta resolução (`card_images[0].image_url` ou `card.url`)
   - Nome, atributo, tipo, nível/rank/Link
   - ATK/DEF ou Link arrowns
   - Texto completo (descrição)
   - Estado atual (posição, face-up/down)
   - Controlador, localização (mão, campo, GY, etc.)
   - Modificadores temporários (pendente para quando houver)
2. Adicionar eventos de teclado: ESC fecha, setas navegam entre cartas na mão.
3. Touch: swipe down fecha o modal.
4. Fonte deve respeitar `font-size` configurável via `--modal-font-size`.

**Critério:** Em < 300ms de abertura. Suporta mouse, teclado e toque. Texto legível em 125% scale.

---

## FASE 3 — MÃO DO JOGADOR (1 tarefa)

### VIS-030 — Layout responsivo da mão (já implementado parcialmente)

**Arquivos:** `src/components/PlayerHand.jsx`, `src/components/CardWrap.jsx`, `src/styles/duel-field.css` (seção `.hand`)

**Tecnologia:** CSS posicionamento absoluto + JS para distribuição em leque

**O que já existe:**
- `CardWrap.jsx` linhas 9-11: `ANGLES`, `OFFSETS`, `SPREAD` para distribuição em leque fixo de 7 cartas
- Linha 29: `fan = rotate(${a}deg) translateY(${oy}px)`
- `.hand` posicionado fixed no bottom center
- `hand-enter` animation

**Passos:**
1. Adicionar suporte a diferentes quantidades de cartas (1-10):
   - 1-3 cartas: centralizadas, sem sobreposição
   - 4-6 cartas: leve arco
   - 7-10 cartas: arco completo com sobreposição progressiva

```js
function getFanLayout(count) {
  if (count <= 3) return { angles: [0, -3, 3], offsets: [0, 0, 0], spread: 80 }
  if (count <= 6) return { angles: [-8, -4, 0, 4, 8, 0], offsets: [15, 5, 0, 5, 15, 0], spread: 50 }
  return { angles: [-18, -12, -6, 0, 6, 12, 18], offsets: [38, 18, 6, 0, 6, 18, 38], spread: 34 }
}
```

2. Fazer `PlayerHand` aceitar `totalCards` dinâmico e passar para `CardWrap`.
3. Animação de reorganização: `framer-motion` `layout` no `motion.div` (já existe `layout` na linha 71).
4. Evitar salto visual: `AnimatePresence mode="popLayout"` (já presente).

**Critério:** Mão com 8-10 cartas não sobrepõe a ponto de ficar ilegível. Reorganização animada suavemente.

---

## FASE 4 — COMBATE E IMPACTO (3 tarefas)

### VIS-040-041 — Attack Director + trajetória visual

**Arquivos:** `src/fx/effects/AttackArrow.js` (refatorar), `src/fx/FXManager.js` (attack method)

**Tecnologia:** SVG + Web Animations API

**O que já existe:**
- AttackArrow.js com 3 fases: Charge → Travel → Impact + Sobel Dissolve
- FXManager.attack() que chama AttackArrow.fire()

**Passos:**
1. Refatorar `AttackArrow.fire()` para retornar uma Promise que resolve ao final:
```js
fire(attackerEl, targetEl) {
  return new Promise(resolve => {
    // ... animação atual ...
    // no final do impacto: resolve()
  })
}
```

2. Adicionar suporte a ataque direto (target = `null`):
```js
const resolvedTarget = targetEl ?? document.querySelector('.field-side--opponent')
```

3. No `FXManager`, criar `attackDirector()` que coordena a sequência completa:
```js
async attackDirector(attackerZone, targetZone, onImpact) {
  // 1. destaca atacante (classe .attacking)
  // 2. destaca alvo (classe .attack-target)
  // 3. foca câmera (se VIS-070 implementado)
  // 4. anima seta
  await this.fire(attackerEl, targetEl)
  // 5. callback de impacto (resolução de batalha)
  onImpact()
  // 6. restaura câmera
}
```

**Critério:** Seta anima em < 600ms. Ataque direto funciona. Promise resolve no final.

---

### VIS-042 — Efeito de impacto (já existe no AttackArrow doImpact)

**Arquivos:** `src/fx/effects/AttackArrow.js` (função `doImpact`)

**Tecnologia:** SVG

**O que já existe:**
- `doImpact()` em AttackArrow.js: flash, anéis de expansão, estilhaços (shards) com Sobel dissolve

**Passos:**
1. Aumentar moderadamente o efeito de reação no alvo: adicionar `classList.add('impact-shake')` na zona alvo por 200ms.
2. CSS para `impact-shake`:

```css
@keyframes impact-shake {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, -1px); }
  40% { transform: translate(2px, 1px); }
  60% { transform: translate(-1px, 2px); }
  80% { transform: translate(1px, -1px); }
}
.impact-shake { animation: impact-shake .2s ease-out; }
```

3. Adicionar `playSound('attack')` no início e `playSound('damage')` no impacto.

**Critério:** Shake localizado (não global). Som sincronizado com o impacto visual.

---

### VIS-043 — Feedback de destruição

**Arquivos:** `src/utils/animations.js` (sendToGYVariants), `src/components/Zone.jsx`

**Tecnologia:** framer-motion variants

**O que já existe:**
- `sendToGYVariants` (animations.js linhas 43-49): fade out + shrink + translateY
- `sendToBanishedVariants` (linhas 51-57): fade out + brightness + hue-rotate

**Passos:**
1. Expandir variantes para cada tipo de destruição:

```js
export const destroyByBattleVariants = {
  initial: { opacity: 1, scale: 1, filter: 'brightness(1)' },
  animate: {
    opacity: 0, scale: 0.3, filter: 'brightness(2) saturate(0)',
    transition: { duration: 0.3, ease: 'easeIn' },
  },
}

export const destroyByEffectVariants = {
  initial: { opacity: 1, scale: 1, filter: 'brightness(1)' },
  animate: {
    opacity: 0, scale: 0.5, filter: 'brightness(4) hue-rotate(90deg)',
    transition: { duration: 0.4, ease: 'easeIn' },
  },
}

export const returnToHandVariants = {
  initial: { opacity: 1, scale: 1, y: 0 },
  animate: {
    opacity: 0, scale: 0.6, y: -60,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

export const banishVariants = {
  initial: { opacity: 1, filter: 'brightness(1) saturate(1)' },
  animate: {
    opacity: 0, filter: 'brightness(2) saturate(0) hue-rotate(270deg)',
    transition: { duration: 0.4, ease: 'easeIn' },
  },
}
```

2. Em `Zone.jsx`, detectar o tipo de saída via ação no reducer e aplicar a variante correta.

**Critério:** Cada tipo de destruição tem animação visualmente distinta. Nenhuma sugere regra diferente da real.

---

## FASE 5 — INVOCAÇÕES (já implementadas em Canvas FX, 1 tarefa)

### VIS-050-059 — Sistema de animações de invocação

**Arquivos:** `src/utils/fx.js` (normalSummonFX, specialSummonFX), `src/components/Zone.jsx` (disparo)

**Tecnologia:** Canvas 2D (já implementado)

**O que já existe:**
- `normalSummonFX()` (fx.js linhas 91-152): partículas + flash + anel expansivo
- `specialSummonFX()` (fx.js linhas 155-234): 5 variações (Fusion, Synchro, Xyz, Link, Ritual)
- `spellActivationFX()` (fx.js linhas 238-265): polígono rotativo
- Disparo em Zone.jsx useEffect (linhas 66-93)

**Passos:**
1. Criar `docs/animation-guidelines.md` documentando durações, easings e intensidades:

```markdown
# Animation Guidelines

## Summon FX
- Normal Summon: 900ms, particles + light burst + ring
- Special Summon (Fusion): 1100ms, spiraling energy + violet tones
- Special Summon (Synchro): 1100ms, expanding rings + white light
- Special Summon (Xyz): 1100ms, orbit particles + dark overlay + gold
- Special Summon (Link): 1100ms, digital mesh + nodes + hex outline
- Special Summon (Ritual): 1100ms, radial lines + light converge
- Spell/Trap Activation: 800ms, rotating polygon (5 sides spell, 3 sides trap)
- Sobel Edge Glow: 2400ms, edge detection + color extraction + dissolve
```

2. Criar interface `SummonAnimation` no `FXManager`:

```js
class SummonAnimation {
  canHandle(event) { /* retorna true se este animator pode lidar com o evento */ }
  preloadAssets()  { /* fetch imagens se necessário */ }
  play(zoneEl)     { /* executa animação, retorna Promise */ }
  cancel()         { /* limpa canvas/timers */ }
  get duration()   { /* duração estimada em ms */ }
}
```

3. Registrar animators no FXManager:

```js
class FXManager {
  constructor() {
    this.animators = [
      new NormalSummonAnimator(),
      new FusionSummonAnimator(),
      new SynchroSummonAnimator(),
      new XyzSummonAnimator(),
      new LinkSummonAnimator(),
      new RitualSummonAnimator(),
      new SpellActivationAnimator(),
    ]
  }
}
```

**Critério:** Animações existentes continuam funcionando. Nova interface permite adicionar/remover animators sem modificar Zone.jsx.

---

## FASE 6 — CADEIAS (1 tarefa)

### VIS-080-083 — Visualizador de cadeia

**Arquivos:** `src/components/ChainViewer.jsx` (novo), `src/styles/duel-field.css` (nova seção)

**Tecnologia:** React + framer-motion + portal

**Passos:**
1. Criar componente `ChainViewer`:

```jsx
export default function ChainViewer({ chain, onResolve }) {
  // chain = [{ card, actionType, speed }]
  // Exibe pilha lateral com cartas sobrepostas
  // Numeração explícita (Chain Link 1, 2, 3...)
  // Conexão visual entre links
  return (
    <div className="chain-viewer">
      {chain.map((link, index) => (
        <motion.div
          key={index}
          className="chain-link"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="chain-link-number">Chain Link {index + 1}</div>
          <img src={link.card?.card_images?.[0]?.image_url} alt={link.card?.name} />
          <div className="chain-link-speed">Speed {link.speed}</div>
        </motion.div>
      ))}
    </div>
  )
}
```

2. CSS:

```css
.chain-viewer {
  position: fixed; right: 16px; top: 50%; transform: translateY(-50%);
  z-index: var(--z-overlay);
  display: flex; flex-direction: column-reverse; gap: 4px;
  pointer-events: none;
}
.chain-link {
  width: 80px; height: 116px;
  background: rgba(6,8,15,.92);
  border: 1px solid var(--b-panel);
  border-radius: 3px;
  overflow: hidden;
  display: flex; flex-direction: column;
}
.chain-link img { width: 100%; height: 60%; object-fit: cover; }
.chain-link-number {
  font-family: 'Orbitron', monospace; font-size: .35rem;
  color: var(--c-gold-lt); text-align: center; padding: 2px;
}
.chain-link-speed {
  font-family: 'Orbitron', monospace; font-size: .3rem;
  color: rgba(160,180,220,.5); text-align: center;
}
```

3. Integrar no `DuelContext.jsx`: `chain.length > 0 && <ChainViewer chain={chain} />`
4. Estados: `pending` (borda azul), `resolving` (borda verde), `negated` (borda vermelha).

**Critério:** Cadeia visível no canto direito. Links entram com delay. Ao resolver, ordem reversa é visível. Não esconde o campo.

---

## FASE 7 — CÂMERA (1 tarefa)

### VIS-070-073 — Camera Controller via scroll/zoom CSS

**Arquivos:** `src/hooks/useCameraController.js` (novo)

**Tecnologia:** CSS transform + transições (sem Three.js)

**NOTA:** Este é um jogo 2D React. "Câmera" = transform: scale + translate no container do campo.

**Passos:**
1. Criar hook:

```js
export function useCameraController(containerRef) {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 })

  const focusOnElement = useCallback((el, opts = {}) => {
    const rect = el.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (!containerRect) return
    // Calcula translate para centralizar elemento
    const x = containerRect.width/2 - (rect.left + rect.width/2) + (opts.offsetX || 0)
    const y = containerRect.height/2 - (rect.top + rect.height/2) + (opts.offsetY || 0)
    setCamera({ x, y, zoom: opts.zoom || 1.2 })
  }, [])

  const reset = useCallback(() => {
    setCamera({ x: 0, y: 0, zoom: 1 })
  }, [])

  const shake = useCallback((intensity = 4, duration = 300) => {
    const el = containerRef.current
    if (!el) return
    el.animate([
      { transform: `translate(${intensity}px, ${-intensity}px)` },
      { transform: `translate(${-intensity}px, ${intensity}px)`, offset: 0.15 },
      { transform: `translate(0, 0)` },
    ], { duration, easing: 'ease-out', fill: 'forwards' })
  }, [])

  return { camera, focusOnElement, reset, shake }
}
```

2. Aplicar transform no container do `DuelField`:

```jsx
<div className="duel-field" style={{
  transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
  transition: 'transform .4s var(--ease-default)',
}}>
```

3. Integrar com `VisualEventQueue`: quando evento `ATTACK_DECLARE` chega, `focusOnElement(atacante)` antes da seta.

**Critério:** Movimentos suaves (transition 400ms). `Reduce Motion` desativa zoom. Não corta elementos críticos.

---

## FASE 8 — ÁUDIO (1 tarefa)

### VIS-120-124 — Sistema de áudio adaptativo

**Arquivos:** `src/utils/sound.js` (refatorar), `src/hooks/useAdaptiveAudio.js` (novo)

**Tecnologia:** Howler.js (já integrado)

**O que já existe:**
- `sound.js` com 14 sons, Howl instances, `playSound()` function
- `SoundToggle.jsx` componente
- Sons em `public/sounds/`

**Passos:**
1. Refatorar `sound.js` para usar canais de áudio:

```js
export class AudioManager {
  constructor() {
    this.masterVolume = 1
    this.channels = {
      master: new Howler({ volume: 1 }),
      music: new Howl({ src: ['/sounds/music.mp3'], loop: true, volume: 0.3 }),
      ambient: new Howl({ src: ['/sounds/ambient.mp3'], loop: true, volume: 0.15 }),
      effects: new Howl({ volume: 0.4 }),
      ui: new Howl({ volume: 0.2 }),
    }
    this.sounds = { /* manter refs atuais */ }
  }

  setVolume(channel, value) { /* 0-1 */ }
  play(soundName) { /* toca no canal effects */ }
  setMusicState(state) { /* 'normal', 'battle', 'critical', 'victory' */ }
}
```

2. Criar `useAdaptiveAudio` hook que escuta o estado do duelo e muda música/ambiente:

```js
export function useAdaptiveAudio() {
  const { phase, playerLP, opponentLP, gameResult } = useDuel()
  useEffect(() => {
    if (gameResult?.isVictory) { audio.setMusicState('victory'); return }
    if (playerLP <= 2000 || opponentLP <= 2000) { audio.setMusicState('critical'); return }
    if (phase.id === 'BATTLE') { audio.setMusicState('battle'); return }
    audio.setMusicState('normal')
  }, [phase, playerLP, opponentLP, gameResult])
}
```

3. Sincronizar som com animação por eventos, não `setTimeout`:

```js
// Em vez de setTimeout(() => playSound('attack'), 300):
VisualEventQueue.enqueue(VISUAL_EVENT_TYPES.ATTACK_DECLARE, { audioTimestamp: 0 })
// O AnimationDirector toca o som no timestamp 0 (início da animação)
```

**Critério:** Sons não atrasam nem avançam em relação à animação. Volume independente por canal. `localStorage` persiste preferências.

---

## FASE 9 — TELA DE RESULTADO E TRANSIÇÕES (1 tarefa)

### VIS-140-143 — Vitória, derrota e início de duelo

**Arquivos:** `src/components/ResultScreen.jsx` (refatorar), `src/components/DuelStartOverlay.jsx` (novo)

**Tecnologia:** framer-motion

**O que já existe:**
- `ResultScreen.jsx` com overlay, painel, estatísticas, ações
- `victoryParticles` em fx.js

**Passos:**
1. Refatorar `ResultScreen` para ter animações de entrada mais dramáticas:

```jsx
<motion.div
  className="result-overlay"
  initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
  animate={{ opacity: 1, backdropFilter: 'blur(6px)' }}
  transition={{ duration: 0.4 }}
>
  <motion.div
    className="result-panel"
    initial={{ scale: 0.8, y: 40, opacity: 0 }}
    animate={{ scale: 1, y: 0, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
  >
```

2. Criar `DuelStartOverlay` para abertura do duelo:

```jsx
// Exibe por 2s no início: nome dos jogadores, turno 1, música
// Depois fade out e libera interação
```

3. Turn transition: já existe `PhaseOverlay` (componente + fx.js `phaseTransitionFX`). Melhorar com label do jogador atual.

**Critério:** Overlay de resultado não bloqueia mais que 3s. Overlay de início não bloqueia mais que 2s.

---

## FASE 10 — DESEMPENHO E ACESSIBILIDADE (3 tarefas)

### VIS-150 — Reduce Motion

**Arquivos:** `src/contexts/DuelContext.jsx` + `src/styles/tokens.css`

**Tecnologia:** `prefers-reduced-motion` media query + CSS

**Passos:**
1. No `tokens.css`:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-fast: 0ms; --dur-normal: 0ms; --dur-slow: 0ms;
  }
  .phase-overlay { display: none; }
  .card-wrap .sparkles { display: none; }
  .zone.card-landing { animation: none; }
  canvas[class*="fx"] { display: none; }
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

2. Adicionar botão de toggle no settings que força `document.documentElement.classList.toggle('reduce-motion')`.

**Critério:** Com `reduce-motion`, zero animações visíveis. Nenhuma funcionalidade é perdida (apenas feedback visual simplificado).

---

### VIS-151 — Escala da interface

**Arquivos:** `src/styles/tokens.css` + `src/hooks/useUIScale.js` (novo)

**Tecnologia:** CSS `zoom` / `transform: scale`

**Passos:**
1. Adicionar slider no settings (0.8 a 1.5) que define `--ui-scale` no `:root`.
2. Aplicar `transform: scale(var(--ui-scale))` no `.duel-field` e `.hand`.
3. Testar em 80%, 90%, 100%, 110%, 125%, 150%.

**Critério:** Informações críticas (LP, cartas) permanecem visíveis em todos os scales. Nenhum corte no layout.

---

### VIS-153-155 — Monitor de desempenho e degradação

**Arquivos:** `src/components/PerformanceMonitor.jsx` (novo)

**Tecnologia:** `requestAnimationFrame` + contadores

**Passos:**
1. Criar componente de debug:

```jsx
export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({ fps: 60, particles: 0, fxPending: 0 })

  useEffect(() => {
    let frames = 0, lastTime = performance.now()
    const loop = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setMetrics({
          fps: frames,
          particles: document.querySelectorAll('canvas').length,
          fxPending: fx.queue.pending,
        })
        frames = 0
        lastTime = now
      }
      raf = requestAnimationFrame(loop)
    }
    let raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (process.env.NODE_ENV !== 'development') return null
  return (
    <div className="perf-monitor">
      <span>{metrics.fps} FPS</span>
      <span>{metrics.fxPending} FX pending</span>
    </div>
  )
}
```

2. Degradação automática opcional: se FPS < 30 por 3 segundos consecutivos, reduzir qualidade.

```js
useEffect(() => {
  if (fpsRef.current < 30 && lowFpsCount > 3) {
    // reduzir qualidade
    dispatchGraphics({ type: 'DEGRADE' })
    lowFpsCount = 0
  }
}, [fps])
```

**Critério:** Monitor não afeta desempenho (mede a si mesmo). Degradação só acontece após queda sustentada.

---

## ORDEM DE IMPLEMENTAÇÃO

```
FASE 0:  VIS-000-A → VIS-000-B → VIS-000-C (fundação técnica)
FASE 1:  VIS-010 → VIS-011 → VIS-012 → VIS-013 → VIS-014 (campo)
FASE 2:  VIS-020 → VIS-021 → VIS-022 → VIS-024 (cartas)
FASE 3:  VIS-030 (mão)
FASE 4:  VIS-040-041 → VIS-042 → VIS-043 (combate)
FASE 5:  VIS-050-059 (invocações — documentar o existente)
FASE 6:  VIS-080-083 (cadeias)
FASE 7:  VIS-070-073 (câmera)
FASE 8:  VIS-120-124 (áudio)
FASE 9:  VIS-140-143 (resultado)
FASE 10: VIS-150 → VIS-151 → VIS-153-155 (acessibilidade + perf)
```

## CRITÉRIOS GLOBAIS DE ACEITE

1. **Build e testes:** `npm run build` passa sem erros. `npm test` passa (58+ testes Vitest, testes E2E Playwright).
2. **FPS:** Mínimo 55 FPS em desktop médio (i5-8400, Chrome) com todas as features ligadas.
3. **Fallback:** Toda animação/efeito tem fallback para CSS básico ou desliga sem quebrar o jogo.
4. **Memory:** `resetDuel` limpa todos os timers, canvas, animações. Nenhum leak após 10 duelos consecutivos.
5. **Reduce Motion:** Todas as animações respeitam `prefers-reduced-motion`.
6. **Zero números mágicos:** Toda cor, espaçamento, duração, z-index usa CSS custom property.
7. **Ordem de eventos:** Eventos visuais nunca executam fora da ordem do core.
