# system-feature-flows.md — retro-live

Registro histórico das funcionalidades implementadas no sistema `retro-live` e seus fluxos internos.

---

# Feature: Automação de Spectate no Fightcade

## Resumo

Automatiza a navegação dentro do Fightcade para encontrar partidas ativas em até 3 salas de jogos e iniciar o modo spectate em cada uma, sem intervenção manual. Resolve o problema de precisar abrir partidas manualmente antes de cada live.

## Fluxo principal

### 1. Ponto de entrada

`automation/fightcade/run_all_games.py` — função `main()` ou `open_game_and_spectate()` quando chamada pelo `start.py`. Recebe a lista `GAMES`, uma tupla de `(nome, ponto_sidebar, scene_obs)` para cada jogo.

### 2. Validação de entrada

Antes de qualquer automação, os templates de imagem são carregados via `load_template()`. Se `playing.png` ou `spectate.png` não existirem em `assets/`, o script lança `FileNotFoundError` imediatamente e aborta — evitando executar automação cega sem referências visuais.

### 3. Orquestração da aplicação

Para cada jogo em `GAMES`, `open_game_and_spectate()` coordena:

1. Foca a janela do Fightcade via Win32 API (`SetForegroundWindow`)
2. Clica na sala do jogo na sidebar
3. Aguarda `ROOM_LOAD_WAIT=3s` para a sala carregar
4. Chama `scroll_until_spectated()` que rola a coluna de players e executa a detecção
5. Se spectate bem-sucedido, chama `obs_client.set_current_program_scene()`

### 4. Regras de negócio

**Detecção de PLAYING:** o template `playing.png` precisa ser confirmado `REQUIRED_CONSECUTIVE_MATCHES=2` vezes consecutivas antes de agir. Isso evita falsos positivos em frames de transição.

**Identificação de linha de confronto:** não depende de template específico (VS, FT3, FT5, etc.). Em vez disso, varre linhas abaixo do header PLAYING com passo `ROW_HEIGHT=32px` e valida cada linha pela presença de conteúdo visual em duas zonas horizontais — zona esquerda (x 5–90, onde fica o player 1) e zona direita (x 248–335, player 2). O critério é `desvio-padrão > CONTENT_STD_THRESHOLD=12`: fundo liso tem std baixo, texto/sprite tem std alto.

**Confirmação via SPECTATE:** mesmo que a linha passe na heurística bilateral, o right-click só é considerado válido se o menu de contexto exibir o item `spectate.png`. Isso garante que o bot nunca desafia um player por engano.

**Detecção de fim de lista:** se `MAX_STALLED_SCROLLS=6` scrolls consecutivos produzirem `diff < STALL_DIFF_THRESHOLD=1.2` na captura da coluna, considera-se que chegou ao fim da lista e não há partida ativa.

### 5. Persistência / Integrações

- **Win32 API** (`ctypes.windll.user32`): foco, restauração e posição da janela do Fightcade
- **PyAutoGUI**: movimentação de mouse, cliques, scroll e captura de tela
- **OpenCV**: template matching (`TM_CCOEFF_NORMED`) para PLAYING e SPECTATE; cálculo de desvio-padrão para heurística de linha
- **OBS WebSocket** (`obsws_python.ReqClient`): troca de cena após spectate bem-sucedido

### 6. Resposta final

`scroll_until_spectated()` retorna `True` se espectou com sucesso ou `False` se esgotou a lista. `open_game_and_spectate()` não retorna valor — o efeito colateral é a partida aberta no Fightcade e a cena trocada no OBS.

## Fluxos alternativos e erros

**Sem partida ativa:** a lista é rolada até o fim (`MAX_STALLED_SCROLLS` sem mudança visual). O jogo é pulado e o sistema avança para o próximo.

**SPECTATE não encontrado no menu:** ESC duplo é enviado — o primeiro fecha o menu de contexto, o segundo fecha qualquer dialog de desafio que possa ter aberto por engano. O bot tenta a próxima linha candidata.

**OBS não disponível:** a conexão é tentada no início de `run_fightcade()`. Se falhar, segue sem troca de cenas — a automação do Fightcade não é bloqueada por indisponibilidade do OBS.

**Fightcade não encontrado:** `get_window_handle()` lança `RuntimeError` se a janela com o título exato `"Fightcade - Online retro gaming"` não for encontrada. O erro é capturado no `start.py` e logado.

## Decisões técnicas importantes

**Heurística de std em vez de template VS:** o Fightcade exibe formatos diferentes dependendo do tipo de desafio — VS para casual, FT3/FT5/FT10 para ranked. Usar template matching para cada formato seria frágil e exigiria manutenção constante. O desvio-padrão por zona é agnóstico ao formato e funciona para qualquer confronto.

**ESC duplo:** um único ESC fecha o menu de contexto mas não fecha um dialog de desafio que já tenha sido aberto. O ESC duplo com `0.15s` de intervalo cobre ambos os casos.

**Confirmação consecutiva de PLAYING:** uma única detecção pode ser falso positivo durante scroll. Exigir 2 detecções consecutivas praticamente elimina esse caso.

**Win32 direto em vez de pywinauto:** `ctypes.windll.user32` não tem dependência externa e é mais estável para operações simples de foco e posição de janela.

## Trechos de código relevantes

