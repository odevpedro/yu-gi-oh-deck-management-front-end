# Backlog — yugioh-duel-react

## Pendentes

- [ ] **TEST-001** — Bateria unitária de componentes principais: carta, mão, campo, zonas, modal de seleção, painel de ações, log, LP, fase/turno, cemitério, banidas, extra deck, loading/error e responsividade básica
- [ ] **TEST-002** — Testes de contrato front-core: parsing de mensagens, ordem, mensagens desconhecidas/incompletas, serialização de resposta, rejeição do core, ações ilegais e sincronização do estado
- [ ] **TEST-003** — Testes integrados com core real via JNI/ocgcore: decks controlados, seed determinístico, fluxo de input do core, resolução de ações e comparação UI vs snapshot retornado
- [ ] **TEST-004** — E2E com Playwright/Cypress: login, lobby, duelo local, duelo remoto, compra, invocação, efeitos, ataque, chain, vitória/derrota e reinício
- [ ] **TEST-005** — Testes visuais/regressão: posições das cartas, overlays, modais, menus, destaques, cartas face-down, banidas, materiais Xyz, zonas extras e layouts desktop/mobile
- [ ] **TEST-006** — Replay/golden tests determinísticos: gravação e reprodução de duelos com comparação de mensagens, log, estado renderizado e resultado final
- [ ] **TEST-007** — Testes de privacidade/fair play: mão e deck do oponente ocultos, revelação temporária, payloads privados e rejeição de manipulação via devtools
- [ ] **TEST-008** — Testes de erro e resiliência: falha do core, falha JNI, mensagem inválida, timeout, core encerrado e recuperação sem tela branca
- [ ] **TEST-009** — Testes de performance e escala: mão grande, campo cheio, chain longa e duelo longo sem travar a interface
- [ ] **TEST-010** — Testes de acessibilidade e UX: teclado, foco, contraste, labels, feedback de ação inválida, loading de resposta e fim de duelo claro
- [ ] **TEST-011** — Fixtures controladas obrigatórias: deck vanilla, deck de invocações, deck de efeitos simples, deck de chain/corrente, deck de zonas/limites, deck de condições de vitória/derrota
- [ ] **WEB-023** — E2E com Cypress/Playwright cobrindo o fluxo completo de duelo e regressão visual

## Em andamento

> Nenhuma feature em andamento.

## Concluídas

