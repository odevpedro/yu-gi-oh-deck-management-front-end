# Data Model — Yu-Gi-Oh Deck Management Front-end

> Modelo de dados do frontend. Descreve o estado gerenciado pelos contextos React e as entidades transitadas entre frontend e microservicos.

---

## AuthContext

Estado global de autenticacao do usuario.

### user

| Campo | Tipo | Descricao | Exemplo |
|-------|------|-----------|---------|
| `id` | `string` | ID do usuario | `"user-abc123"` ou `"local-player"` |
| `username` | `string` | Nome de exibicao | `"John"` |
| `role` | `string` | Tipo de sessao | `"USER"` ou `"LOCAL"` |

Estados especiais:
- `user === null` — nao autenticado
- `user.role === 'LOCAL'` — sessao local sem backend (deck-service nao disponivel)

### loading

| Tipo | Descricao |
|------|-----------|
| `boolean` | `true` enquanto verifica token no localStorage no mount |

---

## DuelContext

Estado central do duelo. Gerenciado por `DuelProvider` (React Context).

### Turno e Fase

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `turn` | `number` | Numero do turno atual (1-indexed) |
| `phaseIndex` | `number` | Indice na array `PHASES` (0=DRAW, 1=STANDBY, ..., 5=END) |
| `phase` | `string` | Nome da fase atual (derivado de `PHASES[phaseIndex].id`) |
| `drawnThisTurn` | `boolean` | Se ja comprou carta neste turno |
| `phaseOverlay` | `string \| null` | Nome da fase para overlay (null = sem overlay) |

### Flags de Turno

| Campo | Tipo | Reset |
|-------|------|-------|
| `flags.normalSummonedThisTurn` | `boolean` | `false` no inicio de cada turno |
| `flags.positionChangedThisTurn` | `boolean` | `false` no inicio de cada turno |
| `flags.attackedZones` | `Set<string>` | `new Set()` no inicio de cada turno |

### Life Points

| Campo | Tipo | Default |
|-------|------|---------|
| `playerLP` | `number` | 8000 |
| `opponentLP` | `number` | 6000 |

### Deck

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `deckCards` | `Card[]` | Deck completo (cartas originais) |
| `deckRemaining` | `Card[]` | Cartas restantes no deck (mutavel) |
| `deckViewerOpen` | `boolean` | Se o modal do deck viewer esta aberto |

### Mao

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `handCards` | `Card[]` | Cartas na mao do jogador |

### Zonas Ocupadas

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `occupiedZones` | `Record<string, ZoneState>` | Mapa de zonaKey → estado da zona |

#### ZoneState

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `card` | `Card` | Carta na zona |
| `position` | `'ATK' \| 'DEF'` | Posicao |
| `faceDown` | `boolean` | Se esta virada para baixo |

### Oponente (mao e deck)

Adicionado em v0.5.0 (IA de oponente):

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `opponentHand` | `Card[]` | Mao do oponente |
| `opponentDeckCards` | `Card[]` | Deck completo do oponente |
| `opponentDeckRemaining` | `number[]` | Indices shuffleados restantes |

| Funcao | Descricao |
|--------|-----------|
| `initOpponent()` | Gera deck (20 cartas YGOProDeck ou fallback), shufleia, distribui 5 iniciais |
| `opponentDraw()` | Remove e retorna o topo do deck do oponente |
| `addCardToOpponentHand(card)` | Adiciona carta a mao |
| `removeFromOpponentHand(index)` | Remove carta da mao pelo indice |

### Cemiterio (GY)

| Campo | Tipo |
|-------|------|
| `playerGY` | `Card[]` |
| `opponentGY` | `Card[]` |

### Estado de Arrasto (Drag)

| Campo | Tipo |
|-------|------|
| `dragState.active` | `boolean` |
| `dragState.fromIndex` | `number \| null` |
| `dragState.card` | `Card \| null` |

### Estado de Ataque

| Campo | Tipo |
|-------|------|
| `attackingZone` | `string \| null` |

### Selecao

| Campo | Tipo |
|-------|------|
| `selectedCard` | `SelectedCard \| null` |
| `activeAction` | `string \| null` |

#### SelectedCard

| Campo | Tipo |
|-------|------|
| `zoneId` | `string` |
| `card` | `Card` |
| `side` | `'player' \| 'opponent'` |

### Modal de Detalhe da Carta

Adicionado em v0.7.0:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `detailCard` | `Card \| null` | Carta a ser exibida no modal de detalhes |

Disparado por `executeAction('view-details')` → `setDetailCard(selectedCard.card)`. Consumido por `CardDetailModal`.

### Resultado do Jogo

| Campo | Tipo |
|-------|------|
| `gameResult` | `GameResult \| null` |
| `showResult` | `boolean` |

#### GameResult

| Campo | Tipo |
|-------|------|
| `isVictory` | `boolean` |
| `isDraw` | `boolean` |

### Transporte Remoto

| Campo | Tipo |
|-------|------|
| `isRemoteDuel` | `boolean` |
| `remoteTransportRef` | `{ sendAction, advancePhase } \| null` |

