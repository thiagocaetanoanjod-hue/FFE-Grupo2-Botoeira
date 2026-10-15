import type { MachineTelemetryEvent, MachineTelemetry } from '../src/contract';
import { deriveEffectiveState, type EffectiveState } from '../src/state/derive';

export const tele = (data: Partial<MachineTelemetry> = {}, id = 'e1'): MachineTelemetryEvent => ({
  schemaVersion: '0.1.0',
  eventId: id,
  type: 'machine.telemetry',
  timestamp: '2026-10-14T12:00:00.000Z',
  source: 'mock',
  data: { status: 'READY', mode: 'MANUAL', emergencyActive: false, safetyInterlockOk: true, ...data },
});

export const stateOf = (data: Partial<MachineTelemetry> = {}, over: Partial<Parameters<typeof deriveEffectiveState>[0]> = {}): EffectiveState =>
  deriveEffectiveState({ telemetry: tele(data), receivedAtMs: 1000, connection: 'CONNECTED', nowMs: 1500, staleAfterMs: 3000, ...over });
