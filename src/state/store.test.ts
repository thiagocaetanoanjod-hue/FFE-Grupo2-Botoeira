import { describe, expect, it } from 'vitest';
import { deriveConnection, initialState, reducer } from './store';

describe('deriveConnection', () => {
  it('CONNECTING sem telemetria; CONNECTED com telemetria recente; STALE quando envelhece', () => {
    expect(deriveConnection({ externalConnection: null, lastTelemetryAt: null }, 1000, 3000)).toBe('CONNECTING');
    expect(deriveConnection({ externalConnection: null, lastTelemetryAt: 900 }, 1000, 3000)).toBe('CONNECTED');
    expect(deriveConnection({ externalConnection: null, lastTelemetryAt: 0 }, 5000, 3000)).toBe('STALE');
  });
  it('DISCONNECTED informado pelo G1 sempre prevalece', () => {
    expect(deriveConnection({ externalConnection: 'DISCONNECTED', lastTelemetryAt: 999 }, 1000, 3000)).toBe('DISCONNECTED');
  });
});

describe('reducer', () => {
  const data = { status: 'IDLE' as const, mode: 'AUTO' as const, emergencyActive: false, safetyInterlockOk: true };

  it('ignora telemetria com eventId repetido (idempotência)', () => {
    const a = reducer(initialState, { type: 'telemetry', eventId: 'e1', data, at: 1 });
    const b = reducer(a, { type: 'telemetry', eventId: 'e1', data: { ...data, status: 'RUNNING' }, at: 2 });
    expect(b).toBe(a);
    expect(b.machine?.status).toBe('IDLE');
  });

  it('só registra no log quando algo relevante muda', () => {
    const a = reducer(initialState, { type: 'telemetry', eventId: 'e1', data, at: 1 });
    const b = reducer(a, { type: 'telemetry', eventId: 'e2', data, at: 2 });
    expect(b.log.length).toBe(a.log.length);
    const c = reducer(b, { type: 'telemetry', eventId: 'e3', data: { ...data, status: 'RUNNING' }, at: 3 });
    expect(c.log.length).toBe(a.log.length + 1);
  });

  it('ACK de comando desconhecido (de outro módulo) é ignorado; ACK conhecido é associado', () => {
    const s0 = reducer(initialState, { type: 'command-sent', commandId: 'c1', action: 'START', at: new Date().toISOString() });
    const other = reducer(s0, { type: 'ack', data: { commandId: 'zzz', status: 'SIMULATED' }, at: new Date().toISOString() });
    expect(other).toBe(s0);
    const mine = reducer(s0, { type: 'ack', data: { commandId: 'c1', status: 'SIMULATED' }, at: new Date().toISOString() });
    expect(mine.commands[0].ack?.status).toBe('SIMULATED');
  });

  it('payload inválido incrementa contador e não altera a máquina', () => {
    const a = reducer(initialState, { type: 'telemetry', eventId: 'e1', data, at: 1 });
    const b = reducer(a, { type: 'invalid', reason: 'x', at: new Date().toISOString() });
    expect(b.invalidCount).toBe(1);
    expect(b.machine).toEqual(a.machine);
  });
});
