/**
 * CONTRATO SMART 4.0 v0.1 — CÓPIA LOCAL DO G2 (provisória)
 *
 * O dono oficial é o G1 (`packages/contracts`). Enquanto o pacote compartilhado não
 * existe, o G2 mantém esta cópia mínima só com o que a botoeira/IHM consome e emite.
 * Quando o G1 publicar o pacote: apagar este arquivo e trocar os imports de
 * `../contracts/contrato-smart40-v0.1` pelo pacote (sem copiar tipos).
 *
 * Regras do runbook: timestamps ISO 8601 UTC; ausência de dado NUNCA vira zero (use undefined → "N/D");
 * comandos sempre com `simulation: true` na Sprint 1.
 */

export const SCHEMA_VERSION = '0.1.0' as const;

/** Envelope padrão de qualquer evento do barramento `smart40:*`. */
export interface Smart40Envelope<T extends string, D> {
  schemaVersion: string;
  eventId: string;
  type: T;
  /** ISO 8601 UTC */
  timestamp: string;
  source: 'mock' | 'gateway';
  data: D;
}

// ---------------------------------------------------------------------------
// machine.telemetry  (consumidores: G2 e G1)
// ---------------------------------------------------------------------------
export type MachineStatus = 'IDLE' | 'RUNNING' | 'ALARM' | 'SAFETY_FAULT' | 'MAINTENANCE' | 'UNKNOWN';
export type OperationMode = 'MANUAL' | 'SEMI_AUTO' | 'AUTO';

export interface MachineTelemetryData {
  status: MachineStatus;
  mode?: OperationMode;
  /** Cogumelo de emergência acionado (estado reportado pelo PLC — nunca gerado pela web). */
  emergencyActive?: boolean;
  /** Intertravamento de segurança OK → sinaleira "SEGURANÇA OK". false → "SEGURANÇA ANOMALIA". */
  safetyInterlockOk?: boolean;
  /** Chave de SETUP da botoeira. */
  setupKeyOn?: boolean;
  /** ms */
  cycleTimeMs?: number;
  alarms?: string[];
}
export type MachineTelemetryEvent = Smart40Envelope<'machine.telemetry', MachineTelemetryData>;

// ---------------------------------------------------------------------------
// command.requested / command.ack  (G2–G5 → mock/gateway)
// ---------------------------------------------------------------------------
export type CommandTarget = 'BOTOEIRA' | 'IHM';
export type CommandAction =
  | 'START'
  | 'STOP'
  | 'RESET'
  | 'SETUP_TOGGLE'
  | 'DESLIGA'
  | 'SET_MODE'
  | 'JOG_BACKWARD' // "<<" da IHM
  | 'JOG_FORWARD' // ">>" da IHM
  | 'ESTOP_SIM'; // E-Stop VISUAL/simulado — NÃO é a parada de emergência física

export interface CommandRequestedData {
  commandId: string;
  target: CommandTarget;
  action: CommandAction;
  originModule: 'ihm_siemens';
  params?: { mode?: OperationMode };
  /** Sprint 1: sempre true. O gateway deve rejeitar qualquer outra coisa. */
  simulation: true;
}
export type CommandRequestedEvent = Smart40Envelope<'command.requested', CommandRequestedData>;

export type AckStatus = 'SIMULATED' | 'ACCEPTED' | 'REJECTED';
export interface CommandAckData {
  commandId: string;
  status: AckStatus;
  message?: string;
}
export type CommandAckEvent = Smart40Envelope<'command.ack', CommandAckData>;

// ---------------------------------------------------------------------------
// connection.state  (G1 → todos)
// ---------------------------------------------------------------------------
export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'STALE';
export interface ConnectionStateData {
  status: ConnectionStatus;
  /** ISO 8601 UTC da última telemetria recebida */
  lastTelemetryAt?: string;
  latencyMs?: number;
}
export type ConnectionStateEvent = Smart40Envelope<'connection.state', ConnectionStateData>;

// ---------------------------------------------------------------------------
// Barramento (nomes de eventos DOM publicados pelo App Shell)
// ---------------------------------------------------------------------------
export const BUS = {
  machineTelemetry: 'smart40:machine.telemetry',
  connectionState: 'smart40:connection.state',
  commandRequested: 'smart40:command.requested',
  commandAck: 'smart40:command.ack',
} as const;

export type Smart40Event =
  | MachineTelemetryEvent
  | CommandRequestedEvent
  | CommandAckEvent
  | ConnectionStateEvent;
