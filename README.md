# Yu-Gi-Oh Deck Management Front-end

> Simulador interativo de duelo Yu-Gi-Oh no navegador, com campo de batalha, fases de turno, efeitos visuais e integracao com ecossistema de microservicos (duel-service, auth-service, deck-service).

[![Last Commit](https://img.shields.io/github/last-commit/odevpedro/yu-gi-oh-deck-management-front-end?style=flat-square)](https://github.com/odevpedro/yu-gi-oh-deck-management-front-end/commits/master)

---

## Sobre o Projeto

Aplicacao frontend SPA (Single Page Application) que simula um campo de duelo Yu-Gi-Oh interativo. Suporta:
- **Modo local:** jogo offline com cartas da API YGOProDeck, toda logica no navegador
- **Modo remoto:** duelo multiplayer via WebSocket (STOMP/SockJS) conectado ao duel-service

Integra-se com auth-service (login JWT), deck-service (listagem e selecao de decks) e duel-service (criacao de duelo, estado em tempo real).

---

## Stack & Arquitetura

| Camada          | Tecnologia                                              |
|-----------------|---------------------------------------------------------|
| Runtime         | Navegador (ES Modules)                                  |
| Framework       | React 18                                                |
| Build tool      | Vite 5                                                  |
| Roteamento      | react-router-dom v7                                     |
| Estado global   | React Context API (AuthContext, DuelContext, ToastContext) |
| WebSocket       | STOMP over SockJS (@stomp/stompjs)                      |
| Efeitos visuais | Canvas 2D API (customizado em fx.js)                    |
| API externa     | YGOProDeck REST API v7                                  |
| Proxy CORS      | corsproxy.io (para imagens das cartas)                  |
| Fontes          | Google Fonts (Orbitron, Exo 2)                          |
| Testes          | Nenhum configurado ainda                                |
| CI/CD           | Nenhum configurado ainda                                |

> Padrao arquitetural: componentes React com estado centralizado em Context + roteamento via react-router-dom + engine de regras local separado da camada de apresentacao.

---

## Estrutura de Pastas

```
legacy/                               arquivos POC vanilla JS (arquivados)
├── poc-duel-field.html               prova de conceito original em vanilla JS
├── duel-field.js / duel-field.css    implementacao legada
├── deck-system.js / turn-system.js   modulos legados
├── context-panel.js / .css           modulos legados
└── card-back.png                     asset do verso da carta

yugioh-duel-react/yugioh-duel-react/  aplicacao React principal
├── index.html                        ponto de entrada HTML (carrega Vite)
├── vite.config.js                    configuracao do Vite
├── package.json
└── src/
    ├── main.jsx                      monta o React no DOM
    ├── App.jsx                       componente raiz com BrowserRouter e rotas
    ├── components/                   componentes de UI
    │   ├── ProtectedRoute.jsx        guard de autenticacao para rotas
    │   ├── HUD.jsx                   barra superior com LP e fases
    │   ├── DuelField.jsx             layout principal do campo
    │   ├── Zone.jsx                  zona individual do campo (monstro/magia/GY)
    │   ├── PlayerHand.jsx            mao do jogador em leque
    │   ├── CardWrap.jsx              carta na mao com drag e efeito 3D
    │   ├── ActionBar.jsx             barra de acoes contextuais
    │   ├── CardContextMenu.jsx       menu flutuante sobre carta selecionada
    │   ├── ContextPanel.jsx          painel lateral com info da carta/zona
    │   ├── DeckZone.jsx              pilha do deck com logica de compra
    │   ├── DeckViewer.jsx            modal com lista completa do deck
    │   ├── PhaseOverlay.jsx          overlay de transicao de fase
    │   ├── ResultScreen.jsx          tela de resultado ao fim do duelo
    │   └── DebugPanel.jsx            painel de logs (apenas em dev)
    ├── pages/                        paginas da SPA (uma por rota)
    │   ├── LoginPage.jsx             tela de login/registro + modo local
    │   ├── LobbyPage.jsx             lobby com criacao de duelo e selecao de deck
    │   └── DuelPage.jsx              campo de duelo completo (local e remoto)
    ├── contexts/                     providers de estado global
    │   ├── DuelContext.jsx           todo o estado do duelo + acoes exportadas
    │   ├── AuthContext.jsx           autenticacao (JWT) + sessao local
    │   └── ToastContext.jsx          sistema de notificacoes toast
    ├── services/                     clientes HTTP/WS para os microservicos
    │   ├── authService.js            login/register via auth-service (:8086)
    │   ├── deckService.js            CRUD de decks via deck-service (:8081)
    │   ├── duelService.js            criacao/estado de duelo via duel-service (:8084)
    │   ├── duelWebSocket.js          cliente STOMP para estado em tempo real
    │   └── tokenManager.js           storage de JWT em localStorage
    ├── engine/                       engines de regras do jogo
    │   ├── index.js                  factory do engine
    │   ├── DuelEngineAdapter.js      interface base do engine
    │   └── LocalEngine.js            regras de jogo locais
    ├── hooks/                        hooks customizados
    │   └── useAiOpponent.js          IA do oponente no modo local
    ├── fx/                           efeitos visuais Canvas
    │   ├── FXManager.js              gerenciador de efeitos visuais
    │   └── effects/
    │       └── AttackArrow.js        seta de ataque animada
    └── utils/
        ├── actionResolver.js         determina acoes disponiveis por fase/carta
        ├── cardHelpers.js            utilitarios de tipo de carta + proxy CORS
        ├── fx.js                     efeitos Canvas (brilho, particulas, seta)
        └── logger.js                 sistema de log para dev (pub/sub, buffer)

docs/
├── system-feature-flows.md          fluxos internos de cada funcionalidade
└── data-model.md                    modelo de dados do frontend
```

---

## Como Rodar Localmente

### Pre-requisitos

- Node.js 18+
- npm

### Setup

```bash
# 1. Clone o repositorio
git clone https://github.com/odevpedro/yu-gi-oh-deck-management-front-end.git
cd yu-gi-oh-deck-management-front-end

# 2. Entre na pasta da aplicacao React
cd yugioh-duel-react/yugioh-duel-react

# 3. Instale as dependencias
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

A aplicacao estara disponivel em `http://localhost:5173`.

### Servicos

O frontend depende de microservicos do ecossistema. Configure as URLs via `.env`:

| Variavel | Default | Servico |
|----------|---------|---------|
| `VITE_DUEL_URL` | `http://localhost:8084` | duel-service |
| `VITE_DUEL_WS_URL` | `http://localhost:8084/ws` | WebSocket do duel-service |
| `VITE_AUTH_URL` | `http://localhost:8086/auth` | auth-service |
| `VITE_DECK_URL` | `http://localhost:8081` | deck-service |

Se o deck-service estiver indisponivel, o lobby exibe "Nenhum deck disponivel" e o backend do duel-service usa um deck demo padrao.

### Build de Producao

```bash
npm run build    # gera dist/
npm run preview  # visualiza o build de producao localmente
```

---

## Rotas da Aplicacao

| Rota | Pagina | Autenticacao |
|------|--------|-------------|
| `/` | Login / Registro | Publica (redireciona para `/lobby` se logado) |
| `/lobby` | Lobby com criacao de duelo | Requer login |
| `/duel/:duelId` | Campo de duelo | Requer login |
| `/duel/local` | Duelo local (offline) | Requer login |
| `*` | Redireciona para `/` | — |

## Microservicos

| Servico | Porta | Uso no frontend |
|---------|-------|-----------------|
| auth-service | 8086 | Login/registro JWT |
| deck-service | 8081 | Listagem e selecao de decks |
| duel-service | 8084 | Criacao de duelo + estado via WebSocket |

## API Externa — YGOProDeck (modo local)

No modo local, as cartas sao carregadas da API publica:

| Uso | Endpoint |
|-----|----------|
| Carregar mao inicial (7 cartas, uma por tipo) | `GET https://db.ygoprodeck.com/api/v7/cardinfo.php?type=<TIPO>&num=1&offset=0` |
| Inicializar deck | Gerado internamente via `initDeck()` no DuelContext, sem fetch externo |

> Imagens das cartas sao carregadas via proxy CORS: `https://corsproxy.io/?url=<IMAGE_URL>`

---

## Documentacao Tecnica

| Documento | Descricao |
|-----------|-----------|
| [Fluxos de Funcionalidades](./docs/system-feature-flows.md) | Fluxo interno de cada feature |
| [Backlog](./backlog.md) | Status de desenvolvimento do projeto |

---

## Status do Projeto

```
[x] POC — campo de duelo vanilla JS
[x] MVP React — campo interativo com drag-drop, fases, invocacao e combate basico
[x] v0.1 — Login JWT + autenticacao
[x] v0.2 — WebSocket multiplayer (STOMP/SockJS)
[x] v0.3 — Integracao com deck-service (listagem e selecao de decks)
[x] v0.4 — Roteamento SPA com react-router-dom (login → lobby → duelo)
[x] v0.5 — IA de oponente (basica: comprar, invocar, atacar, passar)
[x] v0.6 — Validacao de regras + posicao de defesa + LP animation + auto-draw
[x] v0.7 — Conceder duelo, loading spinner, card detail modal, 404 page
[ ] v0.8 — Historico de duelos (planejado)
[ ] v1.0 — Matchmaking e modo competitivo (planejado)
```

---

## Debug em Desenvolvimento

- Pressione `` ` `` (backtick) para abrir/fechar o painel de logs
- Filtre por tag: `ATTACK`, `ENGINE`, `STATE`, `FX`, `PHASE`, `SUMMON`, `ERROR`
- O painel so aparece quando `import.meta.env.DEV === true`

---

## Contribuindo

1. Fork o repositorio
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudancas: `git commit -m 'feat: adiciona minha feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request descrevendo o que foi feito

> Siga o padrao [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

---

## Licenca

Distribuido sob a licenca MIT.

---

<p align="center">
  Feito com foco em qualidade por <a href="https://github.com/odevpedro">@odevpedro</a>
</p>