- [x] **QLT-001** — ErrorBoundary: classe React envolvendo a aplicação (src/components/ErrorBoundary.jsx)
- [x] **QLT-002** — apiClient.js: fetch wrapper com autenticação, timeout (15s) e tratamento de erros (src/services/apiClient.js)
- [x] **QLT-004** — Scripts Three.js removidos do index.html (index.html limpo)
- [x] **WEB-009** — HistoryPage: página de histórico filtrada por jogador (src/pages/HistoryPage.jsx)
- [x] **WEB-010** — cardService.js com fallback YGOPro API (src/services/cardService.js)
- [x] **WEB-011** — WebSocket reconnection: até 10 tentativas, delay 2s, handler onWebSocketClose (src/services/duelWebSocket.js)
- [x] **WEB-012** — Concede button: modal de confirmação no HUD (src/components/HUD.jsx)
- [x] **WEB-013** — LoadingSpinner: componente de anéis duplos (src/components/LoadingSpinner.jsx)
- [x] **WEB-014** — DuelLog: painel colapsável com entradas timestamped (src/components/DuelLog.jsx)
- [x] **WEB-015** — Banished zone: zonas no DuelField + estado em DuelContext (playerBanished, opponentBanished)
- [x] **WEB-016** — Extra deck count: label "EXTRA (0)" nas zonas extra deck
- [x] **WEB-019** — CardDetailModal: portal com ESC e click-outside para fechar (src/components/CardDetailModal.jsx)
- [x] **WEB-020** — Turn timer: 60s countdown, warning visual aos 10s (HUD.jsx, DuelContext)
- [x] **WEB-021** — NotFoundPage: página 404 (src/pages/NotFoundPage.jsx)
- [x] **WEB-022** — Testes unitários com Vitest: 28 testes (actionResolver 17, cardHelpers 11)
- [x] **WEB-024** — Responsividade mobile/tablet: media queries 900px e 600px (src/styles/duel-field.css)
- [x] **WEB-025** — Tema escuro/claro: CSS custom properties, toggle no LobbyPage/DuelPage, localStorage
- [x] **WEB-026** — Refatorar DuelContext para useReducer: game state em duelReducer.js, 30 action types
- [x] **GAME-001** — AI oponente: lógica em useAiOpponent hook (src/hooks/useAiOpponent.js)
- [x] **GAME-002** — Regras de validação: sem ataque turno 1, regras de ataque direto (actionResolver.js, LocalEngine.js)
- [x] **GAME-003** — Defense position: face-down, flip summon, change position (actionResolver.js, LocalEngine.js)
- [x] **GAME-004** — Chain/link de efeitos: estado chain[], addToChain com validação de spell speed (1/2/3), resolveChain LIFO (DuelContext, actionResolver)
- [x] **GAME-005** — LP flash animation: animação CSS em HUD quando LP muda (HUD.jsx)
- [x] **GAME-006** — Special summon do Extra Deck: fluxo executeAction para Fusion/Synchro/Xyz/Link/Ritual
- [x] **GAME-007** — Auto-draw na DRAW phase via useEffect (DuelContext.jsx)
- [x] **GAME-008** — Tribute summon: pendingSummon state, addTribute, Zone click handler, tribute count por level
- [x] **GAME-009** — Spell Speed e chain building: speed validation por tipo de card, chain escalonável
- [x] **MOTION-001** — Animar zonas vazias com Framer Motion (Zone.jsx motion.div)
- [x] **MOTION-002** — Animar cartas na mão com Framer Motion (PlayerHand.jsx AnimatePresence layout)
- [x] **MOTION-003** — Animação de compra com Framer Motion (animations.js drawCard)
- [x] **MOTION-004** — Transição de fase com AnimatePresence (PhaseOverlay.jsx)
- [x] **MOTION-005** — Animação de ataque com shake (Zone.jsx attack shake)
- [x] **MOTION-006** — Animação de envio ao cemitério (animations.js sendToGraveyard)
- [x] **MOTION-007** — Animação de banimento (animations.js banishFromField)
- [x] **MOTION-008** — Animação de invocação especial (animations.js specialSummon)
- [x] **WEB-017** — ContextPanel: painel lateral com informações contextuais (src/components/ContextPanel.jsx)
- [x] **WEB-018** — ActionBar: barra de ações contextual deslizante (src/components/ActionBar.jsx)
- [x] **FX-001** — AttackArrow: seta SVG com Sobel dissolve (src/fx/effects/AttackArrow.js)
- [x] **FX-002** — Canvas FX: normal summon, special summon (Fusion/Synchro/Xyz/Link/Ritual), spell/trap, Sobel glow (src/utils/fx.js)
- [x] **FX-003** — Draw card animation: ghost card animado do deck para mão (utils/fx.js — drawCardAnimation)
- [x] **FX-004** — CardWrap: tilt 3D, hover parallax, drag ghost (src/components/CardWrap.jsx)
- [x] **FX-005** — PhaseOverlay: overlay de transição entre fases (src/components/PhaseOverlay.jsx)
- [x] **ENG-001** — DuelEngineAdapter: contrato da engine (src/engine/DuelEngineAdapter.js)
- [x] **ENG-002** — LocalEngine: implementação completa das regras (src/engine/LocalEngine.js)
- [x] **ENG-003** — WebSocketEngine: cliente remoto via STOMP (src/engine/WebSocketEngine.js)
- [x] **ENG-004** — actionResolver: regras de ações disponíveis por contexto (src/utils/actionResolver.js)
- [x] **ENG-005** — remoteStateMapper: mapeamento estado remoto → local (src/utils/remoteStateMapper.js)
- [x] **AUTH-001** — AuthContext: login/registro JWT + modo local (src/contexts/AuthContext.jsx)
- [x] **AUTH-002** — tokenManager: persistência de tokens (src/services/tokenManager.js)
- [x] **AUTH-003** — authService: chamadas /login e /register (src/services/authService.js)
- [x] **AUTH-004** — ProtectedRoute: guarda de autenticação (src/components/ProtectedRoute.jsx)
- [x] **SVC-001** — duelService: CRUD de duelos + histórico (src/services/duelService.js)
- [x] **SVC-002** — deckService: listar decks (src/services/deckService.js)
- [x] **SVC-003** — ToastContext: sistema de notificações toast (src/contexts/ToastContext.jsx)
- [x] **SVC-004** — DebugPanel: log in-app com filtro por tag (src/components/DebugPanel.jsx)
- [x] **SVC-005** — logger: sistema de log visual (src/utils/logger.js)
- [x] **ZONE-001** — Zone: componente genérico com renderização de slots (src/components/Zone.jsx)
- [x] **ZONE-002** — DeckZone: pilha do deck com draw animation (src/components/DeckZone.jsx)
- [x] **ZONE-003** — DeckViewer: modal de visualização do deck (src/components/DeckViewer.jsx)
- [x] **ZONE-004** — PlayerHand: renderização em leque fixo (src/components/PlayerHand.jsx)
- [x] **ZONE-005** — CardContextMenu: menu contextual flutuante via portal (src/components/CardContextMenu.jsx)
- [x] **LAYOUT-001** — DuelField: layout completo do campo (src/components/DuelField.jsx)
- [x] **LAYOUT-002** — HUD: LP bars, timer, concede (src/components/HUD.jsx)
- [x] **LAYOUT-003** — ResultScreen: overlay de resultado (src/components/ResultScreen.jsx)
- [x] **LAYOUT-004** — App.jsx: roteamento com ErrorBoundary, AuthProvider, ToastProvider, DuelProvider (src/App.jsx)
- [x] **LAYOUT-005** — DuelPage: container principal do duelo (src/pages/DuelPage.jsx)
- [x] **LAYOUT-006** — LobbyPage: formulário de criação de duelo (src/pages/LobbyPage.jsx)
- [x] **LAYOUT-007** — LoginPage: login/registro + modo local (src/pages/LoginPage.jsx)
- [x] **STYLE-001** — duel-field.css: estilos principais do campo (1360+ linhas)
- [x] **STYLE-002** — auth.css: estilos de autenticação
- [x] **STYLE-003** — action-bar.css: estilos da action bar
- [x] **STYLE-004** — card-context-menu.css: estilos do menu contextual
- [x] **STYLE-005** — context-panel.css: estilos do painel lateral
