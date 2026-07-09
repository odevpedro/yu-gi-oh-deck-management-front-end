# System Feature Flows — yugioh-duel-react

## 1. Autenticação (Login/Registro)

**Arquivos:** `LoginPage.jsx`, `AuthContext.jsx`, `authService.js`, `tokenManager.js`, `ProtectedRoute.jsx`

**Fluxo:**
1. Usuário acessa `/` → `LoginPage` renderiza formulário de login/registro
2. Modo local: `startLocalSession()` → `AuthContext` seta `user` com role `LOCAL` → redireciona para `/duel/local`
3. Modo online: `login()` ou `register()` → `authService` faz POST para `/auth/login` ou `/auth/register`
4. Resposta contém `accessToken` + `refreshToken` → `tokenManager` persiste em localStorage
5. `AuthContext` decodifica JWT para extrair `userId`, `username`, `role`
6. `ProtectedRoute` verifica `user` — se ausente, redireciona para `/`

**Estados:** `login`/`register` toggle, loading, erro de validação (senhas não conferem), erro de rede.

---

## 2. Criação de Duelo (Lobby)

**Arquivos:** `LobbyPage.jsx`, `duelService.js`, `deckService.js`

**Fluxo:**
1. Usuário autenticado acessa `/lobby` → `LobbyPage` carrega lista de decks via `listDecks()` (se não for LOCAL)
2. Usuário preenche Player B ID, seleciona deck (opcional), clica "Criar duelo"
3. `createDuel()` faz POST para `/api/duels` com `playerAId`, `playerBId`, `playerADeckId`
4. Resposta contém `duelId` → navega para `/duel/{duelId}`
5. Botão "Modo local" navega para `/duel/local` (pula etapa de criação)

**Estados:** loading decks, loading criação, erro, lista vazia.

---

## 3. Duelo Local (vs AI)

**Arquivos:** `DuelPage.jsx`, `DuelContext.jsx`, `LocalEngine.js`, `useAiOpponent.js`, `engine/index.js`

**Fluxo:**
1. `/duel/local` → `DuelPage` detecta `duelId === 'local'`
2. `resetDuel()` limpa estado global
3. `initDeck()`: busca 20 cartas da YGOPro API (fallback para cartas mock)
4. `initOpponent()`: busca 20 cartas (offset 20) + distribui 5 na mão do oponente
5. `setHandCards()`: busca 7 cartas específicas (Fusion, Synchro, Xyz, Link, Effect, Spell, Trap) via 7 requests paralelos
6. `DuelContext` gerencia turnos, fases, LP, zonas ocupadas, mão, deck
7. `useAiOpponent()` hook reage a `turn` e `phase.id` — executa ações automáticas no turno par:
   - **DRAW:** compra carta
   - **MAIN1/MAIN2:** invoca monstro em posição de ataque, baixa Spell/Trap
   - **BATTLE:** ataca monstro de menor ATK ou ataque direto
   - **END:** avança fase
8. `LocalEngine` processa ações do jogador via `executeAction()` (invocar, setar, atacar, mudar posição, flip summon, etc.)
9. Regras validadas em `actionResolver.js`:
   - Normal Summon/Set apenas 1x por turno na Main Phase
   - Sem ataque no turno 1
   - Monster face-down não pode atacar
   - Ataque direto apenas se oponente não tiver monstros
   - Flip Summon apenas na Main Phase (não no turno que foi setado)
   - Change Position apenas 1x por turno na Main Phase
10. LP < 0 → `gameResult` definido → `ResultScreen` exibe

**Canvas FX (utils/fx.js):**
- `normalSummonFX`: partículas douradas + anéis expansivos
- `specialSummonFX`: animações específicas por tipo (Fusion espirais, Synchro anéis, Xyz estrelas, Link nós, Ritual linhas)
- `spellActivationFX`: pentágono verde (Spell) / triângulo roxo (Trap)
- `sobelEdgeGlow`: detecção de borda Sobel com cor dominante
- `attackFX`: projétil linear + anel de impacto
- `lpDamageFX`: número flutuante vermelho + shake da barra
- `drawCardAnimation`: ghost card do deck → mão

**AttackArrow (fx/effects/AttackArrow.js):**
- Seta SVG fina cinza
- Fase 1: charge (pulsação no atacante)
- Fase 2: travel (curva bezier com glow)
- Fase 3: impacto + dissolução com filtro Sobel + estilhaços

