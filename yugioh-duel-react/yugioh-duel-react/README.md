# Yu-Gi-Oh! Duel Field — React Frontend

Interface de campo de duelo Yu-Gi-Oh! com suporte a jogo local (AI) e online via WebSocket.

## Stack

| Camada       | Tecnologia                              |
|-------------|------------------------------------------|
| Framework   | React 18                                 |
| Bundler     | Vite 5                                   |
| Roteamento  | react-router-dom 7                       |
| WebSocket   | STOMP.js 7 + SockJS 1                    |
| API de cartas | db.ygoprodeck.com (fetch direto)       |
| Estilos     | CSS puro (5 arquivos, ~1360+ linhas)    |

## Setup

```bash
npm install
npm run dev       # Vite dev server (porta 5173)
npm run build     # Produção em dist/
npm run preview   # Preview do build
```

## Variáveis de ambiente

| Variável              | Padrão                       | Descrição                     |
|-----------------------|------------------------------|--------------------------------|
| `VITE_API_BASE`       | `http://localhost:8084`      | Base URL da API de duelo       |
| `VITE_AUTH_URL`       | `http://localhost:8086/auth` | URL do serviço de autenticação |
| `VITE_DUEL_URL`       | `http://localhost:8084`      | URL do serviço de duelo        |
| `VITE_DUEL_WS_URL`    | `http://localhost:8084/ws`   | WebSocket endpoint (SockJS)    |
| `VITE_DECK_URL`       | `http://localhost:8081`      | URL do serviço de decks        |
| `VITE_CARD_API_BASE`  | —                            | URL futura do card-service     |

## Estrutura de pastas

```
src/
├── components/
│   ├── ActionBar.jsx          — Barra de ações contextual (slide-in)
│   ├── CardContextMenu.jsx    — Menu contextual flutuante (portal)
│   ├── CardDetailModal.jsx    — Modal de detalhes da carta (portal)
│   ├── CardWrap.jsx           — Carta na mão (tilt 3D, drag, hover)
│   ├── ContextPanel.jsx       — Painel lateral de contexto
│   ├── DebugPanel.jsx         — Log de debug in-app (DEV)
│   ├── DeckViewer.jsx         — Modal de visualização do deck
│   ├── DeckZone.jsx           — Zona do deck (comprar/visualizar)
│   ├── DuelField.jsx          — Layout do campo de duelo
│   ├── DuelLog.jsx            — Log colapsável de ações
│   ├── ErrorBoundary.jsx      — Error boundary (classe)
│   ├── HUD.jsx                — LP bars, timer, botão conceder
│   ├── LoadingSpinner.jsx     — Spinner de carregamento
│   ├── PhaseOverlay.jsx       — Overlay de transição de fase
│   ├── PlayerHand.jsx         — Renderização da mão do jogador
│   ├── ProtectedRoute.jsx     — Guarda de autenticação
│   ├── ResultScreen.jsx       — Tela de resultado do duelo
│   └── Zone.jsx               — Zona genérica do campo
├── contexts/
│   ├── AuthContext.jsx        — Estado de autenticação (JWT + local)
│   ├── DuelContext.jsx        — Estado global do duelo (~650 linhas)
│   └── ToastContext.jsx       — Sistema de toasts
├── engine/
│   ├── DuelEngineAdapter.js   — Contrato/interface da engine
│   ├── LocalEngine.js         — Engine local com regras completas
│   ├── WebSocketEngine.js     — Engine remota (STOMP)
│   └── index.js               — Factory (seleciona engine ativa)
├── fx/
│   ├── FXManager.js           — Orquestrador central de efeitos
│   └── effects/
│       └── AttackArrow.js     — Seta de ataque SVG (Sobel dissolve)
├── hooks/
│   └── useAiOpponent.js       — Hook de AI oponente
├── pages/
│   ├── DuelPage.jsx           — Container do duelo
│   ├── HistoryPage.jsx        — Histórico de duelos
│   ├── LobbyPage.jsx          — Criação de duelo
│   ├── LoginPage.jsx          — Login/registro
│   └── NotFoundPage.jsx       — Página 404
├── services/
│   ├── apiClient.js           — Fetch wrapper (auth, timeout, erros)
│   ├── authService.js         — Login/registro API
│   ├── deckService.js         — CRUD de decks
│   ├── duelService.js         — Duelo CRUD + histórico
│   ├── duelWebSocket.js       — Cliente STOMP/SockJS (reconexão)
│   └── tokenManager.js        — Gerenciamento de tokens JWT
├── styles/
│   ├── action-bar.css
│   ├── auth.css
│   ├── card-context-menu.css
│   ├── context-panel.css
│   └── duel-field.css
└── utils/
    ├── actionResolver.js      — Regras de ações disponíveis
    ├── cardHelpers.js         — Helpers de tipo e imagem
    ├── fx.js                  — Efeitos canvas (Sobel, partículas)
    ├── logger.js              — Logger in-app (DEV)
    └── remoteStateMapper.js   — Mapeia estado remoto → local
```

