# Backlog — retro-live

## Em andamento

---

## Pendentes

- [ ] YouTube Analytics dashboard — configurar Google OAuth (`client_secrets.json`)
- [ ] Integração Ollama — substituir Anthropic API para geração de descrições dos vídeos
- [ ] Correção da barra de progresso travada em 5% no pipeline de vídeo
- [ ] Empacotamento via PyInstaller — gerar `.exe` único para o sistema completo

---

## Concluídas

- [x] Estrutura inicial do projeto `retro-live`
- [x] `start.py` — ponto de entrada único com flags `--only-fightcade` e `--no-fightcade`
- [x] Suporte a `stop_event` compartilhado entre threads para shutdown via Ctrl+C
- [x] Fallback no `start.py` para `orchestrator.run()` sem `stop_event` (compatibilidade legada)
- [x] `automation/fightcade/run_all_games.py` — abre as 3 salas do Fightcade em sequência
- [x] Detecção de PLAYING via template matching (`playing.png`) com confirmação consecutiva
- [x] Heurística de linha de confronto — substituição do template VS por varredura de conteúdo visual bilateral (desvio-padrão por zona esquerda/direita)
- [x] Confirmação de SPECTATE via template matching antes de clicar — previne desafio acidental
- [x] ESC duplo após right-click sem SPECTATE — fecha menu e qualquer dialog aberto por engano
- [x] Calibração de coordenadas da sidebar: `KOF98=(64,204)`, `STREET=(72,310)`, `KOF2002=(93,389)`
- [x] Integração OBS WebSocket — troca de cena automática após spectate bem-sucedido
- [x] Variáveis de ambiente OBS no `.env` (`OBS_HOST`, `OBS_PORT`, `OBS_PASSWORD`)
- [x] Fix UnicodeEncodeError no terminal Windows (cp1252) — `sys.stdout.reconfigure(encoding="utf-8")`
- [x] `controller/orchestrator.py` aceitar `stop_event` para shutdown limpo via Ctrl+C no `start.py`
- [x] Fallback de compatibilidade removível — `orchestrator.run()` agora aceita `stop_event` nativamente
- [x] Rotação automática de cenas no OBS após os 3 jogos espectados (intervalo configurável via `SCENE_DURATION_MINUTES`)
- [x] Integração com overlay HTML — `state.json` atualizado a cada troca de cena com jogo atual, próximo e timer
- [x] Detecção de inatividade — `inactivity_watcher` re-espectata automaticamente quando jogo fica parado
- [x] Auto-launch OBS e Fightcade — `controller/launcher.py` com `ShellExecuteW` (cwd correto, UAC) + fallback subprocess
