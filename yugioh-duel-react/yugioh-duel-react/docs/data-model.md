# Data Model — yugioh-duel-react

## DuelContext (Estado Global)

O estado completo do duelo é gerenciado pelo `DuelProvider` em `src/contexts/DuelContext.jsx` via múltiplos `useState`. Não utiliza `useReducer`.

### Turn / Phase

| Campo          | Tipo       | Padrão | Descrição                                 |
|----------------|------------|--------|-------------------------------------------|
| `turn`         | `number`   | 1      | Número do turno atual                     |
| `phaseIndex`   | `number`   | 0      | Índice da fase atual (0-5)                |
| `drawnThisTurn`| `boolean`  | false  | Se já comprou neste turno                 |
| `phaseOverlay` | `object`   | null   | Objeto `{ id, label }` da fase em transição |
| `turnTimer`    | `number`   | 60     | Timer regressivo em segundos              |
| `phase`        | `object`   | —      | Derivado: `PHASES[phaseIndex]`            |
| `canDraw`      | `boolean`  | —      | `phase.id === 'DRAW' && !drawnThisTurn`   |
| `canSummon`    | `boolean`  | —      | `phase.id === 'MAIN1' || MAIN2`           |
| `canAttack`    | `boolean`  | —      | `phase.id === 'BATTLE`                    |

**PHASES constant:**
```js
[
  { id: 'DRAW',    label: 'DRAW',    short: 'DP'  },
  { id: 'STANDBY', label: 'STANDBY', short: 'SBP' },
  { id: 'MAIN1',   label: 'MAIN 1',  short: 'MP1' },
  { id: 'BATTLE',  label: 'BATTLE',  short: 'BP'  },
  { id: 'MAIN2',   label: 'MAIN 2',  short: 'MP2' },
  { id: 'END',     label: 'END',     short: 'EP'  },
]
```

### Flags (Per-turn)

| Campo                       | Tipo     | Padrão | Descrição                         |
|-----------------------------|----------|--------|-----------------------------------|
| `normalSummonedThisTurn`    | `boolean`| false  | Já fez Normal Summon/Set no turno |
| `positionChangedThisTurn`   | `boolean`| false  | Já mudou posição de batalha       |
| `attackedZones`             | `Set`    | `new Set()` | ZoneKeys dos monstros que atacaram |

### Life Points

| Campo         | Tipo     | Padrão | Descrição                     |
|---------------|----------|--------|-------------------------------|
| `playerLP`    | `number` | 8000   | LP do jogador atual           |
| `opponentLP`  | `number` | 6000   | LP do oponente (AI começa com menos) |

### Deck

| Campo               | Tipo     | Descrição                                |
|---------------------|----------|------------------------------------------|
| `deckCards[]`       | `Card[]` | Array completo de cartas do deck (20)    |
| `deckRemaining[]`   | `number[]` | Índices das cartas restantes no deck   |
| `deckViewerOpen`    | `boolean`| Estado do modal de visualização          |

### Hand

| Campo          | Tipo      | Descrição                    |
|----------------|-----------|------------------------------|
| `handCards[]`  | `Card[]`  | Cartas na mão do jogador (max 10) |

### Opponent

| Campo                      | Tipo       | Descrição                          |
|----------------------------|------------|------------------------------------|
| `opponentHand[]`           | `Card[]`   | Cartas na mão do oponente (max 10) |
| `opponentDeckCards[]`      | `Card[]`   | Deck completo do oponente          |
| `opponentDeckRemaining[]`  | `number[]` | Índices restantes do deck oponente |

### Field Zones

| Campo               | Tipo     | Descrição                                  |
|---------------------|----------|--------------------------------------------|
| `occupiedZones`     | `object`  | `{ [zoneKey]: SlotData }` — zonas ocupadas |
| `playerGY[]`        | `Card[]`  | Cemitério do jogador                        |
| `opponentGY[]`      | `Card[]`  | Cemitério do oponente                       |
| `playerBanished[]`  | `Card[]`  | Banidos do jogador                          |
| `opponentBanished[]`| `Card[]`  | Banidos do oponente                         |

### ZoneKeys

| Prefixo | Side     | Tipo         | Índices       |
|---------|----------|--------------|---------------|
| `pm`    | player   | monster      | 0–4           |
| `om`    | opponent | monster      | 0–4           |
| `ps`    | player   | spell/trap   | 0–4           |
| `os`    | opponent | spell/trap   | 0–4           |

Zonas sem zoneKey (type-based): GY, Banished, Field, Extra Deck, Deck.

### SlotData (occupiedZones value)

