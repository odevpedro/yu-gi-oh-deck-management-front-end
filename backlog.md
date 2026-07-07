# Backlog — Yu-Gi-Oh Deck Management Front-end

> Registro vivo do progresso do projeto. Atualizado a cada mudanca de estado de uma funcionalidade.
> **Ultima atualizacao:** 2026-07-07

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

#### `[ ]` WEB-000 — Adicionar dependencias STOMP + SockJS

**Descricao:** Instalar as bibliotecas necessarias para conexao WebSocket STOMP com o duel-service.

**Checklist:**
- [ ] Executar no diretorio `yugioh-duel-react/yugioh-duel-react/`:
  ```bash
  npm install @stomp/stompjs sockjs-client
  npm install -D @types/sockjs-client  # se usar TS no futuro
  ```
- [ ] Verificar que `package.json` foi atualizado com as novas dependencias
- [ ] Verificar que `npm install` passa sem erros

**Criterio de aceitacao:** `package.json` contem `@stomp/stompjs` e `sockjs-client`. `npm run dev` funciona.

**Estimativa:** XS

---

#### `[ ]` WEB-001 + WEB-005 — Tela de Login com gerenciamento de JWT

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

**Estimativa:** M

---

#### `[ ]` WEB-002 — Implementar WebSocketEngine (STOMP)

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

**Estimativa:** L

---

#### `[ ]` WEB-006 — Tela de Lobby / Criar Duelo

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

**Estimativa:** XL

---

#### `[ ]` WEB-008 — Tela de Resultado de Duelo

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

**Estimativa:** M

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

#### `[ ]` WEB-007 — Selecao de Deck

**Descricao:** Tela/modal para selecionar qual deck usar antes de criar um duelo.

**Checklist:**
- [ ] Criar componente `DeckSelector.jsx`:
  - Grid de decks com nome, numero de cartas, status de validacao
  - Indicacao visual se o deck e valido (check verde) ou invalido (icone vermelho)
  - Ao selecionar, mostrar as cartas do deck em detalhe
- [ ] Se o deck for invalido, mostrar os erros de validacao
- [ ] Botao "Usar este Deck" que confirma a selecao

**Estimativa:** M

---

#### `[ ]` WEB-009 — Historico de Duelos

**Descricao:** Tela que lista duelos anteriores com filtro por jogador.

**Checklist:**
- [ ] Criar `src/pages/HistoryPage.jsx`
- [ ] Consumir `GET /api/duels/history` e `GET /api/duels/history/player/{id}` do duel-service
- [ ] Exibir tabela: data, oponente, resultado (vitoria/derrota), turnos, duracao
- [ ] Clicar em um duelo abre detalhes

**Estimativa:** M

---

#### `[ ]` WEB-010 — Renderizar cartas reais da API

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

### Jogabilidade (melhorias na engine local)

---

#### `[ ]` GAME-001 — IA de oponente

**Descricao:** Logica de turno automatico para o lado adversario quando jogando localmente.

**Checklist:**
- [ ] Comportamentos basicos:
  - Fase DRAW: comprar carta
  - Fase MAIN_1: invocar o primeiro monstro viavel da mao
  - Fase BATTLE: atacar com o monstro mais forte contra o monstro mais fraco do oponente
  - Fase MAIN_2: ativar magia se disponivel
  - Fase END: passar turno
- [ ] Melhorias futuras: IA baseada em prioridade de carta

**Estimativa:** XL

---

#### `[ ]` GAME-002 — Validacao completa de regras

**Descricao:** Implementar validacao de regras do Yu-Gi-Oh! na engine local.

**Checklist:**
- [ ] Limite de 1 invocacao normal por turno
- [ ] Nao pode invocar monstro em zona ocupada
- [ ] Nao pode atacar no primeiro turno
- [ ] Monstro em posicao de defesa nao pode atacar
- [ ] Ataque direto so quando oponente nao tem monstros

**Estimativa:** M

---