---

## 4. Duelo Online (WebSocket)

**Arquivos:** `DuelPage.jsx`, `WebSocketEngine.js`, `duelWebSocket.js`, `remoteStateMapper.js`

**Fluxo:**
1. `/duel/{duelId}` com `duelId !== 'local'` → modo remoto
2. `getDuelState(duelId)` busca estado inicial via REST
3. `createDuelClient()` cria conexão STOMP via SockJS:
   - Subscribe: `/topic/duel/{duelId}` (atualizações)
   - Subscribe: `/topic/duel/{duelId}/over` (fim)
   - Send: `/app/duel.action` (ações)
   - Send: `/app/duel.phase` (avançar fase)
4. Reconexão automática: até 10 tentativas, delay 2s entre tentativas
5. `configureRemoteTransport()` expõe `sendAction` e `advancePhase`
6. `applyRemoteState()` mapeia estado via `remoteStateMapper.js`
7. Ações do jogador são enviadas via WebSocket em vez de processadas localmente
8. Ao receber `status === 'FINISHED'`, `gameResult` é definido

**remoteStateMapper.js:**
- Mapeia `playerA`/`playerB` → `player`/`opponent` baseado em `playerId`
- Converte posições: `DEFENSE_FACE_DOWN` → `faceDown: true`
- Mapeia `monsterZones`/`spellTrapZones` → `occupiedZones` com prefixo `pm`/`om`/`ps`/`os`
- Converte fase: `MAIN_1` → `MAIN1`, `MAIN_2` → `MAIN2`

---

## 5. Seleção de Carta e Ações

**Arquivos:** `ActionBar.jsx`, `CardContextMenu.jsx`, `CardWrap.jsx`, `Zone.jsx`, `actionResolver.js`, `engine/`

**Fluxo:**
1. Clique na carta na mão (`CardWrap`) → `selectCard({ card, location: 'hand', index })` → `DuelContext.selectedCard`
2. Clique na carta no campo (`Zone`) → `selectCard({ card, location: 'field', zoneKey })`
3. `ActionBar` (barra inferior) e `CardContextMenu` (menu flutuante) consomem `selectedCard`
4. Ambos chamam `engine.getAvailableActions()` ou `resolveActions()` com contexto atual:
   - Ações de monstro na mão: Summon, Set
   - Ações de Spell na mão: Activate, Set
   - Ações de Trap na mão: Set
   - Ações de monstro no campo: Attack, Change Position, Flip Summon
   - Ações de Spell/Trap no campo: Activate
   - Universais: View Details, Cancel
5. Cada ação possui: `id`, `label`, `icon`, `color`, `available` (boolean), `reason` (string, se indisponível)
6. Ação disponível → `executeAction(actionId)` → processa no `DuelContext` ou `LocalEngine`
7. Tooltip em ações indisponíveis explica o motivo (ex: "Cannot attack on the first turn")

**CardWrap (CardWrap.jsx):**
- Inclinação 3D com `--rx`/`--ry` CSS via pointer move
- Drag da carta com ghost visual
- Hover → highlight zonas válidas + ContextPanel update

---

## 6. Ataque e Resolução de Batalha

**Arquivos:** `LocalEngine.js`, `Zone.jsx`, `actionResolver.js`, `HUD.jsx`

**Fluxo:**
1. Jogador seleciona monstro no campo → clica "Attack" → `attackingZone` definido
2. Zonas do oponente destacadas com classe `zone--attack-valid`
3. Clique em zona do oponente (`Zone` com `side === 'opponent'`) dispara `handleOpponentClick()`
4. `engine.handleAttackTarget()` resolve:
   - **Ataque direto:** se oponente sem monstros → `dealDamage(atk, 'opponent')`
   - **Monster vs Monster:**
     - ATK atacante > ATK/DEF defensor → defensor destruído
     - ATK atacante < ATK/DEF defensor → atacante destruído + dano ao jogador (se ATK vs ATK)
     - Empate → ambos destruídos
   - Flip de face-down ao ser atacado
   - Marca `hasAttackedThisTurn` no slot atacante
5. FX: `attackArrow.fire()` (SVG charge → travel → impacto) + `lpDamageFX` (número flutuante + shake barra)

---

## 7. Fases do Turno