| Campo               | Tipo      | Descrição                              |
|---------------------|-----------|----------------------------------------|
| `card`              | `Card`    | Objeto da carta                        |
| `dataUrl`           | `string`  | URL da imagem (proxied ou data:)       |
| `position`          | `string`  | `'attack'` / `'defense'` / `'spell'`  |
| `faceDown`          | `boolean` | Se a carta está face-down              |
| `summonedThisTurn`  | `boolean` | Se foi invocada/baixada neste turno    |
| `hasAttackedThisTurn`| `boolean`| Se já atacou neste turno               |

### UI State

| Campo            | Tipo      | Descrição                              |
|------------------|-----------|----------------------------------------|
| `selectedCard`   | `object`  | `{ card, location, index?, zoneKey?, position?, menuAnchor? }` |
| `activeAction`   | `string`  | ID da ação ativa (`'attack'`, etc.)    |
| `attackingZone`  | `string`  | ZoneKey do monstro declarando ataque   |
| `dragState`      | `object`  | `{ active, fromIndex, card }`          |
| `detailCard`     | `Card`    | Carta no modal de detalhes             |
| `instruction`    | `string`  | Mensagem atual da barra de instrução   |

### Panel

| Campo            | Tipo     | Descrição                               |
|------------------|----------|-----------------------------------------|
| `panelMode`      | `string` | `'idle'` / `'card'` / `'zone'` / `'stack'` |
| `panelData`      | `any`    | Dados exibidos no painel                |
| `panelLastData`  | `any`    | Últimos dados exibidos (persistido)     |

### Result

| Campo         | Tipo      | Descrição                         |
|---------------|-----------|-----------------------------------|
| `gameResult`  | `object`  | `{ isVictory, isDraw, playerLP, opponentLP, turn, winnerId? }` |
| `showResult`  | `boolean` | Se o overlay de resultado está visível |

### Remote

| Campo                 | Tipo      | Descrição                              |
|-----------------------|-----------|----------------------------------------|
| `isRemoteDuel`        | `boolean` | Se o duelo é via WebSocket             |
| `remoteTransportRef`  | `ref`     | Referência para o transporte remoto    |

---

## Card (Objeto de carta)

Estrutura usada em `deckCards`, `handCards`, `occupiedZones.card`, etc.

| Campo           | Tipo     | Descrição                          |
|-----------------|----------|------------------------------------|
| `id`            | `number` | ID da carta (YGOPro ou backend)    |
| `cardId`        | `number` | Alias para `id` (compatibilidade)  |
| `name`          | `string` | Nome da carta                      |
| `type`          | `string` | Tipo (ex: "Effect Monster", "Spell Card") |
| `atk`           | `number?`| ATK (monstros)                     |
| `def`           | `number?`| DEF (monstros)                     |
| `level`         | `number?`| Nível (monstros)                   |
| `rank`          | `number?`| Rank (Xyz)                         |
| `linkval`       | `number?`| Valor de Link (Link)               |
| `attribute`     | `string?`| Atributo (DARK, LIGHT, etc.)       |
| `desc`          | `string?`| Descrição/efeito                   |
| `card_images`   | `array`   | `[{ image_url }]` — YGOPro format  |
| `url`           | `string?`| URL da imagem (formato alternativo) |
| `imageUrl`      | `string?`| URL da imagem (formato remoto)     |

---

## Ação (Action)

Estrutura retornada por `engine.getAvailableActions()` e `resolveActions()`.

| Campo       | Tipo      | Descrição                                |
|-------------|-----------|------------------------------------------|
| `id`        | `string`  | Identificador único (`'normal-summon'`, `'attack'`, etc.) |
| `label`     | `string`  | Rótulo de exibição (`"Summon"`, etc.)    |
| `icon`      | `string`  | Ícone unicode                            |
| `color`     | `string`  | Chave de cor (`'gold'`, `'red'`, etc.)   |
| `group`     | `string`  | Grupo (`'summon'`, `'battle'`, etc.)     |
| `available` | `boolean` | Se a ação pode ser executada             |
| `reason`    | `string?` | Motivo de indisponibilidade              |

### Ações definidas

| ID                 | Label            | Grupo      | Contexto                    |
|--------------------|------------------|------------|-----------------------------|
| `normal-summon`    | Summon           | summon     | Monstro na mão, Main Phase  |
| `set-monster`      | Set              | summon     | Monstro na mão, Main Phase  |
| `activate-spell`   | Activate         | activate   | Spell na mão                |
| `set-spell`        | Set              | set        | Spell na mão, Main Phase    |
| `set-trap`         | Set              | set        | Trap na mão, Main Phase     |
| `attack`           | Attack           | battle     | Monstro no campo, Battle Ph.|
| `change-position`  | Change Position  | position   | Monstro no campo, Main Ph.  |
| `flip-summon`      | Flip Summon      | summon     | Monster face-down, Main Ph. |
| `activate-set`     | Activate         | activate   | Spell/Trap face-down        |
| `view-details`     | View Details     | info       | Universal                   |
| `cancel`           | Cancel           | cancel     | Universal                   |

