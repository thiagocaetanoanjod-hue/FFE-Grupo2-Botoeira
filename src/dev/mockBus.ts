/**
 * MOCK LOCAL (somente dev/standalone). No App Shell este arquivo NÃO é usado: o G1 publica o barramento.
 *
 * - Publica `machine.telemetry` a cada 500 ms (+ `connection.state` ao ligar/desligar).
 * - Responde `command.requested` com `command.ack` (SIMULATED) e muda o estado simulado.
 * - Painel de cenários (DevPanel) permite forçar: emergência, anomalia de segurança, UNKNOWN,
 *   silêncio (→ STALE), desconexão e payload inválido.
 * Nada aqui toca PLC, UR, IHM física ou esteira.
 */
import type { CommandRequestedData, MachineTelemetryData } from '../contracts/contrato-smart40-v0.1';
import { BUS, isMachineTelemetry, makeAck, makeConnection, makeTelemetry, publish, subscribe } from '../lib/bus';

export type Scenario = 'NORMAL' | 'EMERGENCY' | 'SAFETY_FAULT' | 'ALARM' | 'UNKNOWN';

export function applyCommand(m: MachineTelemetryData, c: CommandRequestedData): { next: MachineTelemetryData; message: string } {
  const next = { ...m };
  switch (c.action) {
    case 'START':
      if (m.emergencyActive || m.safetyInterlockOk !== true) return { next, message: 'Partida negada: segurança não OK' };
      next.status = 'RUNNING';
      return { next, message: 'Partida simulada' };
    case 'STOP':
    case 'DESLIGA':
      next.status = 'IDLE';
      return { next, message: 'Parada simulada' };
    case 'ESTOP_SIM':
      next.status = 'SAFETY_FAULT';
      next.emergencyActive = true;
      next.safetyInterlockOk = false;
      return { next, message: 'E-Stop SIMULADO (não é o E-Stop físico)' };
    case 'RESET':
      next.emergencyActive = false;
      next.safetyInterlockOk = true;
      next.status = 'IDLE';
      next.alarms = [];
      return { next, message: 'Rearme simulado' };
    case 'SETUP_TOGGLE':
      next.setupKeyOn = !m.setupKeyOn;
      return { next, message: `SETUP ${next.setupKeyOn ? 'ligado' : 'desligado'}` };
    case 'SET_MODE':
      if (c.params?.mode) next.mode = c.params.mode;
      return { next, message: `Modo ${next.mode}` };
    case 'JOG_BACKWARD':
    case 'JOG_FORWARD':
      return { next, message: `Jog simulado (${c.action === 'JOG_FORWARD' ? '>>' : '<<'})` };
  }
}

export function startMockBus() {
  let machine: MachineTelemetryData = {
    status: 'IDLE',
    mode: 'AUTO',
    emergencyActive: false,
    safetyInterlockOk: true,
    setupKeyOn: false,
    cycleTimeMs: 4200,
    alarms: [],
  };
  let silent = false;
  let unknown = false;

  const tick = () => {
    if (silent) return;
    const payload: MachineTelemetryData = unknown ? { status: 'UNKNOWN' } : machine;
    publish(BUS.machineTelemetry, makeTelemetry(payload));
  };

  publish(BUS.connectionState, makeConnection({ status: 'CONNECTED' }));
  tick();
  const timer = setInterval(tick, 500);

  const offCmd = subscribe<{ data: CommandRequestedData } & Record<string, unknown>>(BUS.commandRequested, (ev) => {
    const c = ev?.data;
    if (!c || c.simulation !== true) {
      // Regra do runbook: o gateway rejeita por padrão qualquer comando que não seja simulação.
      publish(BUS.commandAck, makeAck({ commandId: c?.commandId ?? 'desconhecido', status: 'REJECTED', message: 'Somente simulation:true é aceito' }));
      return;
    }
    const { next, message } = applyCommand(machine, c);
    machine = next;
    setTimeout(() => publish(BUS.commandAck, makeAck({ commandId: c.commandId, status: 'SIMULATED', message })), 150);
    tick();
  });

  return {
    scenario(s: Scenario) {
      unknown = s === 'UNKNOWN';
      if (s === 'NORMAL') machine = { ...machine, status: 'IDLE', emergencyActive: false, safetyInterlockOk: true, alarms: [] };
      if (s === 'EMERGENCY') machine = { ...machine, status: 'SAFETY_FAULT', emergencyActive: true, safetyInterlockOk: false, alarms: ['EMERGÊNCIA (simulada)'] };
      if (s === 'SAFETY_FAULT') machine = { ...machine, status: 'SAFETY_FAULT', emergencyActive: false, safetyInterlockOk: false, alarms: ['Intertravamento aberto (simulado)'] };
      if (s === 'ALARM') machine = { ...machine, status: 'ALARM', alarms: ['Alarme genérico (simulado)'] };
      tick();
    },
    setSilent(v: boolean) {
      silent = v;
    },
    setDisconnected(v: boolean) {
      publish(BUS.connectionState, makeConnection({ status: v ? 'DISCONNECTED' : 'CONNECTED' }));
      silent = v;
    },
    sendInvalid() {
      const bad = { type: 'machine.telemetry', eventId: 'x', timestamp: 'não-é-data', data: { status: 'VOANDO' } };
      if (!isMachineTelemetry(bad)) publish(BUS.machineTelemetry, bad);
    },
    stop() {
      clearInterval(timer);
      offCmd();
    },
  };
}