**Arquivos:** `DuelContext.jsx`, `DuelField.jsx`, `PhaseOverlay.jsx`

**Fases:** DRAW → STANDBY → MAIN1 → BATTLE → MAIN2 → END

**Fluxo:**
1. `nextPhase()` avança `phaseIndex` — ao final de END, incrementa `turn` e reseta para DRAW
2. `triggerOverlay()` → `PhaseOverlay` via portal com animação fade/slide
3. Auto-draw na DRAW phase: `useEffect` detecta `phase.id === 'DRAW' && !drawnThisTurn`
4. `canDraw`, `canSummon`, `canAttack` derivados da fase atual
5. Botão "NEXT ›" / "END TURN" no `DuelField`
6. Turn timer: 60s, countdown via `setInterval`, warning visual abaixo de 10s

---

## 8. Histórico de Duelos

**Arquivos:** `HistoryPage.jsx`, `duelService.js`

**Fluxo:**
1. Usuário acessa `/history` → `HistoryPage` chama `getPlayerHistory(playerId)`
2. Resposta: lista de duelos com `duelId`, `winnerId`, `playerAFinalLp`, `playerBFinalLp`, `turnCount`, `duelType`, `finishedAt`
3. Renderiza cards VITÓRIA/DERROTA com data, LP final, turnos, tipo
4. Estado vazio: "Nenhum duelo encontrado."
5. Erro: mensagem em vermelho

---

## 9. Conceder Duelo

**Arquivos:** `HUD.jsx`, `DuelContext.jsx`, `ResultScreen.jsx`

**Fluxo:**
1. Clique em "CONCEDER" no HUD → modal de confirmação
2. Confirma → `setGameResult({ isVictory: false })` → `ResultScreen` exibe "DERROTA"
3. Cancela → modal fecha

---

## 10. Context Panel (Painel Lateral)

**Arquivos:** `ContextPanel.jsx`, `DuelContext.jsx`

**Modos:**
- `idle`: estado padrão com logo e último visualizado
- `card`: detalhes da carta (nome, tipo, atributo, level/rank/link, ATK/DEF, efeito, imagem)
- `zone`: informações da zona (nome, função, ocupada/vazia)
- `stack`: informações de pilha (G.Y., Deck, Extra) com contagem

**Ativação:**
- Hover em `CardWrap` → `updatePanel('card', {...})`
- Hover em `Zone` com carta → `updatePanel('card', {...})`
- Auto-idle após 6s sem interação
- `panelLastData` mantém último conteúdo após sair de hover

---

## 11. Drag & Drop

**Arquivos:** `CardWrap.jsx`, `PlayerHand.jsx`, `Zone.jsx`, `DuelContext.jsx`

**Fluxo:**
1. `CardWrap` mousedown → ghost visual, `startDrag(index, card)`
2. Mousemove → ghost segue cursor com tilt
3. Mouseup sobre `Zone` com classe `drop-target` → `handleMouseUp()` → `placeCardInZone()` + `removeCardFromHand()`
4. Mouseup fora → ghost removido, `endDrag()`
5. Destaque de zonas: `PlayerHand` adiciona `drop-target` nas zonas compatíveis ao hover/select
6. Apenas durante Main Phase (bloqueado via `canSummon`)

---

## 12. Sistema de Log

**Arquivos:** `DuelLog.jsx`, `DebugPanel.jsx`, `logger.js`

**DuelLog:**
- Botão toggle no canto inferior direito
- Lista de instruções com timestamp
- Máximo 100 entradas

**DebugPanel (DEV apenas):**
- Toggle com backtick ou botão no canto inferior esquerdo
- Filtro por tag: ALL, ATTACK, ENGINE, STATE, FX, PHASE, SUMMON, ERROR
- Logger singleton com subscribe/unsubscribe pattern
- Console log estilizado + armazenamento em memória (80 entradas máx)

---

## 13. Error Handling

**Arquivos:** `ErrorBoundary.jsx`, `ToastContext.jsx`

**ErrorBoundary:**
- Classe React com `getDerivedStateFromError`
- Renderiza tela de erro com mensagem e botão "RECARREGAR"
- Envolve toda a aplicação em `App.jsx`

**ToastContext:**
- Provider com `showToast(message, type, duration)`
- Tipos: `info` (padrão)
- Auto-remove após duração (4s padrão)
- Clique para dismiss
- Renderizado como container fixo no canto