### Painel de Contexto

| Campo | Tipo |
|-------|------|
| `panelMode` | `'idle' \| 'card' \| 'zone' \| 'stack'` |
| `panelData` | `any` |
| `panelLastData` | `any` |

### Instrucao

| Campo | Tipo |
|-------|------|
| `instruction` | `string` |

---

## Card (modelo interno)

Estrutura unificada de carta usada em todo o frontend.

| Campo | Tipo | Origem |
|-------|------|--------|
| `id` | `number` | YGOProDeck (cardId) ou duel-service |
| `name` | `string` | Nome da carta |
| `type` | `string` | Tipo (ex: "Effect Monster", "Spell Card") |
| `atk` | `number \| null` | ATK (monstros) |
| `def` | `number \| null` | DEF (monstros) |
| `level` | `number \| null` | Nivel (monstros) |
| `card_images` | `{ image_url: string }[]` | URLs de imagem |
| `desc` | `string` | Descricao/efeito |

---

## Servicos Externos — Contratos

### auth-service (`:8086`)

| Metodo | Rota | Request | Response |
|--------|------|---------|----------|
| POST | `/auth/login` | `{ username, password }` | `{ accessToken, refreshToken, username, id }` |
| POST | `/auth/register` | `{ username, email, password }` | `{ accessToken, refreshToken, username, id }` |

### duel-service (`:8084`)

| Metodo | Rota | Request | Response |
|--------|------|---------|----------|
| POST | `/api/duels` | `{ playerAId, playerBId, playerADeckId, playerBDeckId }` | `{ duelId }` |
| GET | `/api/duels/{duelId}/state` | — | `{ turn, phase, playerState, opponentState, ... }` |
| WS | `/ws` (STOMP) | — | Topicos: `/topic/duel/{id}`, `/topic/duel/{id}/over` |
| WS | `/app/duel.action` | `{ duelId, actionType, cardId, zoneIndex }` | — |
| WS | `/app/duel.phase` | `{ duelId }` | — |

### deck-service (`:8081`)

| Metodo | Rota | Response |
|--------|------|----------|
| GET | `/decks` | `DeckView[]` (sumario, sem cards) |
| GET | `/decks/{id}/full` | `DeckView` (com cards completos) |

#### DeckView

| Campo | Tipo |
|-------|------|
| `id` | `long` |
| `ownerId` | `string` |
| `name` | `string` |
| `mainDeckSize` | `int` |
| `extraDeckSize` | `int` |
| `sideDeckSize` | `int` |
| `totalCards` | `int` |
| `isValid` | `boolean` |
| `validationErrors` | `string[]` |
| `cards` | `CardSummary[]` |

#### CardSummary

| Campo | Tipo |
|-------|------|
| `cardId` | `long` |
| `name` | `string` |
| `type` | `string` |
| `quantity` | `int` |
| `atk` | `int \| null` |
| `def` | `int \| null` |
| `level` | `int \| null` |
| `imageUrl` | `string` |
| `description` | `string` |

---

## Rotas (react-router-dom)

| Rota | Pagina | Provider necessario |
|------|--------|-------------------|
| `/` | LoginPage | — |
| `/lobby` | LobbyPage | AuthContext |
| `/duel/:duelId` | DuelPage | AuthContext + DuelContext |
| `/duel/local` | DuelPage | AuthContext + DuelContext |

---

## Variaveis de Ambiente

| Variavel | Default | Usado em |
|----------|---------|----------|
| `VITE_DUEL_URL` | `http://localhost:8084` | `duelService.js` |
| `VITE_DUEL_WS_URL` | `http://localhost:8084/ws` | `duelWebSocket.js` |
| `VITE_AUTH_URL` | `http://localhost:8086/auth` | `authService.js` |
| `VITE_DECK_URL` | `http://localhost:8081` | `deckService.js` |

---

## ADRs

| ID | Decisao | Data |
|----|---------|------|
| ADR-001 | Usar YGOProDeck API publica sem chave de API | 2026-04-17 |
| ADR-002 | Proxy CORS via corsproxy.io (provisorio) | 2026-04-17 |
| ADR-003 | react-router-dom v7 com BrowserRouter | 2026-07-07 |
| ADR-004 | DuelProvider dentro do Router, fora de Routes | 2026-07-07 |
| ADR-005 | Fallback silencioso se deck-service offline | 2026-07-07 |
| ADR-006 | `<select>` inline no Lobby em vez de componente separado | 2026-07-07 |
| ADR-007 | IA como hook (`useAiOpponent`) em vez de servico puro | 2026-07-07 |
| ADR-008 | Deteccao de turno por paridade (turn % 2) | 2026-07-07 |
| ADR-009 | IA chama DuelContext diretamente, nao via LocalEngine | 2026-07-07 |
| ADR-010 | `detailCard` no DuelContext em vez de estado local da pagina | 2026-07-07 |
| ADR-011 | Auto-draw via `useEffect` em vez de integrado em `nextPhase` | 2026-07-07 |
