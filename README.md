# Yu-Gi-Oh Deck Management Front-end

> Simulador interativo de duelo Yu-Gi-Oh no navegador, com campo de batalha, fases de turno, efeitos visuais e cartas reais via API publica.

[![Last Commit](https://img.shields.io/github/last-commit/odevpedro/yu-gi-oh-deck-management-front-end?style=flat-square)](https://github.com/odevpedro/yu-gi-oh-deck-management-front-end/commits/master)

---

## Sobre o Projeto

Aplicacao frontend de pagina unica que simula um campo de duelo Yu-Gi-Oh interativo. Carrega cartas reais da API publica YGOProDeck, permite arrastar cartas da mao para as zonas do campo, executar invocacoes, ativar magias/armadilhas, declarar ataques e avançar pelas fases do turno. Toda a logica de jogo roda localmente no navegador, sem backend proprio.

---

## Stack & Arquitetura

| Camada          | Tecnologia                                              |
|-----------------|---------------------------------------------------------|
| Runtime         | Navegador (ES Modules)                                  |
| Framework       | React 18                                                |
| Build tool      | Vite 5                                                  |
| Estado global   | React Context API (DuelContext)                         |
| Efeitos visuais | Canvas 2D API (customizado em fx.js)                    |
| API externa     | YGOProDeck REST API v7                                  |
| Proxy CORS      | corsproxy.io (para imagens das cartas)                  |
| Fontes          | Google Fonts (Orbitron, Exo 2)                          |
| Testes          | Nenhum configurado ainda                                |
| CI/CD           | Nenhum configurado ainda                                |

> Padrao arquitetural: componentes React com estado centralizado em Context + engine de regras local separado da camada de apresentacao.

---

## Estrutura de Pastas

```
/                                     (raiz — arquivos legados / POC vanilla JS)
├── poc-duel-field.html               prova de conceito original em vanilla JS
├── duel-field.js / duel-field.css    implementacao legada (nao usada pelo React)
├── deck-system.js / turn-system.js   modulos legados (nao usados pelo React)
├── context-panel.js / .css           modulos legados (nao usados pelo React)
└── card-back.png                     asset de imagem do verso da carta

yugioh-duel-react/yugioh-duel-react/  aplicacao React principal
├── index.html                        ponto de entrada HTML (carrega Vite)
├── vite.config.js                    configuracao do Vite
├── package.json
└── src/
    ├── main.jsx                      monta o React no DOM
    ├── App.jsx                       componente raiz; inicializa deck via API
    ├── styles/                       CSS global por modulo
    │   ├── duel-field.css
    │   ├── context-panel.css
    │   ├── card-context-menu.css
    │   └── action-bar.css
    ├── components/                   componentes de UI
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
    │   └── DebugPanel.jsx            painel de logs (apenas em dev)
    ├── contexts/
    │   └── DuelContext.jsx           todo o estado do duelo + acoes exportadas
    ├── engine/
    │   ├── index.js                  factory do engine
    │   ├── DuelEngineAdapter.js      interface base do engine
    │   └── LocalEngine.js            regras de jogo locais
    ├── fx/
    │   ├── FXManager.js              gerenciador de efeitos visuais
    │   └── effects/
    │       ├── AttackArrow.js        seta de ataque animada
    │       └── LocalEngine.js        TODO: verificar proposito deste arquivo aqui
    └── utils/
        ├── actionResolver.js         determina acoes disponiveis por fase/carta
        ├── cardHelpers.js            utilitarios de tipo de carta + proxy CORS
        ├── fx.js                     efeitos Canvas (brilho, particulas, seta)
        └── logger.js                 sistema de log para dev (pub/sub, buffer)

docs/
└── system-feature-flows.md          fluxos internos de cada funcionalidade
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

> Nao ha arquivo `.env` nem variaveis de ambiente necessarias. A API publica YGOProDeck e acessada diretamente pelo navegador.

### Build de Producao

```bash
npm run build    # gera dist/
npm run preview  # visualiza o build de producao localmente
```

---

## API Externa — YGOProDeck

Esta aplicacao nao possui backend proprio. Toda a data de cartas vem da API publica:

| Uso | Endpoint |
|-----|----------|
| Carregar deck inicial (20 cartas) | `GET https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0` |
| Carregar mao inicial (7 cartas por tipo) | `GET https://db.ygoprodeck.com/api/v7/cardinfo.php?type=<TIPO>&num=1&offset=0` |

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
[ ] v0.2 — IA de oponente (planejado)
[ ] v0.3 — gerenciamento de decks customizados (planejado)
[ ] v1.0 — modo multiplayer (planejado)
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
