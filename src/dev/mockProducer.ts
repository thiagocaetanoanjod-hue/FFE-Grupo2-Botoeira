/**
 * PRODUTOR MOCK — SOMENTE MODO STANDALONE (`npm run dev`). NÃO entra no bundle `build:spa`.
 * Faz o papel que, integrado, é do GatewayClient/mock do Grupo 1: emite machine.telemetry /
 * connection.state e responde `command.requested` com `command.ack` SIMULATED.
 * Não há rede nem hardware: tudo em memória.
 */
import { BUS } from '../bus/events';
import { SCHEMA_VERSION, type CommandAckEvent, type CommandRequestedEvent, type MachineMode, type MachineStatus, type MachineTelemetry } from '../contract';

export type Scenario = 'NORMAL' | 'ALARM' | 'SAFETY_FAULT' | 'EMERGENCY' | 'UNKNOWN_STATUS' | 'NO_SAFETY_SIGNAL';

let n = 0;
const iso = () => new Date().toISOString();
const wrap = <T extends string, D>(type: T, data: D) => ({ schemaVersion: SCHEMA_VERSION, eventId: `mock-${type}-${++n}`, type, timestamp: iso(), source: 'mock', data });

export class MockProducer {
  status: MachineStatus = 'READY';
  mode: MachineMode = 'MANUAL';
  emergency = false;
  safetyOk = true;
  silenced = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private off: (() => void) | undefined;

  constructor(private bus: EventTarget = window) {}

  start() {
    this.publishConnection('CONNECTED');
    this.timer = setInterval(() => this.publishTelemetry(), 500);
    const h = (e: Event) => this.onCommand((e as CustomEvent<CommandRequestedEvent>).detail);
    this.bus.addEventListener(BUS.commandRequested, h);
    this.off = () => this.bus.removeEventListener(BUS.commandRequested, h);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.off?.();
  }

  private emit(name: string, detail: unknown) {
    this.bus.dispatchEvent(new CustomEvent(name, { detail }));
  }
  publishConnection(state: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'STALE') {
    this.emit(BUS.connectionState, wrap('connection.state', { state }));
  }
  publishTelemetry() {
    if (this.silenced) return;
    const data: MachineTelemetry = {
      status: this.status,
      mode: this.mode,
      emergencyActive: this.emergency,
      safetyInterlockOk: this.safetyOk,
      cycleTimeMs: this.status === 'RUNNING' ? 4200 : undefined,
    };
    this.emit(BUS.machineTelemetry, wrap('machine.telemetry', data));
  }
  publishInvalid() {
    this.emit(BUS.machineTelemetry, { type: 'machine.telemetry', data: { status: 'BANANA' } });
  }

  setScenario(s: Scenario) {
    this.silenced = false;
    this.emergency = false;
    this.safetyOk = true;
    switch (s) {
      case 'NORMAL':
        this.status = 'READY';
        break;
      case 'ALARM':
        this.status = 'ALARM';
        break;
      case 'SAFETY_FAULT':
        this.status = 'SAFETY_FAULT';
        this.safetyOk = false;
        break;
      case 'EMERGENCY':
        this.status = 'EMERGENCY';
        this.emergency = true;
        this.safetyOk = false;
        break;
      case 'UNKNOWN_STATUS':
        this.status = 'UNKNOWN';
        break;
      case 'NO_SAFETY_SIGNAL':
        this.status = 'READY';
        this.safetyOk = undefined as unknown as boolean; // campo ausente => N/D
        break;
    }
    this.publishTelemetry();
  }

  private onCommand(ev: CommandRequestedEvent) {
    const { action, commandId, params, simulation } = ev.data;
    let result: CommandAckEvent['data']['result'] = 'SIMULATED';
    let message = 'Comando simulado — nenhuma ação física';
    if (simulation !== true) {
      result = 'REJECTED';
      message = 'Somente simulação é aceita';
    } else {
      switch (action) {
        case 'START': this.status = 'RUNNING'; break;
        case 'STOP': this.status = 'STOPPED'; break;
        case 'DESLIGA': this.status = 'IDLE'; break;
        case 'SETUP': this.status = 'STOPPED'; break;
        case 'RESET': this.status = 'READY'; this.emergency = false; this.safetyOk = true; break;
        case 'EMERGENCY_STOP_SIM': this.status = 'EMERGENCY'; this.emergency = true; this.safetyOk = false; break;
        case 'MODE_SELECT': if (params?.mode) this.mode = params.mode; break;
        default: break; // JOG_*: sem efeito de estado
      }
      this.publishTelemetry();
    }
    setTimeout(() => this.emit(BUS.commandAck, wrap('command.ack', { commandId, result, message })), 150);
  }
}
