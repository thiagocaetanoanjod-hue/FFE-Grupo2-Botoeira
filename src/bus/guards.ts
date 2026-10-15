/** Validação em runtime do que chega do barramento. Inválido => null (quem chama loga e descarta). */
import type {
  CommandAckEvent,
  ConnectionStateEvent,
  MachineMode,
  MachineStatus,
  MachineTelemetryEvent,
} from '../contract';

export const KNOWN_STATUS: readonly MachineStatus[] = ['IDLE', 'READY', 'RUNNING', 'STOPPED', 'ALARM', 'SAFETY_FAULT', 'EMERGENCY', 'UNKNOWN'];
export const KNOWN_MODE: readonly MachineMode[] = ['MANUAL', 'SEMI_AUTO', 'AUTO', 'UNKNOWN'];
const CONN = ['CONNECTING', 'CONNECTED', 'DISCONNECTED', 'STALE'] as const;
const ACK = ['SIMULATED', 'ACCEPTED', 'REJECTED'] as const;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';

function envelopeOf(raw: unknown, type: string): Record<string, unknown> | null {
  if (!isObj(raw) || raw.type !== type || !isStr(raw.eventId) || !isStr(raw.timestamp) || !isStr(raw.schemaVersion)) return null;
  if (Number.isNaN(Date.parse(raw.timestamp as string))) return null;
  return isObj(raw.data) ? raw : null;
}

export function parseMachineTelemetry(raw: unknown): MachineTelemetryEvent | null {
  const env = envelopeOf(raw, 'machine.telemetry');
  if (!env) return null;
  const d = env.data as Record<string, unknown>;
  // Campos obrigatórios com enum. Valor desconhecido do enum => payload inválido (vira UNKNOWN na UI, nunca "saudável").
  if (!KNOWN_STATUS.includes(d.status as MachineStatus) || !KNOWN_MODE.includes(d.mode as MachineMode)) return null;
  if (!optBool(d.emergencyActive) || !optBool(d.safetyInterlockOk)) return null;
  if (d.cycleTimeMs !== undefined && typeof d.cycleTimeMs !== 'number') return null;
  return raw as MachineTelemetryEvent;
}

export function parseConnectionState(raw: unknown): ConnectionStateEvent | null {
  const env = envelopeOf(raw, 'connection.state');
  if (!env) return null;
  const d = env.data as Record<string, unknown>;
  return (CONN as readonly unknown[]).includes(d.state) ? (raw as ConnectionStateEvent) : null;
}

export function parseCommandAck(raw: unknown): CommandAckEvent | null {
  const env = envelopeOf(raw, 'command.ack');
  if (!env) return null;
  const d = env.data as Record<string, unknown>;
  return isStr(d.commandId) && (ACK as readonly unknown[]).includes(d.result) ? (raw as CommandAckEvent) : null;
}
