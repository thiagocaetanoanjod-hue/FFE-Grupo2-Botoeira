import {
  BUS,
  SCHEMA_VERSION,
  type CommandAckData,
  type CommandAckEvent,
  type CommandAction,
  type CommandRequestedEvent,
  type ConnectionStateData,
  type ConnectionStateEvent,
  type MachineTelemetryData,
  type MachineTelemetryEvent,
  type OperationMode,
} from '../contracts/contrato-smart40-v0.1';

let seq = 0;
const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${++seq}`;

export const nowIso = () => new Date().toISOString();

/** Dispara um evento no barramento `smart40:*` (window). */
export function publish<T>(name: string, detail: T) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Escuta um evento do barramento. Retorna a função de cleanup (evita listeners duplicados na reconexão). */
export function subscribe<T>(name: string, handler: (detail: T) => void): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<T>).detail);
  window.addEventListener(name, fn);
  return () => window.removeEventListener(name, fn);
}

// ---- Validação defensiva: payload inválido é descartado e logado, nunca derruba o módulo ----
const STATUSES = ['IDLE', 'RUNNING', 'ALARM', 'SAFETY_FAULT', 'MAINTENANCE', 'UNKNOWN'];

export function isMachineTelemetry(e: unknown): e is MachineTelemetryEvent {
  const ev = e as Partial<MachineTelemetryEvent> | null;
  return (
    !!ev &&
    ev.type === 'machine.telemetry' &&
    typeof ev.eventId === 'string' &&
    typeof ev.timestamp === 'string' &&
    !Number.isNaN(Date.parse(ev.timestamp)) &&
    !!ev.data &&
    typeof ev.data.status === 'string' &&
    STATUSES.includes(ev.data.status)
  );
}
export function isConnectionState(e: unknown): e is ConnectionStateEvent {
  const ev = e as Partial<ConnectionStateEvent> | null;
  return !!ev && ev.type === 'connection.state' && !!ev.data && typeof ev.data.status === 'string';
}
export function isCommandAck(e: unknown): e is CommandAckEvent {
  const ev = e as Partial<CommandAckEvent> | null;
  return !!ev && ev.type === 'command.ack' && !!ev.data && typeof ev.data.commandId === 'string';
}

// ---- Construtores de eventos ----
export function makeCommand(
  action: CommandAction,
  target: 'BOTOEIRA' | 'IHM',
  params?: { mode?: OperationMode },
): CommandRequestedEvent {
  const commandId = uid();
  return {
    schemaVersion: SCHEMA_VERSION,
    eventId: commandId,
    type: 'command.requested',
    timestamp: nowIso(),
    source: 'mock',
    data: { commandId, target, action, originModule: 'ihm_siemens', params, simulation: true },
  };
}

export function makeTelemetry(data: MachineTelemetryData, source: 'mock' | 'gateway' = 'mock'): MachineTelemetryEvent {
  return { schemaVersion: SCHEMA_VERSION, eventId: uid(), type: 'machine.telemetry', timestamp: nowIso(), source, data };
}
export function makeAck(data: CommandAckData): CommandAckEvent {
  return { schemaVersion: SCHEMA_VERSION, eventId: uid(), type: 'command.ack', timestamp: nowIso(), source: 'mock', data };
}
export function makeConnection(data: ConnectionStateData): ConnectionStateEvent {
  return { schemaVersion: SCHEMA_VERSION, eventId: uid(), type: 'connection.state', timestamp: nowIso(), source: 'mock', data };
}

export { BUS };
