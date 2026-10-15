import { describe, expect, it } from 'vitest';
import type { MachineTelemetryData } from '../contracts/contrato-smart40-v0.1';
import { canIssue } from './guards';

const ok: MachineTelemetryData = { status: 'IDLE', mode: 'MANUAL', emergencyActive: false, safetyInterlockOk: true };

describe('canIssue', () => {
  it('bloqueia START/RESET/SET_MODE/JOG quando conexão não é CONNECTED (STALE/DISCONNECTED/CONNECTING)', () => {
    for (const connection of ['STALE', 'DISCONNECTED', 'CONNECTING'] as const) {
      for (const a of ['START', 'RESET', 'SET_MODE', 'JOG_FORWARD', 'JOG_BACKWARD', 'SETUP_TOGGLE'] as const) {
        expect(canIssue(a, { connection, machine: ok }).allowed).toBe(false);
      }
    }
  });

  it('bloqueia tudo que não é "desenergizar" quando UNKNOWN ou sem dados', () => {
    expect(canIssue('START', { connection: 'CONNECTED', machine: { status: 'UNKNOWN' } }).allowed).toBe(false);
    expect(canIssue('START', { connection: 'CONNECTED', machine: null }).allowed).toBe(false);
  });

  it('STOP/E-Stop simulado/DESLIGA continuam disponíveis sem telemetria (sentido seguro)', () => {
    for (const a of ['STOP', 'ESTOP_SIM', 'DESLIGA'] as const) {
      expect(canIssue(a, { connection: 'STALE', machine: null }).allowed).toBe(true);
    }
  });

  it('START exige segurança confirmada: emergência, anomalia ou N/D bloqueiam', () => {
    expect(canIssue('START', { connection: 'CONNECTED', machine: ok }).allowed).toBe(true);
    expect(canIssue('START', { connection: 'CONNECTED', machine: { ...ok, emergencyActive: true } }).allowed).toBe(false);
    expect(canIssue('START', { connection: 'CONNECTED', machine: { ...ok, safetyInterlockOk: false } }).allowed).toBe(false);
    expect(canIssue('START', { connection: 'CONNECTED', machine: { status: 'IDLE' } }).allowed).toBe(false); // N/D ≠ OK
    expect(canIssue('START', { connection: 'CONNECTED', machine: { ...ok, status: 'ALARM' } }).allowed).toBe(false);
  });

  it('RESET é permitido para rearmar após emergência, mas não com a máquina rodando', () => {
    expect(canIssue('RESET', { connection: 'CONNECTED', machine: { ...ok, emergencyActive: true, status: 'SAFETY_FAULT' } }).allowed).toBe(true);
    expect(canIssue('RESET', { connection: 'CONNECTED', machine: { ...ok, status: 'RUNNING' } }).allowed).toBe(false);
  });

  it('direcional só em MANUAL, com segurança OK e máquina parada', () => {
    expect(canIssue('JOG_FORWARD', { connection: 'CONNECTED', machine: ok }).allowed).toBe(true);
    expect(canIssue('JOG_FORWARD', { connection: 'CONNECTED', machine: { ...ok, mode: 'AUTO' } }).allowed).toBe(false);
    expect(canIssue('JOG_FORWARD', { connection: 'CONNECTED', machine: { ...ok, status: 'RUNNING' } }).allowed).toBe(false);
    expect(canIssue('JOG_FORWARD', { connection: 'CONNECTED', machine: { ...ok, safetyInterlockOk: false } }).allowed).toBe(false);
  });

  it('não troca modo com a máquina em execução', () => {
    expect(canIssue('SET_MODE', { connection: 'CONNECTED', machine: { ...ok, status: 'RUNNING' } }).allowed).toBe(false);
  });
});