```python
# Heurística de conteúdo visual por zona
def _zone_has_content(img_gray, x_start, x_end):
    zone = img_gray[:, x_start:x_end]
    return float(np.std(zone.astype(np.float32))) > CONTENT_STD_THRESHOLD

# Proteção contra desafio acidental
if not found:
    pyautogui.press("escape")
    time.sleep(0.15)
    pyautogui.press("escape")
    return False
```

---

# Feature: Integração OBS WebSocket — Troca de Cena por Jogo

## Resumo

Conecta o sistema de automação do Fightcade ao OBS Studio via WebSocket v5, trocando automaticamente a cena ativa no OBS assim que o spectate de cada jogo é confirmado. Fecha o loop da live: Fightcade abre a partida, OBS já exibe a cena correta.

## Fluxo principal

### 1. Ponto de entrada

`start.py` — função `run_fightcade()`. Antes de iniciar a sequência de jogos, instancia `obsws_python.ReqClient` com as credenciais do `.env`.

### 2. Validação de entrada

As variáveis `OBS_HOST`, `OBS_PORT` e `OBS_PASSWORD` são lidas do `.env` via `os.getenv()` com valores padrão (`localhost`, `4455`, `""`). Se a conexão falhar, o erro é capturado e logado — o sistema não aborta.

### 3. Orquestração da aplicação

O `obs_client` é passado como argumento para `open_game_and_spectate()`. Após `scroll_until_spectated()` retornar `True`, a troca de cena é executada imediatamente antes do `BETWEEN_GAMES_WAIT`.

### 4. Regras de negócio

Cada jogo em `GAMES` carrega seu `scene_name` correspondente:

- `KOF_98` → `SCENE_KOF98`
- `STREET` → `SCENE_SF3`
- `KOF_2002` → `SCENE_KOF2002`

A troca só ocorre se `spectated=True`. Jogos sem partida ativa não alteram a cena do OBS.

### 5. Persistência / Integrações

- **obsws-python** (`ReqClient`): protocolo OBS WebSocket v5
- **OBS Studio**: cenas `SCENE_KOF98`, `SCENE_SF3`, `SCENE_KOF2002`, `SCENE_BREAK`, `SCENE_FALLBACK`
- **`.env`**: `OBS_HOST`, `OBS_PORT`, `OBS_PASSWORD`

### 6. Resposta final

`set_current_program_scene()` não retorna valor relevante. O efeito é a cena ativa no OBS mudar visualmente em tempo real durante a live.

## Fluxos alternativos e erros

**OBS desconectado durante a sequência:** o `try/except` em torno de `set_current_program_scene()` loga o erro e continua — a sequência de jogos não é interrompida por falha de OBS.

**Nome de cena inexistente no OBS:** o OBS WebSocket retorna erro que é capturado pelo `except Exception`. O log exibe `[OBS] Falha ao trocar cena: ...` e o fluxo segue.

## Decisões técnicas importantes

**OBS client instanciado no worker, não no main:** o `obsws_python.ReqClient` é criado dentro de `run_fightcade()` e não no `__main__`. Isso isola a dependência do OBS do orquestrador e permite rodar `--only-fightcade` sem conflito.

**Degradação graciosa:** se o OBS não estiver disponível, a automação do Fightcade funciona normalmente. O sistema nunca bloqueia em dependência de OBS.

---

# Feature: Start único com suporte a múltiplos modos de execução

## Resumo

`start.py` é o ponto de entrada único do sistema. Inicializa o orquestrador e a automação do Fightcade em threads paralelas com um `stop_event` compartilhado, permitindo shutdown limpo via Ctrl+C. Suporta flags para execução parcial durante desenvolvimento e debug.

## Fluxo principal

### 1. Ponto de entrada

`python start.py` (modo completo), `--only-fightcade` (só automação Fightcade) ou `--no-fightcade` (só orquestrador).

### 2. Validação de entrada

`check_env()` verifica `OBS_PASSWORD` no ambiente. Em modo `--only-fightcade`, a verificação de OBS é pulada (`skip_obs=True`).

### 3. Orquestração da aplicação

Um `threading.Event` compartilhado (`stop_event`) é passado para todas as threads. O `__main__` fica em loop de `time.sleep(0.5)` aguardando Ctrl+C ou que o evento seja sinalizado por qualquer thread.

### 4. Regras de negócio

Cada worker é uma `daemon=True` thread — se o processo principal morrer, as threads morrem junto. O join com `timeout=10` dá até 10 segundos para cada thread encerrar graciosamente antes do processo terminar.

### 5. Persistência / Integrações

- `controller.orchestrator.run()`: suporta fallback sem `stop_event` para compatibilidade com versão legada via `TypeError` catch
- `automation.fightcade.run_all_games`: importado dinamicamente dentro do worker

### 6. Resposta final

O processo encerra com código 0 após todas as threads finalizarem ou timeout de join.

## Fluxos alternativos e erros

**Orchestrator não aceita stop_event:** `TypeError` é capturado silenciosamente e `run()` é chamado sem argumento. Quando o orchestrator for atualizado, o fallback é removido.

**Import de módulo faltando:** se `automation.fightcade.run_all_games` não for encontrado, o worker loga o erro, sinaliza `stop_event` e encerra — evitando que o sistema fique rodando sem a automação ativa.

## Decisões técnicas importantes

**Fallback de compatibilidade para o orchestrator:** em vez de bloquear o sistema inteiro por uma assinatura desatualizada, o `TypeError` é tratado como caso esperado e temporário. Isso permite evolução incremental sem quebrar o fluxo principal.

**Threads daemon:** garante que Ctrl+C no terminal encerra tudo — sem processos órfãos em background.
