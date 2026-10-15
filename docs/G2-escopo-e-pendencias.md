# G2 — Escopo, rastreabilidade e pendências

Fonte principal: **Runbook Sprint 1 (07/10/2026)**. Em conflito com outros trechos do material, o runbook vence
(é o mais recente e define o limite de segurança).

## 1. Escopo do G2 (runbook §6)

| Entregável | Onde está |
|---|---|
| IHM Touch mock, seletor (modo) e direcional `<<` `>>` | `components/IhmTouch.tsx` |
| LEDs/estado (torre, sinaleiras, estado global) | `TowerLight`, `SafetyLamps`, `IhmTouch` |
| Botoeira visual (START, STOP, RESET, SETUP, DESLIGA) | `components/Botoeira.tsx` |
| Botões emitem eventos simulados e recebem ACK mock | `state/useMachine.ts` + `bus/events.ts` + `dev/mockProducer.ts` |
| Controles bloqueados em UNKNOWN/STALE (+ segurança/estado) | `state/derive.ts`, `state/controls.ts` |
| Aviso “SIMULAÇÃO” sempre visível | `components/SimulationBanner.tsx` (sticky) |
| E-Stop visual distinto do físico | `components/EStopVisual.tsx` |

Aceite de teste do runbook coberto aqui: *comando simulado*, *queda de conexão*, *estado inseguro/alarme*
(EMERGENCY, SAFETY_FAULT, ALARM, UNKNOWN, `safetyInterlockOk=false`), *payload inválido*.
Ainda dependem do G1: *telemetria* ponta a ponta, *tela integrada*, *setup reproduzível por outro grupo*.

## 2. Conflitos encontrados no material (resolvidos assim)

| Tema | O material diz | Decisão no código |
|---|---|---|
| Conexão | Um trecho manda o G2 ligar em `ws://192.168.0.10:8081/telemetry`, HMAC, heartbeat 100 ms | **Ignorado.** Runbook proíbe rede/IP privado e conexão própria; só mock via barramento |
| Contrato | 3 versões diferentes (`MachineState` do relatório; `TelemetryData` da especificação; `estadoGlobal/modoOperacao` do `mock_server`) | Usado o **runbook v0.1** (`machine.telemetry`, `command.requested/ack`). O mapeamento do `mock_server` fica no adaptador do G1 |
| Eventos | `smart40:telemetria` (guia) vs `smart40:*` por tipo (runbook) | Constantes em `bus/events.ts` (hipótese `smart40:<tipo>`). **Confirmar com G1** |
| Modos | `MANUAL/SEMI_AUTO/AUTO` vs `MANUAL/AUTOMATICO/MANUTENCAO` | `MANUAL/SEMI_AUTO/AUTO` (runbook/especificação) |
| Estados | `RUNNING/STOPPED/EMERGENCY/ALARM` vs `IDLE/READY/...` | Conjunto ampliado do runbook (`IDLE, READY, RUNNING, STOPPED, ALARM, SAFETY_FAULT, EMERGENCY, UNKNOWN`) |
| Cores | `--industrial-*` (relatório) vs `--smart-*` (`theme.css`) | `theme.css` fornecido, só `--smart-*` |
| Autenticação | `x-api-key`, token na URL, JWT, HMAC | Fora do escopo do módulo (é do GatewayClient do G1; nada de credencial no browser) |
| `mock_server_smart40.js` | Sem campo de segurança no formato do contrato | Não incluído; usar o mock do G1 |

## 3. Decisões que precisam de OK do instrutor / segurança da bancada

1. **E-Stop simulado bloqueado em UNKNOWN/STALE?** Hoje sim (runbook: “controles bloqueados”). Alternativa: deixar parada simulada sempre disponível. É só mexer em `controls.ts`.
2. **Rótulos** do aviso de simulação e do E-Stop (risco P0 *Safety*: “aprovar rótulos, permissões e teste”).
3. **Limite de STALE**: 3 s (`VITE_STALE_AFTER_MS`). Validar contra a cadência real do G1 (hoje 500 ms no mock).
4. **Regras de habilitação** (ex.: jog só em MANUAL e parado; troca de modo só parado; START só sem alarme/segurança) são nossa **interpretação** do painel físico. Validar com o responsável técnico — não vêm de especificação.
5. Semântica de **SETUP** e **DESLIGA** na botoeira física (o material só lista os nomes). No mock: SETUP→`STOPPED`, DESLIGA→`IDLE`.

## 4. Pendências com outros grupos

- **G1:** confirmar nomes `smart40:*`, entregar `packages/contracts` (trocar `src/contract/index.ts`), publicar `connection.state`, ACK mock com `commandId`, import map (`@smart40/ihm`).
- **Todos:** `.devcontainer/` e CI do repo comum (os do G2 estão prontos para servir de base).
- **Pedir ao responsável técnico:** significado das sinaleiras no PLC (SEGURANÇA OK/ANOMALIA ↔ `safetyInterlockOk`), antes de qualquer binding real (Sprint 2).

## 5. Ideias para o backlog (Sprint 1, ordem sugerida)

1. Trocar stand-in pelo contrato do G1 e fixtures compartilhadas.
2. Teste manual desktop + tablet (viewport) com screenshots para o PR.
3. Acessibilidade dos botões (foco já tratado; falta anúncio de `aria-live` ao bloquear).
4. Tela “IHM” com mais páginas da SIMATIC (alarmes, receitas) se o instrutor pedir.
5. Teste e2e (Playwright) do ciclo telemetria → comando → ACK.

## 6. ⚠️ Arquivos de outra implementação encontrados na pasta

Ao criar este projeto havia arquivos que **não** vieram desta base (datados 19:36–19:39, antes dela):
`src/lib/*`, `src/contracts/contrato-smart40-v0.1.ts`, `src/state/{store,store.test,useSmart40}.ts`,
`src/components/{HmiTouch,Indicators,EventLog}.tsx`, `src/dev/{DevPanel,mockBus}`, `src/mfe.tsx`, `.nvmrc`, `mock/`.
Eles formam uma 2ª implementação do mesmo módulo, com contrato **diferente** (`SET_MODE`, `ESTOP_SIM`, `BUS` dentro do contrato…).
Não foram apagados nem alterados: só foram **excluídos do typecheck/lint/testes** (`tsconfig.json`, `eslint.config.js`).
Decidir uma das duas e remover a outra antes do primeiro PR.
