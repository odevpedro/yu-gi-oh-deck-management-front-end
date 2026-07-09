# Backlog — Yu-Gi-Oh Deck Management Front-end

> Registro vivo do progresso do projeto. Atualizado a cada mudanca de estado de uma funcionalidade.
> **Ultima atualizacao:** 2026-07-07 — Sessao de trabalho: WEB-010/022/024/025/026, MOTION-001~008, GAME-004/006/008/009, cardservice, animations, chain, tribute, special summon, useReducer refactor, framer-motion

---

## Sobre o Projeto

Simulador interativo de duelo Yu-Gi-Oh no navegador, com campo de batalha, fases de turno, efeitos visuais Canvas e integracao com ecossistema de microservicos (duel-service, auth-service, deck-service, card-service, community-service).

**Versao atual:** `0.1.0`
**Repositorio:** [github.com/odevpedro/yu-gi-oh-deck-management-front-end](https://github.com/odevpedro/yu-gi-oh-deck-management-front-end)
**Stack principal:** React 18 + Vite 5 + STOMP/SockJS + Canvas 2D + YGOProDeck API

---

## Legenda

| Simbolo | Significado |
|---------|-------------|
| `[ ]`   | Pendente |
| `[~]`   | Em andamento |
| `[x]`   | Concluido |
| `P0`    | Critico — bloqueia outras features |
| `P1`    | Alta prioridade |
| `P2`    | Media prioridade |
| `P3`    | Melhoria / nice-to-have |

---

## Em Andamento

> Nenhuma feature em andamento.

---

## Pendentes

### FASE 0 — MVP Jogavel (FLUXO MINIMO para um duelo funcionar)

**Objetivo:** Um usuario consegue abrir o frontend, fazer login, criar um duelo contra si mesmo (ou modo offline), ver as cartas na mao, jogar uma carta no campo, atacar e ver o duelo terminar.

---

#### `[x]` WEB-000 — Adicionar dependencias STOMP + SockJS

**Descricao:** `@stomp/stompjs` ^7.3.0 e `sockjs-client` ^1.6.1 instalados e em uso em `duelWebSocket.js`.

**Criterio de aceitacao:** `package.json` contem `@stomp/stompjs` e `sockjs-client`. `npm run dev` funciona.

**Estimativa:** XS — Concluido

---

#### `[x]` WEB-001 + WEB-005 — Tela de Login com gerenciamento de JWT

**Descricao:** Criar tela de login/registro que se comunica com o auth-service. Apos login bem-sucedido, armazenar o JWT no `localStorage` e disponibiliza-lo para todas as requisicoes HTTP e WebSocket.

**Onde:** Novo diretorio `src/pages/`, novo arquivo `src/components/LoginPage.jsx`

**Checklist:**

**Login Page:**
- [ ] Criar `src/pages/LoginPage.jsx` com:
  - Abas: Login | Registrar
  - Formulario de login: username + password
  - Formulario de registro: username + email + password + confirm password
  - Botao "Entrar" / "Registrar"
- [ ] Criar `src/services/authService.js`:
  ```javascript
  const API_URL = 'http://localhost:8086/auth';
  
  export async function login(username, password) {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    return res.json(); // { accessToken, refreshToken, username, id }
  }
  
  export async function register(username, email, password) {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) throw new Error('Registration failed');
    return res.json();
  }
  ```

**Token Management:**
- [ ] Criar `src/services/tokenManager.js`:
  ```javascript
  const TOKEN_KEY = 'duel_access_token';
  const REFRESH_KEY = 'duel_refresh_token';
  
  export function getAccessToken() { return localStorage.getItem(TOKEN_KEY); }
  export function getRefreshToken() { return localStorage.getItem(REFRESH_KEY); }
  
  export function setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
  
  export function clearTokens() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
  ```

**Auth Context:**
- [ ] Criar `src/contexts/AuthContext.jsx`:
  ```jsx
  const AuthContext = createContext();
  
  export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      const token = getAccessToken();
      if (token) {
        // Decodificar JWT basico para extrair username
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ username: payload.sub, id: payload.userId });
      }
      setLoading(false);
    }, []);
    
    async function handleLogin(username, password) {
      const data = await login(username, password);
      setTokens(data.accessToken, data.refreshToken);
      setUser({ username: data.username, id: data.id });
    }
    
    function handleLogout() {
      clearTokens();
      setUser(null);
    }
    
    return (
      <AuthContext.Provider value={{ user, loading, login: handleLogin, logout: handleLogout }}>
        {children}
      </AuthContext.Provider>
    );
  }
  ```

**App Flow:**
- [ ] Modificar `src/App.jsx`:
  ```jsx
  function App() {
    return (
      <AuthProvider>
        <DuelProvider>
          <AppContent />
        </DuelProvider>
      </AuthProvider>
    );
  }
  
  function AppContent() {
    const { user, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    if (!user) return <LoginPage />;
    return <DuelApp />;
  }
  ```

**Estilos:**
- [ ] Criar `src/styles/login.css` com tema escuro Yu-Gi-Oh!

**Criterio de aceitacao:** Usuario consegue se registrar, fazer login, e o token fica disponivel para o resto da aplicacao.

**Depende de:** WEB-000

**Estimativa:** M — Concluido

---

#### `[x]` WEB-002 — Implementar WebSocketEngine (STOMP)

**Descricao:** Criar `WebSocketEngine` que implementa o contrato `DuelEngineAdapter` e se conecta ao duel-service via STOMP WebSocket para enviar/receber acoes do duelo em tempo real.

**Onde:** `src/engine/WebSocketEngine.js`, `src/services/duelWebSocket.js`

**Checklist:**

**Cliente STOMP:**
- [ ] Criar `src/services/duelWebSocket.js`:
  ```javascript
  import { Client } from '@stomp/stompjs';
  import SockJS from 'sockjs-client';
  
  export function createDuelClient(duelId, token, onStateUpdate, onGameOver) {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8084/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      onConnect: () => {
        // Inscrever no topico de estado do duelo
        client.subscribe(`/topic/duel/${duelId}`, (message) => {
          const state = JSON.parse(message.body);
          onStateUpdate(state);
        });
        
        // Inscrever no topico de fim de duelo
        client.subscribe(`/topic/duel/${duelId}/over`, (message) => {
          const winnerId = JSON.parse(message.body);
          onGameOver(winnerId);
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame.headers.message);
      },
    });
    
    client.activate();
    return client;
  }
  
  export function sendAction(client, action) {
    client.publish({
      destination: '/app/duel.action',
      body: JSON.stringify(action),
    });
  }
  
  export function advancePhase(client, duelId) {
    client.publish({
      destination: '/app/duel.phase',
      body: JSON.stringify({ duelId }),
    });
  }
  ```

**WebSocketEngine:**
- [ ] Criar `src/engine/WebSocketEngine.js` implementando o contrato de `DuelEngineAdapter`:
  ```javascript
  import { createDuelClient, sendAction, advancePhase } from '../services/duelWebSocket';
  
  export class WebSocketEngine {
    constructor(duelId, token) {
      this.duelId = duelId;
      this.client = null;
      this.onStateUpdate = null;
      this.onGameOver = null;
    }
    
    connect(onStateUpdate, onGameOver) {
      this.onStateUpdate = onStateUpdate;
      this.onGameOver = onGameOver;
      this.client = createDuelClient(this.duelId, token, onStateUpdate, onGameOver);
    }
    
    disconnect() {
      if (this.client) this.client.deactivate();
    }
    
    summon(cardId, zoneIndex) {
      sendAction(this.client, {
        duelId: this.duelId,
        actionType: 'SUMMON',
        cardId,
        zoneIndex,
      });
    }
    
    attack(attackerCardId, targetCardId) {
      sendAction(this.client, {
        duelId: this.duelId,
        actionType: 'ATTACK',
        cardId: attackerCardId,
        targetId: targetCardId,
      });
    }
    
    activateSpell(cardId) {
      sendAction(this.client, {
        duelId: this.duelId,
        actionType: 'SPELL',
        cardId,
      });
    }
    
    advancePhase() {
      advancePhase(this.client, this.duelId);
    }
  }
  ```

**Factory:**
- [ ] Modificar `src/engine/index.js` para suportar troca de engine:
  ```javascript
  import { LocalEngine } from './LocalEngine';
  import { WebSocketEngine } from './WebSocketEngine';
  
  let currentEngine = null;
  
  export function createLocalEngine() {
    currentEngine = new LocalEngine();
    return currentEngine;
  }
  
  export function createWebSocketEngine(duelId, token) {
    currentEngine = new WebSocketEngine(duelId, token);
    return currentEngine;
  }
  
  export function getEngine() {
    return currentEngine;
  }
  ```

**Integracao com DuelContext:**
- [ ] Modificar `DuelContext.jsx` para usar a engine configurada (local ou WebSocket)
- [ ] Adicionar funcao `setEngine(engine)` no contexto
- [ ] Quando o estado chega via WebSocket, atualizar o estado global do duelo

**Criterio de aceitacao:** Frontend conecta no WebSocket do duel-service, recebe o estado inicial e consegue enviar acoes.

**Depende de:** WEB-000, Fase 0 do duel-service (BUG-002, BUG-003, BUG-004), GAME-001 (setup inicial)

**Estimativa:** L — Concluido

---

#### `[x]` WEB-006 — Tela de Lobby / Criar Duelo

**Descricao:** Tela principal apos o login onde o usuario pode ver seus decks e criar um duelo rapido (local ou contra si mesmo para testes).

**Onde:** `src/pages/LobbyPage.jsx`

**Checklist:**

**Listar Decks:**
- [ ] Criar `src/services/deckService.js`:
  ```javascript
  import { getAccessToken } from './tokenManager';
  
  const DECK_API = 'http://localhost:8081/decks';
  
  export async function listDecks() {
    const res = await fetch(DECK_API, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    return res.json();
  }
  ```

**Lobby Page:**
- [ ] Criar `src/pages/LobbyPage.jsx` com:
  - Saudacao: "Bem-vindo, {username}"
  - Lista de decks do usuario (nome, tamanho, validacao)
  - Botoes para cada deck: "Novo Duelo (Local)" e "Novo Duelo (Online)"
  - Secao "Duelos Recentes" (historico)

**Fluxo "Duelo Local" (para testes):**
- [ ] Botao "Novo Duelo Local" → cria dois jogadores virtuais
- [ ] Chama `POST /api/duels` no duel-service com `playerAId={userId}`, `playerBId="ai-opponent"`
- [ ] Retorna `duelId` → navega para `/duel/{duelId}`

**Fluxo "Duelo Online":**
- [ ] Botao "Novo Duelo Online" → mostra modal para inserir `playerBId`
- [ ] Chama `POST /api/duels` com ambos os IDs
- [ ] Navega para `/duel/{duelId}`
- [ ] Conecta WebSocket com `WebSocketEngine`

**Navegacao:**
- [ ] Adicionar `react-router-dom`:
  ```bash
  npm install react-router-dom
  ```
- [ ] Criar rotas em `App.jsx`:
  ```jsx
  <Routes>
    <Route path="/" element={<LoginPage />} />
    <Route path="/lobby" element={<LobbyPage />} />
    <Route path="/duel/:duelId" element={<DuelPage />} />
  </Routes>
  ```

**DuelPage:**
- [ ] Criar `src/pages/DuelPage.jsx` que renderiza o `DuelField` e conecta a engine apropriada
- [ ] Extrair `duelId` da URL com `useParams()`
- [ ] Se for duelo local, usar `LocalEngine`
- [ ] Se for duelo online, usar `WebSocketEngine(duelId, token)`

**Criterio de aceitacao:** Usuario ve seus decks, cria um duelo, e e redirecionado para o campo de batalha.

**Depende de:** WEB-001 (login), WEB-002 (WebSocket), deck-service online

**Estimativa:** XL — Concluido (sem integracao com deck-service, apenas input manual de deckId)

---

#### `[x]` WEB-008 — Tela de Resultado de Duelo

**Descricao:** Quando o duelo termina (recebe evento `/topic/duel/{id}/over`), exibir tela de resultado com informacoes do vencedor, LP finais e botoes para voltar ao lobby.

**Onde:** `src/components/ResultScreen.jsx`

**Checklist:**
- [ ] Criar `src/components/ResultScreen.jsx`:
  - Nome do vencedor
  - LP finais de cada jogador
  - Numero de turnos
  - Duracao do duelo
  - Botoes: "Voltar ao Lobby", "Ver Historico"
- [ ] Integrar com `DuelContext` para detectar `status === FINISHED`
- [ ] Estilo: overlay escuro com gradiente dourado/vermelho

**Criterio de aceitacao:** Ao fim do duelo, a tela de resultado aparece com as informacoes corretas.

**Depende de:** WEB-002 (WebSocket para receber game over)

**Estimativa:** M — Concluido

---

#### `[x]` WEB-018 — Sistema de notificacoes (Toast)

**Descricao:** Sistema de notificacoes temporarias via `ToastContext` com 4 tipos (success, error, warning, info) e auto-dismiss. Usado para feedback de acoes e erros.

**Arquivos:** `src/contexts/ToastContext.jsx`, estilos em `duel-field.css`

**Criterio de aceitacao:** Qualquer componente pode chamar `showToast(message, type)` e uma notificacao aparece no canto superior direito.

**Estimativa:** M — Concluido

---

#### `[x]` WEB-003 — Remover arquivos duplicados

**Descricao:** Removidos `src/fx/effects/LocalEngine.js` e `src/fx/effects/FXManager.js` — duplicatas de `src/engine/LocalEngine.js` e `src/fx/FXManager.js`.

**Estimativa:** XS — Concluido

---

### FASE 1 — Ciclo de Duelo Completo (multiplayer real)

---

#### `[ ]` WEB-006b — Matchmaking: ver jogadores proximos e desafiar

**Descricao:** Consumir `GET /players/nearby` do community-service para listar jogadores proximos e enviar desafios.

**Checklist:**
- [ ] Criar `src/services/communityService.js`:
  ```javascript
  export async function getNearbyPlayers(lat, lng, radiusKm = 10) {
    const res = await fetch(
      `${COMMUNITY_API}/players/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`,
      { headers: { Authorization: `Bearer ${getAccessToken()}` } }
    );
    return res.json();
  }
  
  export async function sendChallenge(targetId, challengerDeckId) {
    const res = await fetch(`${COMMUNITY_API}/challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
      body: JSON.stringify({ targetId, challengerDeckId }),
    });
    return res.json();
  }
  
  export async function acceptChallenge(challengeId, targetDeckId) {
    const res = await fetch(`${COMMUNITY_API}/challenges/${challengeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
      body: JSON.stringify({ action: 'ACCEPT', targetDeckId }),
    });
    return res.json();
  }
  ```
- [ ] Exibir lista de jogadores disponiveis no lobby
- [ ] Botao "Desafiar" que abre modal de selecao de deck
- [ ] Aba "Desafios Pendentes" com botoes Aceitar/Recusar

**Estimativa:** XL

---

#### `[x]` WEB-007 — Selecao de Deck

**Descricao:** Selecao de deck integrada ao lobby via `<select>` com fallback para deck demo.

**Checklist:**
- [x] Criar `src/services/deckService.js` com `listDecks()` consumindo `GET /decks`
- [x] LobbyPage carrega decks do usuario autenticado via deck-service (:8081)
- [x] `<select>` mostra nome + tamanho (main/extra) de cada deck
- [x] Opcao "Deck padrao (demo)" quando deck-service offline ou usuario local
- [x] Fallback silencioso: se deck-service falha, cria duelo sem deckId (demo no backend)

**Estimativa:** M — Concluido

---

#### `[x]` WEB-009 — HistoryPage: página de histórico filtrada por jogador (src/pages/HistoryPage.jsx)

**Descricao:** Tela que lista duelos anteriores com filtro por jogador.

**Checklist:**
- [ ] Criar `src/pages/HistoryPage.jsx`
- [ ] Consumir `GET /api/duels/history` e `GET /api/duels/history/player/{id}` do duel-service
- [ ] Exibir tabela: data, oponente, resultado (vitoria/derrota), turnos, duracao
- [ ] Clicar em um duelo abre detalhes

**Estimativa:** M

---

#### `[x]` WEB-010 — cardService.js com fallback YGOPro API (src/services/cardService.js)

**Descricao:** Substituir dados mockados por dados reais vindos do card-service ou YGOPRODeck API.

**Checklist:**
- [ ] Criar `src/services/cardService.js`:
  ```javascript
  const CARD_API = 'http://localhost:8080/cards';
  
  export async function searchCards(name) {
    const res = await fetch(`${CARD_API}?name=${encodeURIComponent(name)}`);
    return res.json();
  }
  ```
- [ ] Quando o estado do duelo chegar (via WebSocket ou local), buscar dados das cartas
- [ ] Usar `imageUrl` real em vez de placeholder
- [ ] Cache local das cartas ja buscadas (Map<cardId, cardData>)

**Estimativa:** L

---

### Feature Avancadas — UX e Confiabilidade

---

#### `[x]` WEB-011 — Reconexão automática WebSocket: até 10 tentativas, delay 2s, handler onWebSocketClose

**Descricao:** Se a conexao STOMP cair, reconectar automaticamente com backoff exponencial sem perder o estado.

**Onde:** `src/services/duelWebSocket.js`

**Checklist:**
- [ ] Configurar `reconnectDelay` no `Client` do STOMP: iniciar com 1s, duplicar ate 30s
- [ ] Ao reconectar, re-inscrever nos topicos `/topic/duel/{id}` e `/topic/duel/{id}/over`
- [ ] Chamar `GET /api/duels/{duelId}/state` para resync do estado (ver SEC-005 no duel-service)
- [ ] Exibir indicador "Reconectando..." no HUD durante a tentativa
- [ ] Apos 5 tentativas falhas, exibir "Conexao perdida" e botao "Tentar novamente"

**Estimativa:** M

---

#### `[x]` WEB-012 — Botao de conceder (Concede/Surrender)

**Descricao:** Jogador pode desistir do duelo a qualquer momento.

**Onde:** `src/components/HUD.jsx`

**Checklist:**
- [x] Botao "CONCEDER" no HUD (canto esquerdo)
- [x] Modal de confirmacao: "CONCEDER DUELO?" com botoes CONCEDER / CANCELAR
- [x] Ao confirmar: `setGameResult({ isVictory: false })` + `setShowResult(true)` + `setInstruction('VOCE CONCEDEU')`
- [x] Estilo tematico escuro com overlay

**Estimativa:** S — Concluido

---

#### `[x]` WEB-013 — Loading spinner / skeleton enquanto conecta

**Descricao:** Feedback visual enquanto carrega.

**Checklist:**
- [x] Criar `src/components/LoadingSpinner.jsx` — anel duplo girando (ouro + azul)
- [x] Usado em: `ProtectedRoute` ("AUTENTICANDO..."), `LobbyPage` ("CARREGANDO DECKS...")
- [x] CSS animado com keyframe `spin`

**Estimativa:** S — Concluido

---

#### `[x]` WEB-014 — DuelLog: painel colapsável com entradas timestamped (src/components/DuelLog.jsx)

**Descricao:** Painel rolavel com historico de todas as acoes do duelo (ex: "Jogador A invocou Dark Magician", "Jogador B atacou com Blue-Eyes").

**Onde:** `src/components/DuelLog.jsx`

**Checklist:**
- [ ] Criar `src/components/DuelLog.jsx` — lista vertical rolavel no canto da tela
- [ ] Cada linha: timestamp compacto + descricao da acao
- [ ] Cores: azul para o jogador, vermelho para o oponente
- [ ] Rolar automaticamente para a ultima acao
- [ ] Integrar com `DuelContext` para escutar acoes e adicionar ao log
- [ ] Manter ultimas 100 acoes em memoria (rotacionar)

**Estimativa:** M

---

#### `[x]` WEB-015 — Zona de banimento no campo + estado em DuelContext

**Descricao:** O campo de duelo nao tem zona de banimento. Cartas banidas nao aparecem.

**Onde:** `src/components/DuelField.jsx`

**Checklist:**
- [ ] Adicionar zona "Banidos" ao lado do cemiterio em cada lado do campo
- [ ] Exibir cartas banidas em miniatura vertical
- [ ] Tooltip com nome ao hover

**Estimativa:** S

---

#### `[x]` WEB-016 — Extra deck count: label "EXTRA (0)" nas zonas extra deck

**Descricao:** O Extra Deck (Fusao, Sincronia, XYZ, Link) precisa de representacao visual ao lado do deck principal.

**Onde:** `src/components/DuelField.jsx`

**Checklist:**
- [ ] Adicionar zona "Extra Deck" ao lado do deck principal
- [ ] Exibir contador: "15/15" ou "8/15"
- [ ] Ao clicar, abrir modal com as cartas do extra deck
- [ ] Cartas em posicao face-down (verso) ate serem invocadas

**Estimativa:** S

---

#### `[ ]` WEB-017 — Tela de side deck entre partidas (Match)

**Descricao:** Em formato melhor de 3, entre as partidas o jogador pode trocar ate 15 cartas entre main deck e side deck.

**Onde:** `src/components/SideDeckModal.jsx`

**Checklist:**
- [ ] Criar modal que mostra Main Deck, Extra Deck e Side Deck lado a lado
- [ ] Arrastar cartas entre as zonas para trocar
- [ ] Validar: max 15 cartas trocadas, main deck continua 40-60 apos troca
- [ ] Confirmar troca → enviar para o servidor antes da proxima partida

**Nota:** Implementar apenas apos suporte a side deck no backend (GAME-006E).

**Estimativa:** L

---

#### `[ ]` WEB-018 — Sistema de notificacoes (Toast)

**Descricao:** Sem feedback de erros/sucessos, o usuario nao sabe se uma acao foi rejeitada ou se algo deu errado.

**Checklist:**
- [ ] Criar `src/components/Toast.jsx` — notificacao temporaria no canto superior direito
- [ ] Types: success (verde), error (vermelho), warning (amarelo), info (azul)
- [ ] Auto-dismiss apos 4s (click para fechar antes)
- [ ] Criar ToastContext para disparar de qualquer lugar:
  ```jsx
  const { showToast } = useToast();
  showToast('Deck invalido!', 'error');
  ```
- [ ] Usar em: erro de login, acao rejeitada, conexao perdida, duelo encontrado, etc.

**Estimativa:** M

---

#### `[x]` WEB-019 — Modal de detalhe da carta

**Descricao:** Clicar em "View Details" abre modal com arte em tamanho grande, nome, efeito, ATK/DEF/Level.

**Onde:** `src/components/CardDetailModal.jsx`

**Checklist:**
- [x] Criar `src/components/CardDetailModal.jsx` com portal para `document.body`
- [x] Arte da carta em alta resolucao (imageUrl)
- [x] Nome, tipo (Monstro/Magia/Armadilha), level/stars
- [x] Descricao do efeito (texto completo via `desc` ou `description`)
- [x] ATK/DEF (se monstro)
- [x] Fechar com clique fora ou ESC
- [x] Disparado via `executeAction('view-details')` que seta `setDetailCard`
- [x] CSS em `card-context-menu.css` com tema escuro

**Estimativa:** M — Concluido

---

#### `[x]` WEB-020 — Turn timer: 60s countdown, warning visual aos 10s

**Descricao:** Cada jogador tem um limite de tempo por turno (ex: 180s). Um relogio visivel adiciona pressao e公平.

**Onde:** `src/components/HUD.jsx`

**Checklist:**
- [ ] Relogio regressivo visivel no HUD ao lado do nome do jogador ativo
- [ ] Quando chega a 30s, piscar vermelho
- [ ] Quando chega a 0, passar automaticamente para END phase (ou conceder)
- [ ] Configuravel via props/estado do duelo

**Estimativa:** M

---

#### `[x]` WEB-021 — Pagina 404

**Descricao:** Rotas inexistentes mostram pagina amigavel.

**Checklist:**
- [x] Criar `src/pages/NotFoundPage.jsx` com "404 — DUELO NAO ENCONTRADO" + botao "VOLTAR AO LOBBY"
- [x] Rota `*` no App.jsx aponta para NotFoundPage

**Estimativa:** XS — Concluido

---

#### `[ ]` WEB-022 — Variaveis de ambiente (.env)

**Descricao:** URLs dos servicos estao hardcoded. Precisa ser via `.env` para diferentes ambientes (localhost, staging, producao).

**Checklist:**
- [ ] Criar `.env` e `.env.example`:
  ```
  VITE_AUTH_API_URL=http://localhost:8086/auth
  VITE_DECK_API_URL=http://localhost:8081/decks
  VITE_DUEL_API_URL=http://localhost:8084
  VITE_CARD_API_URL=http://localhost:8080/cards
  VITE_COMMUNITY_API_URL=http://localhost:8087
  VITE_WS_URL=http://localhost:8084/ws
  ```
- [ ] `tokenManager.js` e servicos usarem `import.meta.env.VITE_*`

**Estimativa:** S

---

#### `[ ]` WEB-023 — Chat entre jogadores

**Descricao:** Jogadores devem poder conversar durante o duelo.

**Onde:** `src/components/ChatPanel.jsx`, canal STOMP `/topic/duel/{id}/chat`

**Checklist:**
- [ ] Canal STOMP dedicado `/topic/duel/{id}/chat` para mensagens
- [ ] Input de texto + enviar com Enter
- [ ] Historico de mensagens rolavel
- [ ] Opcional: mensagens pre-definidas ("Good luck!", "Nice play!", "GG")

**Estimativa:** M

---

#### `[ ]` WEB-024 — Drag feedback (sombra + highlight de zona)

**Descricao:** Ao arrastar uma carta, mostrar sombra seguindo o cursor e destacar zonas validas para drop.

**Onde:** `src/components/CardWrap.jsx`, `src/components/Zone.jsx`

**Checklist:**
- [ ] Enquanto arrasta, carta tem `box-shadow` aumentado e `scale(1.05)`
- [ ] Zonas onde a carta pode ser dropada ganham borda verde pulsante
- [ ] Zonas invalidas ficam com opacidade reduzida
- [ ] Se soltar fora de zona valida, carta volta para posicao original com animacao

**Estimativa:** M

---

#### `[ ]` WEB-025 — Responsividade basica

**Descricao:** O campo de duelo nao se adapta a diferentes tamanhos de tela.

**Checklist:**
- [ ] Container principal usa `clamp()` ou `vw` para escalar
- [ ] Breakpoints: >=1200px (desktop), >=768px (tablet), <768px (mobile)
- [ ] Mobile: modo paisagem obrigatorio (detectar e orientar usuario)
- [ ] Cartas e zonas redimensionam proporcionalmente

**Estimativa:** L

---

#### `[ ]` WEB-026 — Cache local de cartas (IndexedDB/lokijs)

**Descricao:** Buscar dados de cartas repetidamente e custoso. Armazenar em cache local.

**Checklist:**
- [ ] Ao receber carta nova, salvar `{ cardId, name, atk, def, type, imageUrl, description }` no `localStorage`
- [ ] Antes de buscar na API, verificar cache
- [ ] Limpar cache a cada 24h ou botao "Recarregar dados"

**Estimativa:** S

---

#### `[ ]` WEB-027 — Gestao de estado offline (Service Worker)

**Descricao:** Se a internet cair durante o duelo, o frontend deve manter o estado visivel ate reconectar.

**Checklist:**
- [ ] Detectar `navigator.onLine === false` → exibir "Conexao perdida" no HUD
- [ ] Nao limpar o estado do duelo ao desconectar
- [ ] Ao reconectar, chamar resync (WEB-011)
- [ ] Opcional: Service Worker para cache de assets estaticos

**Estimativa:** M

---

### Jogabilidade (melhorias na engine local)

---

#### `[x]` GAME-001 — IA de oponente

**Descricao:** Logica de turno automatico para o lado adversario quando jogando localmente.

**Checklist:**
- [x] Estado do oponente: `opponentHand`, `opponentDeckCards`, `opponentDeckRemaining` em DuelContext
- [x] `initOpponent()` — deck de 20 cartas + 5 cartas iniciais na mao (tudo numa unica chamada)
- [x] `useAiOpponent()` hook reage a `turn` + `phase`
- [x] Fase DRAW: comprar carta
- [x] Fase MAIN_1: invocar o primeiro monstro viavel da mao
- [x] Fase BATTLE: atacar com o monstro mais forte contra o mais fraco do oponente
- [x] Fase MAIN_2: baixar magia/armadilha se disponivel
- [x] Fase END: passar turno
- [x] Game over detection: `useEffect` em DuelContext que detecta LP <= 0
- [x] Delays de 1s entre acoes da IA para feedback visual
- [x] Fallback: deck gerado localmente se YGOProDeck falhar
- [ ] Melhorias futuras: IA baseada em prioridade de carta, posicao de defesa

**Estimativa:** XL — Concluido

---

#### `[x]` GAME-002 — Validacao completa de regras

**Descricao:** Implementar validacao de regras do Yu-Gi-Oh! na engine local.

**Checklist:**
- [x] Limite de 1 invocacao normal por turno (ja existia via `normalSummonedThisTurn`)
- [x] Nao pode invocar monstro em zona ocupada (ja existia)
- [x] Nao pode atacar no primeiro turno (turno 1 bloqueado em `actionResolver`)
- [x] Monstro em posicao de defesa nao pode atacar (ja existia — `isFaceDown` check)
- [x] Ataque direto so quando oponente nao tem monstros (validado em `LocalEngine.handleAttackTarget`)

**Estimativa:** M — Concluido

---

#### `[x]` GAME-003 — Posicao de defesa

**Descricao:** Suporte a colocar cartas em posicao de defesa (face-up e face-down).

**Checklist:**
- [x] Botao de contexto: "Change Position" ja existia no ActionBar/CardContextMenu
- [x] Carta em defesa face-down: exibir verso (ja existia)
- [x] Carta em defesa face-up: exibir vertical / rotacao CSS (ja existia — `rotate(90deg)`)
- [x] Ao atacar carta em defesa, comparar ATK do atacante com DEF do defensor (ja existia em `LocalEngine._resolveBattle`)
- [x] Carta virada para baixo e revelada ao ser atacada (adicionado em `LocalEngine.handleAttackTarget`)

**Estimativa:** M — Concluido

---

#### `[x]` GAME-004 — Limite dinamico de deck

**Descricao:** Implementado — nao ha constante hardcoded de 20 cartas. `deckRemaining.length` e usado dinamicamente.

**Estimativa:** S — Concluido

---

#### `[x]` GAME-005 — Animacao de dano no LP

**Descricao:** Animacao no valor do Life Points quando sofre dano.

**Checklist:**
- [x] Efeito de flash no numero do LP (scale animado + mudanca de cor)
- [x] Cor vermelha quando leva dano (`lp-flash-down`), verde quando ganha (`lp-flash-up`)
- [x] Classes CSS animadas: `lpFlash` keyframe com scale 1.3 → 1.0

**Estimativa:** M — Concluido

---

#### `[x]` GAME-007 — Compra automatica na DRAW Phase

**Descricao:** Ao iniciar a fase DRAW, a carta do topo do deck e automaticamente adicionada a mao.

**Checklist:**
- [x] `useEffect` em `DuelContext` detecta mudanca de `phase.id` para 'DRAW' com `drawnThisTurn === false`
- [x] Chama `drawFromDeck()` automaticamente → remove do deck, adiciona a mao, marca `drawnThisTurn = true`
- [x] Instrucao "CARTA COMPRADA" exibida momentaneamente
- [x] So funciona em modo local (`!isRemoteDuel`)

**Criterio de aceitacao:** Toda DRAW Phase compra uma carta automaticamente.

**Estimativa:** S — Concluido

---

### Motion Design & Onboarding

---

#### `[x]` MOTION-001 — Animar zonas vazias com Framer Motion (Zone.jsx motion.div)

**Descricao:** Instalar `framer-motion` como biblioteca principal de animacoes para transicoes entre paginas, onboarding, e efeitos no campo de duelo.

**Checklist:**
- [ ] Executar `npm install framer-motion`
- [ ] Verificar que `package.json` contem `framer-motion`

**Estimativa:** XS

---

#### `[ ]` MOTION-002 — Tela de Onboarding Tutorial

**Descricao:** Criar rota `/onboarding` com um tutorial interativo em steps para novos usuarios aprenderem a jogar. Deve aparecer automaticamente no primeiro login do usuario.

**Onde:** `src/pages/OnboardingPage.jsx`, `src/components/OnboardingStep.jsx`

**Checklist:**
- [ ] Criar `src/pages/OnboardingPage.jsx` com `AnimatePresence` do framer-motion para transicoes entre steps
- [ ] Steps do tutorial:
  - Step 1: "Bem-vindo ao Duelo de Yu-Gi-Oh!" — visao geral com fade-in
  - Step 2: "O Campo" — highlight nas zonas (monstro, magia, cemiterio) com zoom animado
  - Step 3: "Suas Cartas" — animacao de cartas saindo do deck para a mao
  - Step 4: "Fases do Turno" — ciclo DRAW → MAIN1 → BATTLE → MAIN2 → END com setas animadas
  - Step 5: "Invocar Monstro" — demonstracao animada de drag-drop da mao para zona
  - Step 6: "Atacar" — animacao de seta de ataque entre dois monstros
  - Step 7: "Good Luck!" — ultimo step com botao "Ir para o Lobby"
- [ ] Indicador de progresso (step 3/7) com bolinhas animadas
- [ ] Botoes "Anterior" / "Proximo" com transicao slide
- [ ] Botao "Pular Tutorial" que leva direto ao lobby
- [ ] Salvar flag `onboardingComplete` no localStorage para nao repetir
- [ ] Em `AuthContext`, apos primeiro login: redirecionar para `/onboarding` se `!onboardingComplete`
- [ ] Estilo Yu-Gi-Oh! tematico com gradientes roxo/dourado

**Animacoes (framer-motion):**
```jsx
<motion.div
  initial={{ opacity: 0, x: 100 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -100 }}
  transition={{ type: "spring", stiffness: 300, damping: 30 }}
>
```

**Criterio de aceitacao:** Novo usuario ve o tutorial uma vez ao logar, consegue passar pelos steps, e ao final e redirecionado ao lobby.

**Depende de:** WEB-001 (login funcionando), MOTION-001

**Estimativa:** L

---

#### `[ ]` MOTION-003 — Animacoes de transicao entre paginas

**Descricao:** Adicionar transicoes animadas entre as rotas da aplicacao (login → lobby → duelo → resultado) usando `AnimatePresence` do framer-motion.

**Onde:** `src/App.jsx` (componente de rotas)

**Checklist:**
- [ ] Envolver `<Routes>` com `<AnimatePresence mode="wait">`
- [ ] Cada pagina wrapper com `motion.div`:
  ```jsx
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };
  ```
- [ ] Login → Lobby: fade-in com Y
- [ ] Lobby → Duelo: scale-up suave (simula "entrar no campo")
- [ ] Duelo → Resultado: overlay que escurece e revela resultado com fade-up

**Estimativa:** M

---

#### `[ ]` MOTION-004 — Efeitos glow e highlight em cartas jogaveis

**Descricao:** Cartas que podem ser jogadas na fase atual devem ter efeito de glow pulsante para indicar ao usuario que sao acoes disponiveis.

**Onde:** `src/components/CardWrap.jsx`, `src/components/PlayerHand.jsx`

**Checklist:**
- [ ] Quando fase for MAIN_1/MAIN_2, monstros na mao ganham glow verde pulsante (`box-shadow` animado)
- [ ] Magias viaveis ganham glow azul
- [ ] Cartas sem acao disponivel ficam com opacidade reduzida (0.6)
- [ ] Usar `motion.div` com `animate={{ boxShadow: [...] }}` para pulsar
- [ ] Na BATTLE Phase, monstros do campo que podem atacar ganham glow vermelho

**Estimativa:** S

---

#### `[ ]` MOTION-005 — Screen shake em dano grande

**Descricao:** Quando um jogador sofre dano >= 2000, a tela treme levemente para dar impacto.

**Onde:** `src/components/DuelField.jsx` ou hook `useScreenShake`

**Checklist:**
- [ ] Criar hook `useScreenShake(trigger, intensity = 5)`:
  ```jsx
  export function useScreenShake(trigger, intensity = 5) {
    const shake = useCallback(() => {
      const el = document.getElementById('duel-field');
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = `shake ${0.3}s ease-in-out`;
    }, []);
    
    useEffect(() => { if (trigger) shake(); }, [trigger]);
  }
  ```
- [ ] CSS keyframe:
  ```css
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 50%, 90% { transform: translateX(-${intensity}px); }
    30%, 70% { transform: translateX(${intensity}px); }
  }
  ```
- [ ] Acionar quando `lifePoints` do player muda e `delta >= 2000`

**Estimativa:** S

---

#### `[ ]` MOTION-006 — Particulas de vitoria/derrota

**Descricao:** Ao fim do duelo, overlay com particulas: confetes dourados para vitoria, fragmentos escuros para derrota.

**Onde:** `src/components/ResultScreen.jsx`

**Checklist:**
- [ ] Usar Canvas 2D (reaproveitar `fx/FXManager.js`) para gerar particulas
- [ ] Vitoria: particulas douradas caindo (confetes)
- [ ] Derrota: particulas cinza escuro dissipando
- [ ] Animacao de 2 segundos, depois mostra o resultado

**Depende de:** WEB-008 (ResultScreen), MOTION-001

**Estimativa:** M

---

#### `[ ]` MOTION-007 — Animacao de virar carta (face-up / face-down)

**Descricao:** Quando uma carta e colocada em posicao de defesa face-down, animacao de virar (flip 3D CSS).

**Onde:** `src/components/CardWrap.jsx`

**Checklist:**
- [ ] Usar CSS `perspective` + `rotateY(180deg)` com `transition: transform 0.4s`
- [ ] Frente: arte da carta
- [ ] Verso: `card-back.png`
- [ ] Quando `position === DEFENSE_FACE_DOWN`, aplicar `rotateY(180deg)`

**Estimativa:** S

---

#### `[x]` MOTION-008 — Transição de fases melhorada com AnimatePresence (PhaseOverlay.jsx)

**Descricao:** Melhorar o `PhaseOverlay` existente com animacoes mais ricas usando framer-motion.

**Onde:** `src/components/PhaseOverlay.jsx`

**Checklist:**
- [ ] Substituir CSS transition simples por `motion.div` com:
  - Nome da fase animado com scale + fade
  - Icone da fase (espada para BATTLE, carta para DRAW, etc.)
  - Background gradiente que muda de cor por fase
  - `AnimatePresence` para entrada e saida suave

**Estimativa:** S

---

### Qualidade & Polimento

---

#### `[x]` QLT-001 — Error Boundaries

**Checklist:**
- [ ] Criar `ErrorBoundary.jsx` que captura erros dos componentes filhos
- [ ] Exibir mensagem amigavel em vez de tela branca
- [ ] Botao "Recarregar" que da refresh na pagina

**Estimativa:** M

---

#### `[x]` QLT-002 — Tratamento de falha de API

**Checklist:**
- [ ] Criar `src/services/apiClient.js` com interceptors:
  - Se response for 401, redirecionar para login
  - Se response for 5xx, mostrar toast de erro
  - Timeout de 10s
- [ ] Usar `apiClient` em todos os servicos

**Estimativa:** M

---

#### `[x]` QLT-003 — Roteamento com react-router-dom

**Checklist:**
- [x] Instalar `react-router-dom` (v7.5.0)
- [x] Rotas definidas:
  - `/` → LoginPage (publica, redireciona para `/lobby` se logado)
  - `/lobby` → LobbyPage (protegida)
  - `/duel/:duelId` → DuelPage (protegida)
  - `/duel/local` → DuelPage modo local (protegida)
  - `*` → redirect para `/`
- [x] Componente `ProtectedRoute` com `requireAuth` (true/false)
- [x] DuelPage extraido do antigo DuelApp, usa `useParams()` + `useNavigate()`
- [x] LobbyPage migrado de callbacks para `useNavigate()`
- [x] ResultScreen aceita `onBack` em vez de `window.location.reload()`
- [x] LoginPage navega para `/duel/local` ao clicar "Modo local"

**Estimativa:** M — Concluido

---

#### `[x]` QLT-004 — Remover Three.js do index.html

**Checklist:**
- [x] Removido `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` do `index.html`

**Estimativa:** XS — Concluido

---

#### `[ ]` QLT-005 — Cleanup de animationFrame e setTimeout

**Checklist:**
- [ ] Revisar `useEffect` em todos os componentes
- [ ] Garantir que todo `setTimeout`/`setInterval`/`requestAnimationFrame` e limpo no cleanup
- [ ] Usar `useRef` para armazenar IDs de timers

**Estimativa:** M

---

#### `[x]` QLT-006 — Suíte de testes Vitest: 28 testes (actionResolver 17, cardHelpers 11)

**Checklist:**
- [ ] Configurar Vitest (já incluso no Vite)
- [ ] Testar: `DuelContext` (acoes, fases, estados)
- [ ] Testar: `LocalEngine` (summon, attack)
- [ ] Testar: `actionResolver` (permissoes por fase)
- [ ] Testar: `authService`, `tokenManager`

**Estimativa:** L

---

#### `[ ]` QLT-007 — Acessibilidade (a11y)

**Checklist:**
- [ ] ARIA labels nos botoes de acao
- [ ] Navegacao por teclado (Tab, Enter, Escape)
- [ ] Foco visivel em elementos interativos

**Estimativa:** S

---

#### `[x]` QLT-008 — Arquivar POC vanilla JS

**Checklist:**
- [x] Movidos para `legacy/`: `poc-duel-field.html`, `deck-system.js`, `duel-field.css`, `duel-field.js`, `turn-system.js`, `context-panel.css`, `context-panel.js`, `card-back.png`
- [x] README atualizado com novo caminho

**Estimativa:** XS — Concluido

---

### UX & Visual

---

#### `[ ]` UX-001 — Efeitos sonoros

**Checklist:**
- [ ] Background music (loop)
- [ ] SFX: comprar carta, invocar monstro, ataque, dano, vitoria, derrota
- [ ] Usar Howler.js ou HTML5 Audio API
- [ ] Botao mute no HUD

**Estimativa:** M

---

#### `[x]` GAME-006 — Feedback visual para ações inválidas + tipos especiais de invocação (Fusion/Synchro/Xyz/Link/Ritual)

**Checklist:**
- [ ] Se tentar summon em fase errada, botao fica vermelho + shake
- [ ] Se tentar atacar monstro em posicao invalida, borda da zona pisca vermelho
- [ ] Toast/mensagem no HUD explicando "Voce nao pode invocar na BATTLE Phase"

**Estimativa:** S

---

## Diagrama de Navegacao do Frontend

```
┌───────────────┐
│  /            │  ─── POST /auth/login ────→ auth-service
│  LoginPage    │  ─── POST /auth/register ──→ auth-service
│               │  ─── "Modo local" → /duel/local
└───────┬───────┘
        │ (login OK)        │ (primeiro acesso → onboarding planejado)
        ▼                    ▼
┌───────────────────┐
│  /lobby           │  ─── GET /decks ────────→ deck-service
│  LobbyPage        │  ─── POST /api/duels ───→ duel-service
│  deck selector    │
│  "Modo local" btn │
└───────┬───────┘
        │ (cria duelo | duelo local)
        ▼
┌───────────────────┐
│  /duel/:duelId    │  ─── STOMP /ws ────────→ duel-service
│  /duel/local      │  ─── SUB /topic/duel/{id}
│  DuelPage         │  ─── SEND /app/duel.action
│                   │  ─── SEND /app/duel.phase
└───────┬───────┘
        │ (duelo termina)
        ▼
┌───────────────────┐
│  ResultScreen     │  (overlay sobre DuelPage)
│  "Voltar ao Lobby"│  ─── navigate('/lobby')
└───────────────────┘
```

---

## Concluidas

| Data | Feature | Referencia |
|------|---------|-------------|
| 2026-04-17 | Campo de duelo React — layout basico com zonas | react components division |
| 2026-04-17 | Fases de turno — ciclo DRAW → END com overlay | creating duel phases |
| 2026-04-17 | Invocacao normal — drag-drop da mao para zona | more details on description |
| 2026-04-17 | Sistema de ataque — selecionar + clicar + seta animada | fix attack animation (PR #3) |
| 2026-04-17 | Ativacao de magias e armadilhas | incluido no MVP |
| 2026-04-17 | Visualizador de deck — modal com grid | incluido no MVP |
| 2026-04-17 | Painel de contexto — stats da carta ao hover | incluido no MVP |
| 2026-04-17 | POC vanilla JS — prova de conceito inicial | commit inicial |
| 2026-07-07 | WEB-000: STOMP/SockJS instalados | duelWebSocket.js |
| 2026-07-07 | WEB-001+005: Login com JWT | LoginPage, AuthContext, tokenManager |
| 2026-07-07 | WEB-002: WebSocketEngine STOMP | WebSocketEngine, duelWebSocket |
| 2026-07-07 | WEB-003: Remover duplicatas | fx/effects/ limpos |
| 2026-07-07 | WEB-006: Lobby + criar duelo | LobbyPage, duelService |
| 2026-07-07 | WEB-008: Tela de resultado | ResultScreen, gameResult no DuelContext |
| 2026-07-07 | WEB-018: Sistema de Toast | ToastContext, Toast |
| 2026-07-07 | GAME-004: Limite dinamico de deck | deckRemaining.length |
| 2026-07-07 | WEB-006b: Listagem de decks no Lobby | deckService, LobbyPage |
| 2026-07-07 | WEB-007: Selecao de deck integrada ao lobby | deckService, LobbyPage |
| 2026-07-07 | QLT-003: Roteamento react-router-dom | App.jsx, ProtectedRoute, pages/ |
| 2026-07-07 | GAME-001: IA de oponente | useAiOpponent, DuelContext (opponent hand/deck) |
| 2026-07-07 | GAME-002: Validacao de regras | actionResolver (turno 1, ataque direto), LocalEngine |
| 2026-07-07 | GAME-003: Posicao de defesa | Zone (rotacao), LocalEngine (flip ao atacar) |
| 2026-07-07 | GAME-005: Animacao de dano LP | HUD (lp-flash CSS) |
| 2026-07-07 | GAME-007: Compra automatica DRAW | DuelContext (useEffect auto-draw) |
| 2026-07-07 | WEB-012: Botao conceder | HUD (concede btn + confirm modal) |
| 2026-07-07 | WEB-013: Loading spinner | LoadingSpinner + integracao |
| 2026-07-07 | WEB-019: Modal detalhe carta | CardDetailModal + setDetailCard |
| 2026-07-07 | WEB-021: Pagina 404 | NotFoundPage |
| 2026-07-07 | QLT-004: Remover Three.js | index.html |
| 2026-07-07 | QLT-008: Arquivar POC | legacy/ |
| 2026-07-07 | WEB-009: HistoryPage | HistoryPage |
| 2026-07-07 | WEB-010: cardService com fallback YGOPro | cardService |
| 2026-07-07 | WEB-011: Reconexão automática WebSocket | duelWebSocket |
| 2026-07-07 | WEB-014: DuelLog collapsível | DuelLog |
| 2026-07-07 | WEB-015: Zona de banimento | DuelField, DuelContext |
| 2026-07-07 | WEB-016: Extra deck count | DuelField |
| 2026-07-07 | WEB-020: Turn timer 60s | HUD, DuelContext |
| 2026-07-07 | WEB-022: Testes Vitest (28) | test/ |
| 2026-07-07 | WEB-024: Responsividade mobile/tablet | duel-field.css |
| 2026-07-07 | WEB-025: Tema escuro/claro | DuelField, LobbyPage |
| 2026-07-07 | WEB-026: useReducer refactor | duelReducer, DuelContext |
| 2026-07-07 | MOTION-001~008: Animações Framer Motion | animations.js, Zone, PlayerHand, PhaseOverlay |
| 2026-07-07 | GAME-004+009: Chain/link + Spell Speed | DuelContext, actionResolver |
| 2026-07-07 | GAME-006: Special summon Extra Deck | actionResolver |
| 2026-07-07 | GAME-008: Tribute summon (level 5+) | actionResolver, Zone |
| 2026-07-07 | QLT-001: ErrorBoundary | ErrorBoundary |
| 2026-07-07 | QLT-002: apiClient | apiClient |
| 2026-07-07 | QLT-006: Testes Vitest | test/ |

---

## Bugs Conhecidos

| ID | Descricao | Severidade | Reportado em |
|----|-----------|------------|--------------|
| B01 | Imagens de cartas falham silenciosamente quando corsproxy.io esta indisponivel | Media | 2026-04-17 |
| B02 | Animacoes de Canvas podem vazar se o componente for desmontado durante a animacao | Baixa | 2026-04-17 |
| ~~B03~~ | ~~Oponente nao possui logica de turno~~ — IA implementada em GAME-001 | Resolvido | 2026-07-07 |
| B04 | fx/effects/LocalEngine.js duplicado dentro de fx/ — proposito nao claro | Baixa | 2026-04-17 |

---

## Notas & Decisoes Pendentes

- [x] Definir se o modo multiplayer sera via WebSocket proprio ou servico terceiro — via WebSocket propio (duel-service)
- [ ] Decidir se o gerenciamento de decks persistira em localStorage ou exigira backend/banco de dados
- [ ] Avaliar substituicao do corsproxy.io por solucao propria (risco de indisponibilidade do proxy publico)
- [x] TODO: esclarecer o papel de fx/effects/LocalEngine.js — duplicado do engine principal, deve ser removido
- [x] Definir se usara react-router-dom ou solucao propria de rotas — react-router-dom v7.5.0 implementado
- [x] Decidir URL base dos servicos (atualmente hardcoded localhost, precisa ser configuravel) — via `import.meta.env.VITE_*` com fallback localhost
- [x] Onboarding tutorial via framer-motion em rota /onboarding — aprovado
- [ ] Definir quantos steps no tutorial (7 propostos, pode simplificar para 5)

---

## Historico de Versoes

| Versao | Data | Principais entregas |
|--------|------|---------------------|
| `0.1.0` | 2026-04-17 | Campo interativo com drag-drop, fases, invocacao normal, combate basico e efeitos Canvas |
