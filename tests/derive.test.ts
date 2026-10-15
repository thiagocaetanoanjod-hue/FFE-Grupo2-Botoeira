import { describe, expect, it } from 'vitest';
import { deriveEffectiveState } from '../src/state/derive';
import { stateOf, tele } from './helpers';

describe('deriveEffectiveState', () => {
  it('sem telemetria => UNKNOWN, não confiável', () => {
    const s = deriveEffectiveState({ telemetry: null, receivedAtMs: null, connection: null, nowMs: 0, staleAfterMs: 3000 });
    expect(s).toMatchObject({ status: 'UNKNOWN', trusted: false, reason: 'NO_DATA' });
  });
  it('telemetria fresca e conhecida => confiável', () => {
    expect(stateOf({ status: 'RUNNING' })).toMatchObject({ status: 'RUNNING', trusted: true });
  });
  it('telemetria antiga => STALE e mantém último timestamp', () => {
    const s = stateOf({}, { nowMs: 1000 + 3001 });
    expect(s).toMatchObject({ status: 'STALE', trusted: false, reason: 'STALE', lastTimestamp: tele().timestamp });
  });
  it('conexão DISCONNECTED => STALE mesmo com dado recente', () => {
    expect(stateOf({}, { connection: 'DISCONNECTED' })).toMatchObject({ status: 'STALE', reason: 'DISCONNECTED', trusted: false });
  });
  it('connection.state STALE => STALE', () => {
    expect(stateOf({}, { connection: 'STALE' })).toMatchObject({ status: 'STALE', trusted: false });
  });
  it('status UNKNOWN vindo da fonte => não confiável', () => {
    expect(stateOf({ status: 'UNKNOWN' })).toMatchObject({ status: 'UNKNOWN', trusted: false });
  });
  it('campos ausentes permanecem undefined (N/D), nunca viram false/0', () => {
    const s = stateOf({ emergencyActive: undefined, safetyInterlockOk: undefined });
    expect(s.emergencyActive).toBeUndefined();
    expect(s.safetyInterlockOk).toBeUndefined();
  });
});
