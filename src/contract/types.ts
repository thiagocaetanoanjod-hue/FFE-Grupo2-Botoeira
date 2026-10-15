/**
 * CONTRATO SMART 4.0 v0.1 — STAND-IN PROVISÓRIO DO GRUPO 2
 *
 * A fonte única da verdade é `packages/contracts` (custodiante: Grupo 1, runbook §3/§4).
 * Este arquivo reproduz SOMENTE o que o G2 consome/emite, conforme descrito no runbook de
 * 07/10/2026, para permitir desenvolver com mocks antes do pacote do G1 existir.
 *
 * REGRAS:
 *  - Quando `@smart40/contracts` existir: apague este arquivo e troque os imports em
 *    `src/contract/index.ts` (único ponto de acoplamento). Nenhum outro arquivo importa daqui.
 *  - Nunca adicionar campo "por conta própria": mudança de contrato exige PR do G1 + 5 grupos.
 *  - Ausência de campo = N/D. Jamais converter para 0/false presumido.
 *  - Timestamps ISO 8601 UTC.
 */

export const SCHEMA_VERSION = '0.1.0';

export interface Envelope<TType extends string, TData> {
  schemaVersion: string;
  eventId: string;
  type: TType;
  timestamp: string; // ISO 8601 UTC
  source: 'mock' | 'gateway' | (string & {});
  data: TData;
}

// ---- machine.telemetry (consumidor principal: G2 e G1) ---------------------------------------
export type MachineStatus =
  | 'IDLE'
  | 'READY'
  | 'RUNNING'
  | 'STOPPED'
  | 'ALARM'
  | 'SAFETY_FAULT'
  | 'EMERGENCY'
  | 'UNKNOWN';

export type MachineMode = 'MANUAL' | 'SEMI_AUTO' | 'AUTO' | 'UNKNOWN';

export interface MachineTelemetry {
  status: MachineStatus;
  mode: MachineMode;
  /** true = emergência ativa no circuito de segurança. Ausente = N/D. */
  emergencyActive?: boolean;
  /** true = intertravamento OK ("SEGURANÇA OK"). false = "SEGURANÇA ANOMALIA". Ausente = N/D. */
  safetyInterlockOk?: boolean;
  /** milissegundos */
  cycleTimeMs?: number;
  alarms?: string[];
}
export type MachineTelemetryEvent = Envelope<'machine.telemetry', MachineTelemetry>;

// ---- connection.state (publicado pelo G1) ----------------------------------------------------
export type ConnectionStateName = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'STALE';
export interface ConnectionState {
  state: ConnectionStateName;
  lastTelemetryAt?: string;
  latencyMs?: number;
}
export type ConnectionStateEvent = Envelope<'connection.state', ConnectionState>;

// ---- command.requested / command.ack ---------------------------------------------------------
export type CommandAction =
  | 'START'
  | 'STOP'
  | 'RESET'
  | 'SETUP'
  | 'DESLIGA'
  | 'EMERGENCY_STOP_SIM'
  | 'MODE_SELECT'
  | 'JOG_BACKWARD'
  | 'JOG_FORWARD';

export type CommandTarget = 'ihm.botoeira' | 'ihm.touch';

export interface CommandRequest {
  commandId: string;
  target: CommandTarget;
  action: CommandAction;
  /** módulo de origem */
  origin: 'ihm';
  params?: { mode?: Exclude<MachineMode, 'UNKNOWN'> };
  /** Sprint 1: SEMPRE true. O tipo literal impede construir comando sem simulação. */
  simulation: true;
}
export type CommandRequestedEvent = Envelope<'command.requested', CommandRequest>;

export type CommandAckResult = 'SIMULATED' | 'ACCEPTED' | 'REJECTED';
export interface CommandAck {
  commandId: string;
  result: CommandAckResult;
  message?: string;
}
export type CommandAckEvent = Envelope<'command.ack', CommandAck>;
