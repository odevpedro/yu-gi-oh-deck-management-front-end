# System Feature Flows

> Registro historico e incremental dos fluxos internos de cada funcionalidade.
> Este documento cresce a cada nova feature implementada e **nunca tem secoes removidas**.

---

## Indice

- [Visao Geral da Arquitetura](#visao-geral-da-arquitetura)
- [Convencoes deste Documento](#convencoes-deste-documento)
- [Feature: Inicializacao do Duelo (Carregamento de Cartas)](#feature-inicializacao-do-duelo-carregamento-de-cartas)
- [Feature: Sistema de Fases de Turno](#feature-sistema-de-fases-de-turno)
- [Feature: Drag-and-Drop de Carta para o Campo](#feature-drag-and-drop-de-carta-para-o-campo)
- [Feature: Invocacao Normal de Monstro](#feature-invocacao-normal-de-monstro)
- [Feature: Ativacao de Magia e Armadilha](#feature-ativacao-de-magia-e-armadilha)
- [Feature: Sistema de Ataque](#feature-sistema-de-ataque)
- [Feature: Compra de Carta (Draw Phase)](#feature-compra-de-carta-draw-phase)
- [Feature: Painel de Contexto](#feature-painel-de-contexto)
- [Feature: Efeitos Visuais Canvas (FX)](#feature-efeitos-visuais-canvas-fx)

---

## Visao Geral da Arquitetura

> Aplicacao React de pagina unica sem backend proprio. Toda logica de jogo roda no navegador.

**Padrao arquitetural:** Componentes React com estado centralizado em Context API + engine de regras desacoplado.

**Fluxo global de uma interacao de usuario:**

```
Evento do usuario (click, drag, hover)
    └── Componente React (Zone, CardWrap, ActionBar...)
            └── Funcao do DuelContext (executeAction, selectCard, nextPhase...)
                    ├── LocalEngine (validacao de regras + mutacao de estado)
                    └── Estado React atualizado → re-render dos componentes afetados
                              └── FXManager (efeitos Canvas disparados apos estado atualizado)
```

**Camadas e responsabilidades:**

| Camada | Arquivos | Responsabilidade |
|--------|----------|-----------------|
| Apresentacao | `components/` | Renderizar estado, capturar eventos do usuario |
| Estado global | `contexts/DuelContext.jsx` | Unica fonte de verdade; expoe estado e acoes |
| Engine de regras | `engine/LocalEngine.js` | Validar e aplicar regras do jogo (invocacao, ataque, fases) |
| Resolucao de acoes | `utils/actionResolver.js` | Determinar quais acoes estao disponiveis para uma carta/fase |
| Efeitos visuais | `utils/fx.js`, `fx/FXManager.js` | Animacoes Canvas (particulas, seta de ataque, brilho) |
| Utilitarios | `utils/cardHelpers.js`, `utils/logger.js` | Helpers de tipo de carta, proxy CORS, logging dev |

---

## Convencoes deste Documento

- **Estado** e sempre lido e mutado via `DuelContext` — nenhum componente tem estado proprio de jogo
- **Engine** valida regras antes de qualquer mutacao de estado
- **FX** sao disparados apos mutacao de estado, nunca antes
- **Dev-only**: `DebugPanel` e `logger.js` sao excluidos automaticamente em producao via `import.meta.env.DEV`

---

# Feature: Inicializacao do Duelo (Carregamento de Cartas)

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Ao montar a aplicacao, o duelo precisa de um deck e de uma mao inicial com cartas reais. A feature carrega dados da API publica YGOProDeck, popula o deck com 20 cartas e a mao com 7 cartas de tipos variados (um de cada tipo principal).

**Motivacao:** Sem cartas reais o campo seria inutil para testar jogabilidade. A API publica evita a necessidade de banco de dados proprio.
**Resultado:** Ao abrir a aplicacao o jogador ja ve cartas reais com arte, ATK/DEF e atributos corretos.

---

## Fluxo Principal

### 1. Ponto de Entrada

- **Tipo:** `useEffect` no mount do componente React
- **Arquivo:** `yugioh-duel-react/yugioh-duel-react/src/App.jsx`
- **Gatilho:** Montagem inicial do componente `App`

`App.jsx` dispara dois `Promise.all` em paralelo: um para a mao e um para o deck (via DuelContext).

---

### 2. Carregamento da Mao (7 cartas)

- **Arquivo:** `src/App.jsx` (logica inline no `useEffect`)

Sete requisicoes paralelas para YGOProDeck, uma por tipo de carta:

| Tipo | URL |
|------|-----|
| Fusion Monster | `?type=Fusion+Monster&num=1&offset=0` |
| Synchro Monster | `?type=Synchro+Monster&num=1&offset=0` |
| XYZ Monster | `?type=XYZ+Monster&num=1&offset=0` |
| Link Monster | `?type=Link+Monster&num=1&offset=0` |
| Effect Monster | `?type=Effect+Monster&num=1&offset=0` |
| Spell Card | `?type=Spell+Card&num=1&offset=0` |
| Trap Card | `?type=Trap+Card&num=1&offset=0` |

Resultado: `setHandCards(results.map(r => r.data[0]))` atualiza o estado da mao.

---

### 3. Carregamento do Deck (20 cartas)

- **Arquivo:** `src/contexts/DuelContext.jsx`

```
GET https://db.ygoprodeck.com/api/v7/cardinfo.php?num=20&offset=0
→ data.data (array de 20 objetos de carta)
→ setDeckCards(data.data)
→ setDeckRemaining(data.data)
```

---

### 4. Proxy CORS para Imagens

- **Arquivo:** `src/utils/cardHelpers.js` — funcao `proxiedUrl(rawUrl)`

Todas as URLs de imagem retornadas pela API sao reescritas:
```
https://images.ygoprodeck.com/images/cards/XXXXX.jpg
→ https://corsproxy.io/?url=https%3A%2F%2Fimages.ygoprodeck.com%2F...
```

---

### 5. Fallback em Caso de Falha

Se qualquer fetch falhar, a Promise.all rejeita e o estado nao e atualizado. O campo fica vazio.
TODO: implementar tratamento de erro com cartas mock de fallback.

---

## Decisoes Tecnicas

### ADR-001 — API Publica sem Autenticacao

| Campo | Detalhe |
|-------|---------|
| **Status** | Aceita |
| **Data** | 2026-04-17 |
| **Contexto** | Projeto POC sem backend proprio; necessidade de cartas reais para testar jogabilidade |
| **Decisao** | Usar YGOProDeck API publica sem chave de API |
| **Consequencias** | Zero custo e configuracao, porem sujeito a rate limiting e indisponibilidade do servico terceiro |

### ADR-002 — Proxy CORS via corsproxy.io

| Campo | Detalhe |
|-------|---------|
| **Status** | Aceita (provisoria) |
| **Data** | 2026-04-17 |
| **Contexto** | YGOProDeck nao envia headers CORS para imagens, bloqueando o navegador |
| **Decisao** | Rotear todas as URLs de imagem por `corsproxy.io` |
| **Consequencias** | Resolve o problema imediatamente, porem adiciona latencia e dependencia de servico publico sem SLA |

---

# Feature: Sistema de Fases de Turno

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

O duelo Yu-Gi-Oh e dividido em fases de turno com regras proprias. A feature implementa o ciclo de seis fases com transicao animada e reset de flags por turno.

**Motivacao:** Sem fases, acoes como invocacao normal e ataque poderiam ser executadas a qualquer momento, violando as regras basicas do jogo.
**Resultado:** O jogador avanca as fases clicando em "Proxima Fase" no HUD; um overlay anuncia a transicao; flags de limite por turno sao resetadas no inicio de cada turno.

---

## Fluxo Principal

### 1. Ponto de Entrada

- **Arquivo:** `src/components/HUD.jsx` — botao "Proxima Fase"
- **Arquivo:** `src/contexts/DuelContext.jsx` — funcao `nextPhase()`

---

### 2. Ciclo de Fases

Fases definidas como constante em `DuelContext.jsx`:

```
PHASES = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END']
```

```
nextPhase()
  → phaseIndex = (phaseIndex + 1) % 6
  → Se phaseIndex voltar a 0: turn++ e resetar flags
  → setPhaseOverlay(nomeDaFase)  ← dispara overlay por 1s
  → drawnThisTurn = false (reset apenas na fase DRAW do proximo turno)
```

---

### 3. Overlay de Transicao

- **Arquivo:** `src/components/PhaseOverlay.jsx`
- Renderizado via `ReactDOM.createPortal` em `document.body`
- Exibe o nome da fase por 1 segundo e desaparece com fade-out CSS
- `DuelContext` seta `phaseOverlay = null` apos timeout

---

### 4. Flags de Turno

Reset quando `phaseIndex` volta a zero (inicio de novo turno):

| Flag | Reset para | Significado |
|------|-----------|-------------|
| `normalSummonedThisTurn` | `false` | Permite nova invocacao normal |
| `positionChangedThisTurn` | `false` | Permite nova mudanca de posicao |
| `attackedZones` | `new Set()` | Permite novos ataques |
| `drawnThisTurn` | `false` | Permite nova compra |

---

### 5. Instrucao Contextual

- **Arquivo:** `src/components/DuelField.jsx`
- Texto de instrucao exibido no campo muda baseado em `phase` + estado do jogo
- Ex: na fase DRAW mostra "Compre uma carta"; na BATTLE mostra "Selecione um monstro para atacar"

---

# Feature: Drag-and-Drop de Carta para o Campo

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

O jogador arrasta uma carta da mao para uma zona do campo para ativa-la. A feature usa eventos nativos do mouse sem biblioteca de drag-and-drop.

**Motivacao:** Interacao intuitiva de arrastar-soltar e o principal gesto do jogo; bibliotecas como react-dnd adicionariam peso desnecessario para o POC.
**Resultado:** O jogador clica e arrasta uma carta da mao; um ghost element segue o cursor; soltar sobre uma zona valida aciona a acao correspondente.

---

## Fluxo Principal

### 1. Inicio do Drag

- **Arquivo:** `src/components/CardWrap.jsx` — evento `onMouseDown`

```
onMouseDown
  → context.setDragState({ active: true, fromIndex: i, card: cardData })
  → Cria elemento ghost (clone da carta) fixado ao cursor via position: fixed
  → Listeners globais: mousemove (move ghost) + mouseup (finaliza drag)
```

---

### 2. Movimento

- `mousemove` atualiza `left/top` do ghost element para seguir o cursor

---

### 3. Recepcao na Zona (Drop)

- **Arquivo:** `src/components/Zone.jsx` — evento `onMouseUp` / funcao `commitCard()`

```
onMouseUp na Zone
  → Verifica se dragState.active === true
  → Verifica se a zona esta vazia (via occupiedZones)
  → Verifica se a fase permite a acao (via actionResolver)
  → Se valido: context.executeAction(actionId, { zoneId, card })
  → Remove ghost element
  → context.setDragState({ active: false, fromIndex: null, card: null })
```

---

### 4. Cancelamento

- `mouseup` fora de uma zona valida: remove ghost e limpa dragState sem executar acao

---

# Feature: Invocacao Normal de Monstro

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Invocar um monstro e a acao mais basica do jogo. A feature valida as restricoes (fase MAIN, zona vazia, limite de uma invocacao por turno) e executa a animacao de invocacao com particulas Canvas.

---

## Fluxo Principal

### 1. Ponto de Entrada

Via drag-and-drop sobre zona de monstro, ou via botao "Normal Summon" no `ActionBar` ou `CardContextMenu`.

- **Arquivo:** `src/contexts/DuelContext.jsx` — funcao `executeAction('normalSummon', payload)`

---

### 2. Validacao (LocalEngine)

- **Arquivo:** `src/engine/LocalEngine.js` — metodo `normalSummon()`
- **Arquivo:** `src/utils/actionResolver.js` — `resolveActions(card, phase, flags)`

| Condicao | Falha se |
|----------|----------|
| Fase atual | Nao for MAIN1 ou MAIN2 |
| Limite por turno | `flags.normalSummonedThisTurn === true` |
| Zona alvo | Ja estiver ocupada |
| Tipo de carta | Nao for um monstro invocavel normalmente |

---

### 3. Mutacao de Estado

```
engine.normalSummon(zoneId, card)
  → occupiedZones[zoneId] = { card, position: 'ATK' }
  → handCards.filter(c => c.id !== card.id)
  → flags.normalSummonedThisTurn = true
```

---

### 4. Efeito Visual (FX)

- **Arquivo:** `src/utils/fx.js` — funcao `normalSummonFX(canvas, card)`

Disparado apos mutacao de estado, no `useEffect` do componente `Zone` que detecta a chegada de uma carta:

| Tipo de carta | Efeito |
|---------------|--------|
| Effect Monster | 28 particulas radiais na cor dominante da arte da carta (via Sobel) |
| Fusion Monster | Espiral de particulas purpura |
| Synchro Monster | Aneis de luz branca |
| XYZ Monster | Vortice negro com particulas escuras |
| Link Monster | Rede de nos com setas direcionais |

---

# Feature: Ativacao de Magia e Armadilha

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Magias e armadilhas sao jogadas para as zonas de magia/armadilha do campo. A feature valida a fase, o tipo de carta e a disponibilidade da zona.

---

## Fluxo Principal

### 1. Ponto de Entrada

Drag sobre zona de magia/armadilha, ou botao "Activate" / "Set" no ActionBar.

- **Arquivo:** `src/contexts/DuelContext.jsx` — `executeAction('activateSpell' | 'setTrap', payload)`

---

### 2. Validacao

| Condicao | Falha se |
|----------|----------|
| Fase atual | Magias: nao for MAIN1/MAIN2; Armadilhas podem ser setadas em qualquer fase |
| Tipo de carta | Nao for Spell Card / Trap Card |
| Zona alvo | Ja estiver ocupada |

---

### 3. Mutacao de Estado

```
engine.activateSpell(zoneId, card)
  → occupiedZones[zoneId] = { card, type: 'spell' }
  → handCards.filter(c => c.id !== card.id)
```

---

### 4. Efeito Visual

- **Arquivo:** `src/utils/fx.js` — `spellActivationFX(canvas)`
- Particulas de luz com cor baseada no atributo da carta

---

# Feature: Sistema de Ataque

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Durante a Battle Phase, o jogador seleciona um monstro proprio e clica em uma zona adversaria para declarar ataque. O engine resolve a batalha (destruicao e calculo de dano) e uma seta animada e exibida.

**Motivacao:** Combate e o mecanismo central do duelo; sem ele o jogo e apenas um exercicio de campo.
**Resultado:** Monstros com ATK maior destroem o alvo e causam dano ao LP; monstros com ATK menor sao destruidos.

---

## Fluxo Principal

### 1. Selecionar Atacante

- **Arquivo:** `src/components/Zone.jsx` — click em zona propria com monstro
- `context.selectCard({ zoneId, card, side: 'player' })`
- `context.setAttackingZone(zoneId)`
- Zonas do oponente recebem classe CSS de destaque (`highlight-attack`)

---

### 2. Selecionar Alvo

- **Arquivo:** `src/components/Zone.jsx` — `handleOpponentClick()`
- Ativo apenas quando `attackingZone !== null` e fase e `BATTLE`

```
handleOpponentClick(targetZoneId)
  → engine.handleAttackTarget(attackingZoneId, targetZoneId)
```

---

### 3. Resolucao da Batalha (LocalEngine)

- **Arquivo:** `src/engine/LocalEngine.js` — `_resolveBattle(attacker, target, targetZoneId)`

```
Se attacker.atk > target.atk:
  → Remover target de occupiedZones
  → opponentGY.push(target)
  → dano = attacker.atk - target.atk
  → opponentLP -= dano
  → lpDamageFX(canvas, dano)          ← popup flutuante "-X LP"

Se attacker.atk < target.atk:
  → Remover attacker de occupiedZones
  → playerGY.push(attacker)
  → dano = target.atk - attacker.atk
  → playerLP -= dano
  → lpDamageFX(canvas, dano)

Se iguais:
  → Ambos destruidos, nenhum dano de LP

flags.attackedZones.add(attackingZoneId)   ← impede segundo ataque no mesmo turno
setAttackingZone(null)
clearSelection()
```

---

### 4. Efeito Visual da Seta de Ataque

- **Arquivo:** `src/utils/fx.js` — `attackArrowFX(canvas, fromRect, toRect)`
- **Arquivo:** `src/fx/effects/AttackArrow.js`

```
Calcula posicao central do atacante e do alvo via getBoundingClientRect()
→ Anima linha gradiente do atacante ao alvo (requestAnimationFrame)
→ Ao atingir o alvo: burst de particulas de impacto
→ Remove canvas apos animacao
```

---

# Feature: Compra de Carta (Draw Phase)

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Na Draw Phase, o jogador deve comprar uma carta do deck. A feature impede compra fora da Draw Phase e garante que apenas uma carta seja comprada por turno.

---

## Fluxo Principal

### 1. Ponto de Entrada

- **Arquivo:** `src/components/DeckZone.jsx` — click na pilha do deck
- **Arquivo:** `src/contexts/DuelContext.jsx` — funcao `drawFromDeck()`

---

### 2. Validacao

| Condicao | Comportamento |
|----------|---------------|
| Fase != DRAW | Botao de compra desabilitado |
| `drawnThisTurn === true` | Botao desabilitado (ja comprou neste turno) |
| `deckRemaining.length === 0` | TODO: implementar condicao de derrota por deck vazio |

---

### 3. Mutacao de Estado

```
drawFromDeck()
  → carta = deckRemaining[0]
  → deckRemaining.shift()
  → handCards.push(carta)
  → drawnThisTurn = true
  → retorna carta (para eventual animacao)
```

---

# Feature: Painel de Contexto

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Ao passar o mouse sobre uma carta ou zona, um painel lateral exibe informacoes detalhadas (arte, nome, ATK/DEF, descricao, tipo de zona). Fecha automaticamente apos 6 segundos sem interacao.

---

## Fluxo Principal

### 1. Modos do Painel

- **Arquivo:** `src/components/ContextPanel.jsx`
- **Arquivo:** `src/contexts/DuelContext.jsx` — `panelMode`, `panelData`, `updatePanel()`

| Modo | Gatilho | Conteudo |
|------|---------|---------|
| `idle` | Sem interacao (timeout 6s) | Texto de instrucao |
| `card` | Hover sobre carta | Arte + nome + ATK/DEF + descricao |
| `zone` | Hover sobre zona vazia | Tipo de zona + instrucao |
| `stack` | Hover sobre GY/cemiterio | Lista de cartas na pilha |

---

### 2. Auto-hide

```
updatePanel(mode, data)
  → clearTimeout(scheduleIdleTimer)
  → setPanelMode(mode)
  → setPanelData(data)
  → scheduleIdleTimer = setTimeout(() => setPanelMode('idle'), 6000)
```

---

# Feature: Efeitos Visuais Canvas (FX)

> **Versao:** 0.1.0
> **Implementada em:** 2026-04-17
> **Status:** Concluida

---

## Resumo

Efeitos visuais baseados em Canvas 2D tornam as acoes do jogo mais expressivas. A feature inclui particulas de invocacao, seta de ataque, popups de dano ao LP e deteccao de cor dominante da arte da carta via filtro Sobel.

---

## Arquitetura do FX

- **Arquivo:** `src/utils/fx.js` — funcoes de efeito individuais
- **Arquivo:** `src/fx/FXManager.js` — gerenciador de instancias de efeito
- **Arquivo:** `src/fx/effects/AttackArrow.js` — classe de animacao da seta

Cada efeito cria um `<canvas>` sobreposto ao elemento alvo, executa a animacao via `requestAnimationFrame` e remove o canvas ao terminar.

---

## Efeitos Implementados

| Funcao | Descricao | Arquivo |
|--------|-----------|---------|
| `normalSummonFX` | 28 particulas radiais na cor dominante da carta | `fx.js` |
| `fusionSummonFX` | Espiral de particulas purpura | `fx.js` |
| `synchroSummonFX` | Aneis de luz branca expandindo | `fx.js` |
| `xyzSummonFX` | Vortice negro com particulas escuras | `fx.js` |
| `linkSummonFX` | Rede de nos com setas direcionais | `fx.js` |
| `spellActivationFX` | Particulas de luz por tipo de magia | `fx.js` |
| `attackArrowFX` | Linha gradiente animada + burst de impacto | `fx.js`, `AttackArrow.js` |
| `lpDamageFX` | Popup flutuante "-X LP" com fade-out | `fx.js` |

---

## Deteccao de Cor Dominante (Sobel)

- **Arquivo:** `src/utils/fx.js` — funcao `getDominantColor(imageEl)`

Algoritmo:
1. Desenha a arte da carta em canvas offscreen
2. Aplica filtro de deteccao de bordas Sobel (kernel 3x3)
3. Encontra o pixel de maior magnitude de gradiente
4. Usa a cor desse pixel como cor base das particulas

Resultado: cada monstro tem particulas na cor predominante de sua arte, sem configuracao manual.
