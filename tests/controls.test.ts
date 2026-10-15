import { describe, expect, it } from 'vitest';
import type { CommandAction } from '../src/contract';
import { decideControl } from '../src/state/controls';
import { stateOf } from './helpers';

const ALL: CommandAction[] = ['START', 'STOP', 'RESET', 'SETUP', 'DESLIGA', 'EMERGENCY_STOP_SIM', 'MODE_SELECT', 'JOG_BACKWARD', 'JOG_FORWARD'];

describe('decideControl', () => {
  it.each(['UNKNOWN', 'STALE'] as const)('bloqueia TODOS os controles quando %s', (kind) => {
    const s = kind === 'UNKNOWN' ? stateOf({ status: 'UNKNOWN' }) : stateOf({}, { nowMs: 99999 });
    for (const a of ALL) {
      const d = decideControl(a, s);
      expect(d.enabled, a).toBe(false);
      expect(d.reason).toBeTruthy();
    }
  });

  it('READY/MANUAL: permite START, SETUP, DESLIGA, modo, jog e E-Stop sim; bloqueia STOP e RESET', () => {
    const s = stateOf({ status: 'READY', mode: 'MANUAL' });
    for (const a of ['START', 'SETUP', 'DESLIGA', 'MODE_SELECT', 'JOG_BACKWARD', 'JOG_FORWARD', 'EMERGENCY_STOP_SIM'] as const) expect(decideControl(a, s).enabled, a).toBe(true);
    expect(decideControl('STOP', s).enabled).toBe(false);
    expect(decideControl('RESET', s).enabled).toBe(false);
  });

  it('RUNNING: só STOP e E-Stop sim; nada de START/jog/modo/setup/desliga', () => {
    const s = stateOf({ status: 'RUNNING', mode: 'AUTO' });
    expect(decideControl('STOP', s).enabled).toBe(true);
    expect(decideControl('EMERGENCY_STOP_SIM', s).enabled).toBe(true);
    for (const a of ['START', 'SETUP', 'DESLIGA', 'MODE_SELECT', 'JOG_FORWARD', 'JOG_BACKWARD'] as const) expect(decideControl(a, s).enabled, a).toBe(false);
  });

  it('jog só em MANUAL', () => {
    expect(decideControl('JOG_FORWARD', stateOf({ status: 'STOPPED', mode: 'AUTO' })).enabled).toBe(false);
    expect(decideControl('JOG_FORWARD', stateOf({ status: 'STOPPED', mode: 'MANUAL' })).enabled).toBe(true);
  });

  it.each([
    ['EMERGENCY', { status: 'EMERGENCY', emergencyActive: true, safetyInterlockOk: false }],
    ['SAFETY_FAULT', { status: 'SAFETY_FAULT', safetyInterlockOk: false }],
    ['intertravamento false com status READY', { status: 'READY', safetyInterlockOk: false }],
    ['emergencyActive true com status READY', { status: 'READY', emergencyActive: true }],
  ] as const)('%s: só RESET e E-Stop sim; START/jog/modo/setup bloqueados', (_n, data) => {
    const s = stateOf(data);
    expect(decideControl('RESET', s).enabled).toBe(true);
    for (const a of ['START', 'SETUP', 'MODE_SELECT', 'JOG_FORWARD', 'JOG_BACKWARD'] as const) expect(decideControl(a, s).enabled, a).toBe(false);
  });

  it('ALARM: START bloqueado, RESET liberado', () => {
    const s = stateOf({ status: 'ALARM' });
    expect(decideControl('START', s).enabled).toBe(false);
    expect(decideControl('RESET', s).enabled).toBe(true);
  });

  it('intertravamento N/D bloqueia START (não presume seguro)', () => {
    expect(decideControl('START', stateOf({ status: 'READY', safetyInterlockOk: undefined })).enabled).toBe(false);
  });
});
