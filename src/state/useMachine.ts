import { useCallback, useEffect, useRef, useState } from 'react';
import { emitCommandRequested, newCommandId, onCommandAck, onConnectionState, onMachineTelemetry } from '../bus/events';
import { parseCommandAck, parseConnectionState, parseMachineTelemetry } from '../bus/guards';
import type { CommandAction, CommandAckResult, CommandRequest, CommandTarget, ConnectionStateName, MachineMode, MachineTelemetryEvent } from '../contract';
import { decideControl, type ControlDecision } from './controls';
import { deriveEffectiveState, type EffectiveState } from './derive';

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
export const STALE_AFTER_MS = num(import.meta.env?.VITE_STALE_AFTER_MS, 3000);
export const ACK_TIMEOUT_MS = num(import.meta.env?.VITE_ACK_TIMEOUT_MS, 2000);

export interface CommandLogEntry {
  commandId: string;
  action: CommandAction;
  at: string;
  status: 'PENDENTE' | CommandAckResult | 'SEM_ACK';
  message?: string;
}

export interface Machine {
  state: EffectiveState;
  connection: ConnectionStateName | null;
  log: CommandLogEntry[];
  invalidCount: number;
  decide: (a: CommandAction) => ControlDecision;
  send: (action: CommandAction, mode?: Exclude<MachineMode, 'UNKNOWN'>) => void;
}

const TARGET: Record<CommandAction, CommandTarget> = {
  START: 'ihm.botoeira',
  STOP: 'ihm.botoeira',
  RESET: 'ihm.botoeira',
  SETUP: 'ihm.botoeira',
  DESLIGA: 'ihm.botoeira',
  EMERGENCY_STOP_SIM: 'ihm.botoeira',
  MODE_SELECT: 'ihm.touch',
  JOG_BACKWARD: 'ihm.touch',
  JOG_FORWARD: 'ihm.touch',
};

/** Único ponto de acesso da UI ao barramento: consome telemetria, aplica regras e emite comandos simulados. */
export function useMachine(): Machine {
  const [telemetry, setTelemetry] = useState<MachineTelemetryEvent | null>(null);
  const [receivedAtMs, setReceivedAtMs] = useState<number | null>(null);
  const [connection, setConnection] = useState<ConnectionStateName | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [log, setLog] = useState<CommandLogEntry[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const seenEventIds = useRef(new Set<string>());

  useEffect(() => {
    const offT = onMachineTelemetry((raw) => {
      const ev = parseMachineTelemetry(raw);
      if (!ev) {
        setInvalidCount((n) => n + 1);
        console.warn('[G2] machine.telemetry inválido descartado', raw);
        return;
      }
      // Idempotência: o mesmo eventId (handoff) não reprocessa.
      if (seenEventIds.current.has(ev.eventId)) return;
      seenEventIds.current.add(ev.eventId);
      if (seenEventIds.current.size > 500) seenEventIds.current.clear();
      setTelemetry(ev);
      setReceivedAtMs(Date.now());
    });
    const offC = onConnectionState((raw) => {
      const ev = parseConnectionState(raw);
      if (!ev) {
        setInvalidCount((n) => n + 1);
        return;
      }
      setConnection(ev.data.state);
    });
    const offA = onCommandAck((raw) => {
      const ev = parseCommandAck(raw);
      if (!ev) {
        setInvalidCount((n) => n + 1);
        return;
      }
      const id = ev.data.commandId;
      const t = timers.current.get(id);
      if (t) clearTimeout(t);
      timers.current.delete(id);
      setLog((l) => l.map((e) => (e.commandId === id ? { ...e, status: ev.data.result, message: ev.data.message } : e)));
    });
    const tick = setInterval(() => setNowMs(Date.now()), 500);
    const pending = timers.current;
    return () => {
      offT();
      offC();
      offA();
      clearInterval(tick);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  const state = deriveEffectiveState({ telemetry, receivedAtMs, connection, nowMs, staleAfterMs: STALE_AFTER_MS });

  const decide = useCallback((a: CommandAction) => decideControl(a, state), [state]);

  const send = useCallback(
    (action: CommandAction, mode?: Exclude<MachineMode, 'UNKNOWN'>) => {
      // Rechecagem no momento do clique (estado pode ter mudado entre render e clique).
      if (!decideControl(action, state).enabled) return;
      const commandId = newCommandId();
      const cmd: CommandRequest = {
        commandId,
        target: TARGET[action],
        action,
        origin: 'ihm',
        ...(mode ? { params: { mode } } : {}),
        simulation: true,
      };
      emitCommandRequested(cmd);
      setLog((l) => [{ commandId, action, at: new Date().toISOString(), status: 'PENDENTE' as const }, ...l].slice(0, 20));
      timers.current.set(
        commandId,
        setTimeout(() => {
          timers.current.delete(commandId);
          setLog((l) => l.map((e) => (e.commandId === commandId && e.status === 'PENDENTE' ? { ...e, status: 'SEM_ACK', message: 'ACK não recebido' } : e)));
        }, ACK_TIMEOUT_MS),
      );
    },
    [state],
  );

  return { state, connection, log, invalidCount, decide, send };
}
