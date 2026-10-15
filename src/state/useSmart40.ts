import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import type { CommandAction, ConnectionStatus, OperationMode } from '../contracts/contrato-smart40-v0.1';
import { BUS, isCommandAck, isConnectionState, isMachineTelemetry, makeCommand, nowIso, publish, subscribe } from '../lib/bus';
import { canIssue, type GuardResult } from '../lib/guards';
import { deriveConnection, initialState, reducer } from './store';

const STALE_AFTER_MS = Number(import.meta.env.VITE_STALE_AFTER_MS ?? 3000);

/**
 * Único ponto em que o módulo conversa com o barramento. NÃO abre conexão própria com a máquina:
 * consome `smart40:*` (publicado pelo GatewayClient do G1 ou pelo mock em src/dev).
 */
export function useSmart40() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const offs = [
      subscribe<unknown>(BUS.machineTelemetry, (ev) => {
        if (!isMachineTelemetry(ev)) return dispatch({ type: 'invalid', reason: 'machine.telemetry malformado', at: nowIso() });
        dispatch({ type: 'telemetry', eventId: ev.eventId, data: ev.data, at: Date.now() });
      }),
      subscribe<unknown>(BUS.connectionState, (ev) => {
        if (!isConnectionState(ev)) return dispatch({ type: 'invalid', reason: 'connection.state malformado', at: nowIso() });
        dispatch({ type: 'connection', status: ev.data.status });
      }),
      subscribe<unknown>(BUS.commandAck, (ev) => {
        if (!isCommandAck(ev)) return dispatch({ type: 'invalid', reason: 'command.ack malformado', at: nowIso() });
        dispatch({ type: 'ack', data: ev.data, at: nowIso() });
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  const connection: ConnectionStatus = deriveConnection(state, now, STALE_AFTER_MS);
  const telemetryAgeMs = state.lastTelemetryAt === null ? null : now - state.lastTelemetryAt;

  const check = useCallback(
    (action: CommandAction): GuardResult => canIssue(action, { connection, machine: state.machine }),
    [connection, state.machine],
  );

  const send = useCallback(
    (action: CommandAction, target: 'BOTOEIRA' | 'IHM' = 'BOTOEIRA', params?: { mode?: OperationMode }) => {
      const verdict = canIssue(action, { connection, machine: state.machine });
      if (!verdict.allowed) {
        dispatch({ type: 'blocked', action, reason: verdict.reason ?? 'bloqueado', at: nowIso() });
        return false;
      }
      const cmd = makeCommand(action, target, params);
      dispatch({ type: 'command-sent', commandId: cmd.data.commandId, action, at: cmd.timestamp });
      publish(BUS.commandRequested, cmd);
      return true;
    },
    [connection, state.machine],
  );

  return useMemo(
    () => ({ ...state, connection, telemetryAgeMs, check, send }),
    [state, connection, telemetryAgeMs, check, send],
  );
}