#### `[ ]` GAME-003 — Posicao de defesa

**Descricao:** Suporte a colocar cartas em posicao de defesa (face-up e face-down).

**Checklist:**
- [ ] Botao de contexto: "Posicao de Ataque" / "Posicao de Defesa"
- [ ] Carta em defesa face-down: exibir verso
- [ ] Carta em defesa face-up: exibir vertical (rotacao CSS)
- [ ] Ao atacar carta em defesa, comparar ATK do atacante com DEF do defensor

**Estimativa:** M

---

#### `[ ]` GAME-004 — Limite dinamico de deck

**Descricao:** Remover hardcode de 20 cartas. Usar o tamanho real do deck.

**Checklist:**
- [ ] Remover constante `TOTAL_CARDS = 20` em `LocalEngine.js`
- [ ] Usar `player.deck.length` em todos os lugares

**Estimativa:** S

---

#### `[ ]` GAME-005 — Animacao de dano no LP

**Descricao:** Animacao de contagem regressiva no Life Points quando sofre dano.

**Checklist:**
- [ ] Efeito de "digitacao" no numero do LP
- [ ] Cor vermelha quando leva dano, verde quando ganha vida
- [ ] Tela treme levemente em dano grande (>2000)

**Estimativa:** M

---

#### `[ ]` GAME-007 — Compra automatica na DRAW Phase

**Descricao:** Ao iniciar a fase DRAW, a carta do topo do deck deve ser automaticamente adicionada a mao.

**Checklist:**
- [ ] No `DuelContext`, quando `phase` muda para `DRAW` e `drawnThisTurn === false`:
  - Remover carta do topo do `player.deck`
  - Adicionar em `player.hand`
  - Marcar `drawnThisTurn = true`
- [ ] Animacao de compra (carta deslizando do deck para a mao)

**Criterio de aceitacao:** Toda DRAW Phase compra uma carta automaticamente.

**Estimativa:** S

---

### Motion Design & Onboarding

---

#### `[ ]` MOTION-001 — Adicionar dependencia framer-motion

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

#### `[ ]` MOTION-008 — Transicao de fases melhorada

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

#### `[ ]` QLT-001 — Error Boundaries

**Checklist:**
- [ ] Criar `ErrorBoundary.jsx` que captura erros dos componentes filhos
- [ ] Exibir mensagem amigavel em vez de tela branca
- [ ] Botao "Recarregar" que da refresh na pagina

**Estimativa:** M

---

#### `[ ]` QLT-002 — Tratamento de falha de API

**Checklist:**
- [ ] Criar `src/services/apiClient.js` com interceptors:
  - Se response for 401, redirecionar para login
  - Se response for 5xx, mostrar toast de erro
  - Timeout de 10s
- [ ] Usar `apiClient` em todos os servicos

**Estimativa:** M

---

#### `[ ]` QLT-003 — Roteamento com react-router-dom

**Checklist:**
- [ ] Instalar `react-router-dom`
- [ ] Rotas definidas:
  - `/` → LoginPage
  - `/onboarding` → OnboardingPage (protegida, redirect se ja completou)
  - `/lobby` → LobbyPage (protegida)
  - `/duel/:duelId` → DuelPage (protegida)
  - `/history` → HistoryPage (protegida)
- [ ] Componente `ProtectedRoute` que verifica `user` no AuthContext

**Estimativa:** M

---

#### `[ ]` QLT-004 — Remover Three.js do index.html

**Checklist:**
- [ ] Remover `<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js">` do `index.html`

**Estimativa:** XS

---

#### `[ ]` QLT-005 — Cleanup de animationFrame e setTimeout

**Checklist:**
- [ ] Revisar `useEffect` em todos os componentes
- [ ] Garantir que todo `setTimeout`/`setInterval`/`requestAnimationFrame` e limpo no cleanup
- [ ] Usar `useRef` para armazenar IDs de timers

**Estimativa:** M

---

