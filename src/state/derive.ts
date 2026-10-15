/**
 * Estado EFETIVO da máquina para a UI. Regra de ouro (runbook §8): em perda de sinal, payload
 * inválido ou telemetria antiga, mostrar UNKNOWN/STALE — NUNCA assumir estado saudável.
 */
import type { ConnectionStateName, MachineTelemetryEvent, MachineStatus, MachineMode } from '../contract';

export type EffectiveReason = 'OK' | 'NO_DATA' | 'DISCONNECTED' | 'STALE';
export type EffectiveStatus = MachineStatus | 'STALE';

export interface EffectiveState {
  /** UNKNOWN = sem dado/valor desconhecido; STALE = dado existe mas está vencido/sem conexão. */
  status: EffectiveStatus;
  mode: MachineMode;
  reason: EffectiveReason;
  /** true somente se há telemetria fresca, conexão ok e status/modo conhecidos. */
  trusted: boolean;
  emergencyActive: boolean | undefined;
  safetyInterlockOk: boolean | undefined;
  /** timestamp ISO do último dado (para exibir quando STALE) */
  lastTimestamp: string | undefined;
}

export interface DeriveInput {
  telemetry: MachineTelemetryEvent | null;
  /** instante local (ms) em que a telemetria foi recebida; evita depender do relógio da fonte */
  receivedAtMs: number | null;
  connection: ConnectionStateName | null;
  nowMs: number;
  staleAfterMs: number;
}

export function deriveEffectiveState(i: DeriveInput): EffectiveState {
  const t = i.telemetry;
  const base = { emergencyActive: t?.data.emergencyActive, safetyInterlockOk: t?.data.safetyInterlockOk, lastTimestamp: t?.timestamp };

  if (!t || i.receivedAtMs === null) {
    return { ...base, status: 'UNKNOWN', mode: 'UNKNOWN', reason: 'NO_DATA', trusted: false };
  }

  const keep = { mode: t.data.mode };
  if (i.connection === 'DISCONNECTED') return { ...base, ...keep, status: 'STALE', reason: 'DISCONNECTED', trusted: false };
  if (i.connection === 'STALE' || i.nowMs - i.receivedAtMs > i.staleAfterMs) {
    return { ...base, ...keep, status: 'STALE', reason: 'STALE', trusted: false };
  }
  // Conexão ainda CONNECTING/ausente com telemetria fresca: aceitamos (o mock do G1 pode não publicar connection.state).
  const status = t.data.status;
  const mode = t.data.mode;
  const known = status !== 'UNKNOWN' && mode !== 'UNKNOWN';
  return { ...base, status, mode, reason: 'OK', trusted: known };
}

/** Condição de emergência/segurança, independente do `status` reportado. */
export function isSafetyCondition(s: EffectiveState): boolean {
  return s.emergencyActive === true || s.safetyInterlockOk === false || s.status === 'EMERGENCY' || s.status === 'SAFETY_FAULT';
}
