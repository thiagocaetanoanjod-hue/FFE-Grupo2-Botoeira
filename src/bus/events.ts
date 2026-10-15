/**
 * Barramento `smart40:*` (G1 publica, G2–G5 consomem). O módulo NUNCA abre conexão própria
 * com gateway/WebSocket/REST: só escuta/emite CustomEvents na `window`.
 *
 * PENDENTE com o G1: confirmar o formato exato dos nomes. Hipótese adotada (runbook §3):
 *   smart40:<tipo-do-evento>   ex.: `smart40:machine.telemetry`, `smart40:command.ack`
 * com `event.detail` = envelope completo. Alterar APENAS as constantes abaixo se mudar.
 */
import {
  SCHEMA_VERSION,
  type CommandAckEvent,
  type CommandRequest,
  type CommandRequestedEvent,
  type ConnectionStateEvent,
  type MachineTelemetryEvent,
} from '../contract';

export const BUS = {
  machineTelemetry: 'smart40:machine.telemetry',
  connectionState: 'smart40:connection.state',
  commandRequested: 'smart40:command.requested',
  commandAck: 'smart40:command.ack',
} as const;

let seq = 0;
const newId = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${++seq}`}`;

export const newCommandId = () => newId('g2-cmd');

/** Emite `command.requested`. Só aceita CommandRequest com simulation:true (garantido pelo tipo e em runtime). */
export function emitCommandRequested(cmd: CommandRequest, target: EventTarget = window): CommandRequestedEvent {
  if ((cmd as { simulation?: unknown }).simulation !== true) {
    throw new Error('G2: comando sem simulation:true é proibido na Sprint 1');
  }
  const envelope: CommandRequestedEvent = {
    schemaVersion: SCHEMA_VERSION,
    eventId: newId('g2-evt'),
    type: 'command.requested',
    timestamp: new Date().toISOString(),
    source: 'ihm',
    data: cmd,
  };
  target.dispatchEvent(new CustomEvent(BUS.commandRequested, { detail: envelope }));
  return envelope;
}

type Handler<T> = (detail: T) => void;

function listen<T>(name: string, handler: Handler<unknown>, target: EventTarget): () => void {
  const fn = (e: Event) => handler((e as CustomEvent<unknown>).detail as T);
  target.addEventListener(name, fn);
  return () => target.removeEventListener(name, fn);
}

// Os handlers recebem `unknown`: validação acontece em `guards.ts` (payload inválido é descartado/logado).
export const onMachineTelemetry = (h: Handler<unknown>, t: EventTarget = window) => listen<MachineTelemetryEvent>(BUS.machineTelemetry, h, t);
export const onConnectionState = (h: Handler<unknown>, t: EventTarget = window) => listen<ConnectionStateEvent>(BUS.connectionState, h, t);
export const onCommandAck = (h: Handler<unknown>, t: EventTarget = window) => listen<CommandAckEvent>(BUS.commandAck, h, t);