#### `[ ]` QLT-006 — Suite de testes

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

#### `[ ]` QLT-008 — Arquivar POC vanilla JS

**Checklist:**
- [ ] Mover para `legacy/` os arquivos da raiz: `poc-duel-field.html`, `deck-system.js`, `duel-field.css`, `duel-field.js`, `turn-system.js`, `context-panel.css`, `context-panel.js`, `card-back.png`

**Estimativa:** XS

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

#### `[ ]` GAME-006 — Feedback visual para acoes invalidas

**Checklist:**
- [ ] Se tentar summon em fase errada, botao fica vermelho + shake
- [ ] Se tentar atacar monstro em posicao invalida, borda da zona pisca vermelho
- [ ] Toast/mensagem no HUD explicando "Voce nao pode invocar na BATTLE Phase"

**Estimativa:** S

---

## Diagrama de Navegacao do Frontend

```
┌───────────────┐
│  LoginPage    │  ─── POST /auth/login ───→ auth-service
│  /register    │  ─── POST /auth/register ──→ auth-service
└───────┬───────┘
        │ (login OK, primeiro acesso)
        ▼
┌───────────────────┐
│  OnboardingPage   │  ─── tutorial interativo (7 steps)
│  /onboarding      │  ─── framer-motion animations
└───────┬───────────┘
        │ (completou ou pulou)
        ▼
┌───────────────┐
│  LobbyPage    │  ─── GET /decks ─────────→ deck-service
│  /lobby       │  ─── GET /players/nearby ─→ community-service (opcional)
│               │  ─── GET /duels/history ──→ duel-service
└───────┬───────┘
        │ (cria duelo)
        ▼
┌───────────────┐
│  DuelPage     │  ─── POST /api/duels ────→ duel-service
│  /duel/:id    │  ─── STOMP /ws ──────────→ duel-service
│               │  ─── SUB /topic/duel/{id}
│               │  ─── SEND /app/duel.action
│               │  ─── SEND /app/duel.phase
└───────┬───────┘
        │ (duelo termina)
        ▼
┌───────────────┐
│  ResultScreen │  (overlay sobre DuelPage)
│               │  ─── Botoes: Lobby / Historico
└───────────────┘
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

---

## Bugs Conhecidos

| ID | Descricao | Severidade | Reportado em |
|----|-----------|------------|--------------|
| B01 | Imagens de cartas falham silenciosamente quando corsproxy.io esta indisponivel | Media | 2026-04-17 |
| B02 | Animacoes de Canvas podem vazar se o componente for desmontado durante a animacao | Baixa | 2026-04-17 |
| B03 | Oponente nao possui logica de turno — LP adversario e hardcoded em 6000 | Alta | 2026-04-17 |
| B04 | fx/effects/LocalEngine.js duplicado dentro de fx/ — proposito nao claro | Baixa | 2026-04-17 |

---

## Notas & Decisoes Pendentes

- [x] Definir se o modo multiplayer sera via WebSocket proprio ou servico terceiro — via WebSocket propio (duel-service)
- [ ] Decidir se o gerenciamento de decks persistira em localStorage ou exigira backend/banco de dados
- [ ] Avaliar substituicao do corsproxy.io por solucao propria (risco de indisponibilidade do proxy publico)
- [x] TODO: esclarecer o papel de fx/effects/LocalEngine.js — duplicado do engine principal, deve ser removido
- [ ] Definir se usara react-router-dom ou solucao propria de rotas
- [ ] Decidir URL base dos servicos (atualmente hardcoded localhost, precisa ser configuravel)
- [x] Onboarding tutorial via framer-motion em rota /onboarding — aprovado
- [ ] Definir quantos steps no tutorial (7 propostos, pode simplificar para 5)

---

## Historico de Versoes

| Versao | Data | Principais entregas |
|--------|------|---------------------|
| `0.1.0` | 2026-04-17 | Campo interativo com drag-drop, fases, invocacao normal, combate basico e efeitos Canvas |
