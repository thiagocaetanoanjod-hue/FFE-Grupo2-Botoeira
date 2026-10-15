import type {
  CommandAckData,
  ConnectionStatus,
  MachineTelemetryData,
} from '../contracts/contrato-smart40-v0.1';

export interface LogEntry {
  id: string;
  at: string; // ISO
  kind: 'TELEMETRY' | 'COMMAND' | 'ACK' | 'BLOCKED' | 'INVALID' | 'CONNECTION';
  text: string;
}

export interface PendingCommand {
  commandId: string;
  action: string;
  sentAt: string;
  ack?: CommandAckData;
}

export interface State {
  machine: MachineTelemetryData | null;
  lastTelemetryAt: number | null; // epoch ms
  externalConnection: ConnectionStatus | null; // vindo do G1 (connection.state)
  seenEventIds: string[];
  commands: PendingCommand[];
  log: LogEntry[];
  invalidCount: number;
}

export const initialState: State = {
  machine: null,
  lastTelemetryAt: null,
  externalConnection: null,
  seenEventIds: [],
  commands: [],
  log: [],
  invalidCount: 0,
};

export type Action =
  | { type: 'telemetry'; eventId: string; data: MachineTelemetryData; at: number }
  | { type: 'connection'; status: ConnectionStatus }
  | { type: 'command-sent'; commandId: string; action: string; at: string }
  | { type: 'ack'; data: CommandAckData; at: string }
  | { type: 'blocked'; action: string; reason: string; at: string }
  | { type: 'invalid'; reason: string; at: string };

const MAX_LOG = 100;
const MAX_SEEN = 200;
const push = (log: LogEntry[], e: Omit<LogEntry, 'id'>): LogEntry[] =>
  [{ ...e, id: `${e.at}-${log.length}-${Math.random().toString(36).slice(2, 6)}` }, ...log].slice(0, MAX_LOG);

export function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'telemetry': {
      // Idempotência: mesmo eventId não é processado duas vezes (handoffs preservam eventId).
      if (s.seenEventIds.includes(a.eventId)) return s;
      const changed = !s.machine || s.machine.status !== a.data.status || s.machine.mode !== a.data.mode ||
        s.machine.emergencyActive !== a.data.emergencyActive || s.machine.safetyInterlockOk !== a.data.safetyInterlockOk;
      return {
        ...s,
        machine: a.data,
        lastTelemetryAt: a.at,
        seenEventIds: [a.eventId, ...s.seenEventIds].slice(0, MAX_SEEN),
        // só registra no log quando algo relevante mudou (evita encher o log a cada 500 ms)
        log: changed
          ? push(s.log, {
              at: new Date(a.at).toISOString(),
              kind: 'TELEMETRY',
              text: `status=${a.data.status} modo=${a.data.mode ?? 'N/D'} emerg=${fmt(a.data.emergencyActive)} seg=${fmt(a.data.safetyInterlockOk)}`,
            })
          : s.log,
      };
    }
    case 'connection':
      return {
        ...s,
        externalConnection: a.status,
        log: s.externalConnection === a.status ? s.log : push(s.log, { at: new Date().toISOString(), kind: 'CONNECTION', text: `conexão: ${a.status}` }),
      };
    case 'command-sent':
      return {
        ...s,
        commands: [{ commandId: a.commandId, action: a.action, sentAt: a.at }, ...s.commands].slice(0, 20),
        log: push(s.log, { at: a.at, kind: 'COMMAND', text: `${a.action} (simulation:true) id=${a.commandId.slice(0, 8)}` }),
      };
    case 'ack': {
      const known = s.commands.some((c) => c.commandId === a.data.commandId);
      if (!known) return s; // ACK de outro módulo: ignora
      return {
        ...s,
        commands: s.commands.map((c) => (c.commandId === a.data.commandId ? { ...c, ack: a.data } : c)),
        log: push(s.log, { at: a.at, kind: 'ACK', text: `ACK ${a.data.status} id=${a.data.commandId.slice(0, 8)}${a.data.message ? ' · ' + a.data.message : ''}` }),
      };
    }
    case 'blocked':
      return { ...s, log: push(s.log, { at: a.at, kind: 'BLOCKED', text: `${a.action} bloqueado: ${a.reason}` }) };
    case 'invalid':
      return { ...s, invalidCount: s.invalidCount + 1, log: push(s.log, { at: a.at, kind: 'INVALID', text: `payload descartado: ${a.reason}` }) };
  }
}

const fmt = (v: boolean | undefined) => (v === undefined ? 'N/D' : v ? 'sim' : 'não');

/** Conexão efetiva = o que o G1 informou, rebaixada para STALE se a telemetria envelheceu. */
export function deriveConnection(
  s: Pick<State, 'externalConnection' | 'lastTelemetryAt'>,
  now: number,
  staleAfterMs: number,
): ConnectionStatus {
  if (s.externalConnection === 'DISCONNECTED') return 'DISCONNECTED';
  if (s.lastTelemetryAt === null) return 'CONNECTING';
  if (now - s.lastTelemetryAt > staleAfterMs) return 'STALE';
  return 'CONNECTED';
}
