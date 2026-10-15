import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { BUS } from '../src/bus/events';
import { tele } from './helpers';

const publish = (data = {}, id = `e${Math.random()}`) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(BUS.machineTelemetry, { detail: tele(data, id) }));
  });

afterEach(() => vi.useRealTimers());

describe('App', () => {
  it('mostra o aviso SIMULAÇÃO sempre e começa bloqueado (UNKNOWN)', () => {
    render(<App />);
    expect(screen.getByText('SIMULAÇÃO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'START' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Emergência simulada/ })).toBeDisabled();
    expect(screen.getByTestId('estado-global')).toHaveTextContent('UNKNOWN');
  });

  it('com telemetria fresca habilita START; clique emite command.requested com simulation:true e registra ACK', () => {
    render(<App />);
    const seen: unknown[] = [];
    const h = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(BUS.commandRequested, h);
    publish({ status: 'READY', mode: 'MANUAL' });
    const start = screen.getByRole('button', { name: 'START' });
    expect(start).toBeEnabled();
    act(() => start.click());
    window.removeEventListener(BUS.commandRequested, h);
    expect(seen).toHaveLength(1);
    const env = seen[0] as { type: string; data: { simulation: boolean; action: string; commandId: string } };
    expect(env.type).toBe('command.requested');
    expect(env.data).toMatchObject({ simulation: true, action: 'START' });
    expect(screen.getByText('PENDENTE')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(BUS.commandAck, { detail: { schemaVersion: '0.1.0', eventId: 'a1', type: 'command.ack', timestamp: new Date().toISOString(), source: 'mock', data: { commandId: env.data.commandId, result: 'SIMULATED' } } }));
    });
    expect(screen.getByText(/SIMULATED/)).toBeInTheDocument();
  });

  it('telemetria vencida => STALE e controles bloqueados', () => {
    vi.useFakeTimers();
    render(<App />);
    publish({ status: 'RUNNING' });
    expect(screen.getByRole('button', { name: 'STOP' })).toBeEnabled();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('estado-global')).toHaveTextContent('STALE');
    expect(screen.getByRole('button', { name: 'STOP' })).toBeDisabled();
  });

  it('payload inválido é descartado e contabilizado sem quebrar', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new CustomEvent(BUS.machineTelemetry, { detail: { type: 'machine.telemetry', data: { status: 'BANANA' } } }));
    });
    expect(screen.getByText(/1 payload\(s\) inválido\(s\)/)).toBeInTheDocument();
    expect(screen.getByTestId('estado-global')).toHaveTextContent('UNKNOWN');
  });
});
