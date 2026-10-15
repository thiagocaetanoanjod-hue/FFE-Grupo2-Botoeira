# SMART 4.0 — Grupo 2 · IHM Siemens + Botoeira

Micro-frontend do **Grupo 2** (Frameworks Front-End · Planta N2 · Sprint 1).
Réplica web de ensaio da IHM SIMATIC e da botoeira (START, STOP, RESET, SETUP, DESLIGA), sinaleiras
SEGURANÇA OK / ANOMALIA, torre luminosa e cogumelo de emergência **visual**.

> ⚠️ **SIMULAÇÃO.** Nenhum controle aciona a máquina. Todo comando sai com `simulation: true`, recebe ACK mock e
> não há caminho físico. O E-Stop desta tela **não** é a parada de emergência física.

## Rodar

```bash
npm install          # Node 20 (ver .devcontainer)
npm run dev          # http://localhost:8081  (porta fixa)
npm test             # vitest
npm run lint && npm run typecheck
npm run build        # app standalone  -> dist/
npm run build:spa    # módulo single-spa -> dist-spa/main.js
```

No modo `dev` aparece um **painel DEV** (tracejado) que simula o G1: cenários NORMAL / ALARM / SAFETY_FAULT /
EMERGENCY / UNKNOWN / sem sinal de segurança, silenciar telemetria (→ STALE), desconectar/reconectar e payload
inválido. Esse painel e o `mockProducer` **não entram** no `build:spa`.

## Encaixar no App Shell (G1)

1. G1 sobe o Shell em `http://localhost:9000`; este módulo em `http://localhost:8081`.
2. Gere `npm run build:spa` e sirva `dist-spa/main.js`, ou use o override do import map
   (`window.importMapOverrides.enableUI()` → `@smart40/ihm` → `http://localhost:8081/main.js`).
3. O módulo exporta `bootstrap/mount/unmount` (`src/spa-entry.tsx`) e injeta só o seu CSS (escopado em `.g2-*`).
   O `theme.css` é importado pelo Shell.

## Estrutura

```
src/
  contract/    contrato v0.1 PROVISÓRIO (stand-in de packages/contracts do G1) — único ponto de acoplamento: index.ts
  bus/         eventos smart40:* (events.ts) e validação em runtime (guards.ts)
  state/       derive.ts (UNKNOWN/STALE) · controls.ts (regras de bloqueio, pura) · useMachine.ts (hook)
  components/  Botoeira, IhmTouch, TowerLight, SafetyLamps, EStopVisual, SimulationBanner, CommandLog
  dev/         mockProducer + DevHarness (somente standalone)
  styles/      theme.css (fornecido, NÃO editar) · g2.css (nosso, escopado)
  main.tsx     entrada standalone      spa-entry.tsx  entrada single-spa
tests/         vitest (derive, controls, guards, App)
docs/          G2-escopo-e-pendencias.md · referencia/ (guia do ambiente)
```

## Regras que o código já cumpre (runbook §7–§8)

- Sem telemetria / dado vencido (>`VITE_STALE_AFTER_MS`, padrão 3 s) / desconectado → **UNKNOWN/STALE** e **todos os controles bloqueados**, com o motivo na tela.
- Campo ausente = **N/D** (nunca `0`/`false` presumido). Sem sinal de intertravamento, nenhuma sinaleira acende e START fica bloqueado.
- Payload inválido ou enum desconhecido é **descartado e contado**, sem travar a tela. Mesmo `eventId` não é reprocessado.
- O módulo **não abre conexão** (WebSocket/REST). Só `window` events `smart40:*`.
- Sem segredos: `.env.example` só tem config pública. **Nunca** colocar IP/token/senha industrial em `VITE_*`.

## Pendências e decisões

Ver [`docs/G2-escopo-e-pendencias.md`](docs/G2-escopo-e-pendencias.md).