---

## Remote State (duel-service response)

Mapeado por `remoteStateMapper.js` para o formato do `DuelContext`.

### Input (duel-service)

| Campo             | Tipo       | Descrição                          |
|-------------------|------------|------------------------------------|
| `playerA`         | `PlayerState` | Estado do jogador A              |
| `playerB`         | `PlayerState` | Estado do jogador B              |
| `playerAId`       | `string`   | ID do jogador A                    |
| `playerBId`       | `string`   | ID do jogador B                    |
| `currentPhase`    | `string`   | Fase atual (`MAIN_1`, `BATTLE`, etc.) |
| `turnNumber`      | `number`   | Número do turno                    |
| `status`          | `string`   | `'IN_PROGRESS'` / `'FINISHED'`    |
| `winnerId`        | `string?`  | ID do vencedor                     |
| `activePlayerId`  | `string`   | ID do jogador ativo                |

### PlayerState

| Campo            | Tipo       | Descrição                    |
|------------------|------------|------------------------------|
| `playerId`       | `string`   | ID do jogador                |
| `lifePoints`     | `number`   | LP atuais                    |
| `hand[]`         | `Card[]`   | Cartas na mão                |
| `deck[]`         | `Card[]`   | Cartas no deck               |
| `monsterZones[]` | `Zone[]`   | `[{ index, card, position }]` |
| `spellTrapZones[]`| `Zone[]`  | `[{ index, card, position }]` |
| `graveyard[]`    | `Card[]`   | Cartas no cemitério          |

### Zone (remote)

| Campo      | Tipo     | Descrição                             |
|------------|----------|---------------------------------------|
| `index`    | `number` | Índice da zona (0-4)                  |
| `card`     | `Card`   | Carta na zona                         |
| `position` | `string` | `'ATTACK'` / `'DEFENSE'` / `'DEFENSE_FACE_DOWN'` |

---

## Ações Remotas (WebSocket)

### outbound (sendAction)

| Campo        | Tipo     | Descrição                            |
|--------------|----------|--------------------------------------|
| `actionType` | `string` | `'SUMMON'` / `'SET'` / `'SPELL'` / `'ATTACK'` |
| `cardId`     | `number` | ID da carta alvo                     |
| `targetId`   | `number` | ID da carta alvo (ataque)            |
| `zoneIndex`  | `number` | Índice da zona alvo (0-4)            |

### inbound (state update)

Payload enviado por `/topic/duel/{id}` — estrutura igual ao `PlayerState` + `currentPhase` + `turnNumber`.

### inbound (game over)

Payload enviado por `/topic/duel/{id}/over`.

---

## Result (GameResult)

| Campo         | Tipo       | Descrição                      |
|---------------|------------|--------------------------------|
| `isVictory`   | `boolean`  | Jogador venceu?                |
| `isDraw`      | `boolean`  | Empate?                        |
| `playerLP`    | `number`   | LP finais do jogador           |
| `opponentLP`  | `number`   | LP finais do oponente          |
| `turn`        | `number`   | Turno do fim do duelo          |
| `winnerId`    | `string?`  | ID do vencedor (remoto)        |

---

## ADR — Decision Log

### 2025-05-13: DuelContext usa múltiplos useState em vez de useReducer

**Decisão:** Manter múltiplos `useState` no DuelProvider para facilitar a leitura e debug incremental.

**Justificativa:** O estado tem muitas dimensões independentes (turno, LP, campo, UI, remoto). Um único reducer seria extenso e de difícil manutenção. Conforme o estado estabilizar, migrar para `useReducer` ou `useSyncExternalStore`.

### 2025-05-13: Engine isolada por contrato (DuelEngineAdapter)

**Decisão:** Toda lógica de jogo reside em `engine/LocalEngine.js` que implementa a interface `DuelEngineAdapter`. Componentes React nunca importam a engine diretamente — consomem via `DuelContext`.

**Justificativa:** Permite trocar a engine (local → WebSocket → ygopro core) sem alterar componentes. Basta mudar `engine/index.js`.

### 2025-05-13: CORS proxy para imagens

**Decisão:** Usar `https://corsproxy.io/?url=` para carregar imagens da YGOPro API.

**Justificativa:** YGOPro API não envia CORS headers. O proxy é temporário até o card-service próprio ser implementado.

### 2025-05-13: Mão inicial com cartas específicas (modo local)

**Decisão:** No modo local, a mão inicial contém 7 cartas específicas (1 Fusion, 1 Synchro, 1 Xyz, 1 Link, 1 Effect, 1 Spell, 1 Trap) buscadas via 7 requests paralelos.

**Justificativa:** Demonstra todos os tipos de carta e seus efeitos visuais sem depender de lógica de sorteio.
