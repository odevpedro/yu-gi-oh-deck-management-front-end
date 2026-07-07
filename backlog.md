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
| `XS` `S` `M` `L` `XL` | Estimativa de complexidade |

---

## Em Andamento

> Nenhuma feature em andamento no momento.

---

## Pendentes

### FASE 0 — Criticos (impedem uso real)

| ID | Feature | Prioridade | Estimativa |
|----|---------|------------|------------|
| WEB-001 | **Adicionar dependencias STOMP + SockJS** — instalar @stomp/stompjs e sockjs-client no package.json | P0 | XS |
| WEB-002 | **Implementar WebSocketEngine** — conectar ao duel-service via STOMP em /ws, enviar acoes em /app/duel.action, receber estado em /topic/duel/{id} | P0 | XL |
| WEB-003 | **Remover arquivos duplicados** — fx/effects/LocalEngine.js e fx/effects/FXManager.js sao copias de engine/LocalEngine.js e fx/FXManager.js | P0 | XS |
| WEB-004 | **Tela de login/registro** — formulario de autenticacao integrado com auth-service (POST /auth/login, /auth/register) | P0 | M |
| WEB-005 | **Gerenciamento de JWT** — armazenar token, enviar em Authorization header nas requisicoes e no handshake WebSocket | P0 | M |

### FASE 1 — Ciclo de Duelo Completo

| ID | Feature | Prioridade | Estimativa |
|----|---------|------------|------------|
| WEB-006 | **Lobby / Matchmaking** — tela para ver jogadores proximos (community-service /players/nearby) e enviar/aceitar desafios | P1 | XL |
| WEB-007 | **Selecao de deck** — tela para escolher deck do jogador (deck-service GET /decks) antes de criar ou aceitar um duelo | P1 | L |
| WEB-008 | **Tela de resultado de duelo** — exibir vencedor, LP finais, turnos, duracao ao fim do duelo | P1 | M |
| WEB-009 | **Historico de duelos** — consumir GET /api/duels/history e /api/duels/history/player/{id} do duel-service | P2 | M |
| WEB-010 | **Renderizar cartas reais** — conectar com card-service ou YGOPRODeck API em vez de dados mockados | P1 | L |

### Jogabilidade

| ID | Feature | Prioridade | Estimativa |
|----|---------|------------|------------|
| GAME-001 | IA de oponente — logica de turno automatico para o lado adversario | P1 | XL |
| GAME-002 | Validacao completa de regras — limite de invocacao normal, verificacao de ATK/DEF, efeitos de carta | P1 | M |
| GAME-003 | Modo posicao de defesa — exibir carta virada com DEF em vez de ATK | P2 | M |
| GAME-004 | Limite dinamico de deck — remover hardcode de 20 cartas | P2 | S |
| GAME-005 | Animacao de dano no LP do adversario | P2 | M |
| GAME-006 | Feedback visual para acoes invalidas (fase errada, zona ocupada) | P2 | S |
| GAME-007 | Logica de compra de carta automatica ao iniciar turno DRAW | P2 | S |

### Qualidade & Infraestrutura

| ID | Feature | Prioridade | Estimativa |
|----|---------|------------|------------|
| QLT-001 | Error boundaries — evitar que um erro derrube toda a aplicacao | P1 | M |
| QLT-002 | Tratamento de falha de API — exibir mensagem de erro quando servico estiver indisponivel | P1 | M |
| QLT-003 | Roteamento (react-router-dom) — tela de login, lobby, duelo, historico em rotas separadas | P2 | M |
| QLT-004 | Remover Three.js do index.html — biblioteca carregada via CDN mas nunca utilizada | P2 | S |
| QLT-005 | Cleanup de animationFrame e setTimeout — prevenir memory leaks nos componentes | P2 | M |
| QLT-006 | Suite de testes — nenhum teste configurado atualmente | P2 | L |
| QLT-007 | Acessibilidade (a11y) — adicionar ARIA roles e navegacao por teclado | P3 | S |
| QLT-008 | Arquivar arquivos legados da raiz — mover POC vanilla JS para pasta legacy/ | P3 | XS |

### UX & Visual

| ID | Feature | Prioridade | Estimativa |
|----|---------|------------|------------|
| UX-001 | Efeitos sonoros — background music, SFX de ataque, invocacao, compra de carta | P2 | M |
| UX-002 | Animacao de shuffle do deck | P3 | S |
| UX-003 | Modo escuro / tema customizavel | P3 | M |
| UX-004 | Responsividade — suporte a mobile e tablets | P3 | L |

---

## Concluidas

| Data | Feature | PR / Commit |
|------|---------|-------------|
| 2026-04-17 | Campo de duelo React — layout basico com zonas de monstro, magia e cemiterio | `react components division` |
| 2026-04-17 | Fases de turno — ciclo DRAW → STANDBY → MAIN1 → BATTLE → MAIN2 → END com overlay de transicao | `creating duel phases` |
| 2026-04-17 | Invcacao normal — arrastar carta da mao para zona do campo, com efeito de particulas Canvas | `more details on description` |
| 2026-04-17 | Sistema de ataque — selecionar monstro, clicar zona adversaria, resolver batalha com seta animada | `fix attack animation` (PR #3) |
| 2026-04-17 | Ativacao de magias e armadilhas — jogar carta para zona de magia/armadilha | incluido no MVP |
| 2026-04-17 | Visualizador de deck — modal com grid das cartas restantes | incluido no MVP |
| 2026-04-17 | Painel de contexto — exibir arte e stats da carta/zona ao passar o mouse | incluido no MVP |
| 2026-04-17 | POC vanilla JS — prova de conceito inicial do campo de duelo sem React | commit inicial |

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

> Pontos em aberto que precisam de decisao antes de serem desenvolvidos.

- [x] Definir se o modo multiplayer sera via WebSocket proprio ou servico terceiro — via WebSocket propio (duel-service)
- [ ] Decidir se o gerenciamento de decks persistira em localStorage ou exigira backend/banco de dados
- [ ] Avaliar substituicao do corsproxy.io por solucao propria (risco de indisponibilidade do proxy publico)
- [x] TODO: esclarecer o papel de fx/effects/LocalEngine.js — duplicado do engine principal, deve ser removido
- [ ] Definir se usara react-router-dom ou solucao propria de rotas

---

## Historico de Versoes

| Versao | Data | Principais entregas |
|--------|------|---------------------|
| `0.1.0` | 2026-04-17 | Campo interativo com drag-drop, fases, invocacao normal, combate basico e efeitos Canvas |