## Rotas

| Path             | Página        | Protegida | Descrição                     |
|------------------|---------------|-----------|--------------------------------|
| `/`              | LoginPage     | Pública   | Login/registro + modo local   |
| `/lobby`         | LobbyPage     | Sim       | Criar duelo online            |
| `/duel/:duelId`  | DuelPage      | Sim       | Campo de duelo (local/remoto) |
| `/duel/local`    | DuelPage      | Sim       | Atalho para duelo local       |
| `/history`       | HistoryPage   | Sim       | Histórico de duelos           |
| `*`              | NotFoundPage  | —         | Página 404                    |

## API Endpoints (backend duel-service)

| Método | Path                              | Descrição                  |
|--------|------------------------------------|----------------------------|
| POST   | `/api/duels`                       | Criar duelo                |
| GET    | `/api/duels/{id}/state`            | Estado do duelo            |
| GET    | `/api/duels/{id}/history`          | Histórico de um duelo      |
| GET    | `/api/duels/history`               | Últimos 100 duelos         |
| GET    | `/api/duels/history/player/{id}`   | Histórico por jogador      |

## WebSocket

- Endpoint: `/ws` (SockJS)
- Subscribe: `/topic/duel/{id}` (atualizações de estado)
- Subscribe: `/topic/duel/{id}/over` (fim de duelo)
- Send: `/app/duel.action` (ações)
- Send: `/app/duel.phase` (avançar fase)
- Reconexão: até 10 tentativas com delay de 2s

## Game State (DuelContext)

- Turn/Phase: `turn`, `phaseIndex`, `drawnThisTurn`, `turnTimer`, `phaseOverlay`
- Flags: `normalSummonedThisTurn`, `positionChangedThisTurn`, `attackedZones`
- LP: `playerLP` (8000), `opponentLP` (6000)
- Deck: `deckCards[]`, `deckRemaining[]`, `handCards[]`, `opponentHand[]`, `opponentDeckCards[]`, `opponentDeckRemaining[]`
- Field: `occupiedZones{}` (keyed by zoneKey), `playerGY[]`, `opponentGY[]`, `playerBanished[]`, `opponentBanished[]`
- UI: `selectedCard`, `activeAction`, `attackingZone`, `dragState`, `detailCard`, `instruction`
- Result: `gameResult`, `showResult`
- Remote: `isRemoteDuel`, `remoteTransportRef`
- Panel: `panelMode`, `panelData`, `panelLastData`

## Zone Keys

- `pm0`–`pm4` — Player monster zones
- `om0`–`om4` — Opponent monster zones
- `ps0`–`ps4` — Player spell/trap zones
- `os0`–`os4` — Opponent spell/trap zones
- GY, Banished, Field, Extra Deck, Deck zones (type-based)
