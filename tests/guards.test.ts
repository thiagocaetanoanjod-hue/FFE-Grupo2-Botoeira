import { describe, expect, it } from 'vitest';
import { parseCommandAck, parseConnectionState, parseMachineTelemetry } from '../src/bus/guards';
import { tele } from './helpers';

describe('guards', () => {
  it('aceita telemetria válida', () => expect(parseMachineTelemetry(tele())).not.toBeNull());
  it('descarta enum desconhecido, tipos errados, envelope incompleto e lixo', () => {
    expect(parseMachineTelemetry(tele({ status: 'BANANA' as never }))).toBeNull();
    expect(parseMachineTelemetry(tele({ emergencyActive: 'sim' as never }))).toBeNull();
    expect(parseMachineTelemetry({ type: 'machine.telemetry', data: { status: 'READY' } })).toBeNull();
    expect(parseMachineTelemetry(null)).toBeNull();
    expect(parseMachineTelemetry('x')).toBeNull();
    expect(parseMachineTelemetry({ ...tele(), timestamp: 'ontem' })).toBeNull();
  });
  it('valida connection.state e command.ack', () => {
    const base = { schemaVersion: '0.1.0', eventId: 'x', timestamp: '2026-10-14T12:00:00Z', source: 'mock' };
    expect(parseConnectionState({ ...base, type: 'connection.state', data: { state: 'CONNECTED' } })).not.toBeNull();
    expect(parseConnectionState({ ...base, type: 'connection.state', data: { state: 'ok' } })).toBeNull();
    expect(parseCommandAck({ ...base, type: 'command.ack', data: { commandId: 'c1', result: 'SIMULATED' } })).not.toBeNull();
    expect(parseCommandAck({ ...base, type: 'command.ack', data: { commandId: 'c1', result: 'MAYBE' } })).toBeNull();
  });
});
