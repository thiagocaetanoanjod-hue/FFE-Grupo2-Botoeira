import type { ConnectionStatus, MachineTelemetryData } from '../contracts/contrato-smart40-v0.1';
import { isSafetyOk } from '../lib/guards';

/** Estado global exibido ao operador (Operando / Parada / Falha de Segurança / Emergência) + degradações. */
export type GlobalState = 'OPERANDO' | 'PARADA' | 'FALHA_SEGURANCA' | 'EMERGENCIA' | 'ALARME' | 'MANUTENCAO' | 'DESCONHECIDO' | 'STALE';

export function deriveGlobalState(m: MachineTelemetryData | null, c: ConnectionStatus): GlobalState {
  if (c === 'STALE') return 'STALE';
  if (c !== 'CONNECTED' || !m || m.status === 'UNKNOWN') return 'DESCONHECIDO';
  if (m.emergencyActive) return 'EMERGENCIA';
  if (m.status === 'SAFETY_FAULT' || isSafetyOk(m) === false) return 'FALHA_SEGURANCA';
  if (m.status === 'ALARM') return 'ALARME';
  if (m.status === 'MAINTENANCE') return 'MANUTENCAO';
  return m.status === 'RUNNING' ? 'OPERANDO' : 'PARADA';
}

const LABEL: Record<GlobalState, [string, string]> = {
  OPERANDO: ['Operando', 'running'],
  PARADA: ['Parada', 'warning'],
  FALHA_SEGURANCA: ['Falha de segurança', 'danger'],
  EMERGENCIA: ['Emergência', 'danger'],
  ALARME: ['Alarme', 'danger'],
  MANUTENCAO: ['Manutenção', 'warning'],
  DESCONHECIDO: ['Desconhecido (UNKNOWN)', 'warning'],
  STALE: ['Dados vencidos (STALE)', 'warning'],
};

export function GlobalStateBadge({ state }: { state: GlobalState }) {
  const [text, tone] = LABEL[state];
  return <span className={`smart-status-pill smart-status-pill--${tone}`}>{text}</span>;
}

/** Torre LED: Verde = executando | Amarelo = aguardando/setup | Vermelho = parada por alarme. */
export function TowerLight({ state, setup }: { state: GlobalState; setup: boolean }) {
  const red = state === 'EMERGENCIA' || state === 'FALHA_SEGURANCA' || state === 'ALARME';
  const green = state === 'OPERANDO';
  const yellow = !red && !green; // parada / setup / UNKNOWN / STALE: nunca "verde presumido"
  return (
    <div className="g2-tower" aria-label={`Torre luminosa: ${red ? 'vermelho' : green ? 'verde' : 'amarelo'}${setup ? ' (setup)' : ''}`}>
      <Lamp color="red" on={red} />
      <Lamp color="yellow" on={yellow} blink={setup} />
      <Lamp color="green" on={green} />
    </div>
  );
}
function Lamp({ color, on, blink }: { color: 'red' | 'yellow' | 'green'; on: boolean; blink?: boolean }) {
  return <span className={`g2-lamp g2-lamp--${color} ${on ? 'is-on' : ''} ${on && blink ? 'is-blink' : ''}`} />;
}

/** Sinaleiras físicas da botoeira: SEGURANÇA OK (verde) e SEGURANÇA ANOMALIA (vermelha). Sem dado → ambas apagadas, "N/D". */
export function SafetyLamps({ machine, usable }: { machine: MachineTelemetryData | null; usable: boolean }) {
  const safety = usable ? isSafetyOk(machine) : undefined;
  return (
    <div className="g2-safety">
      <div className="g2-safety-item">
        <span className={`g2-lamp g2-lamp--green ${safety === true ? 'is-on' : ''}`} />
        <small>SEGURANÇA OK</small>
      </div>
      <div className="g2-safety-item">
        <span className={`g2-lamp g2-lamp--red ${safety === false ? 'is-on' : ''}`} />
        <small>SEGURANÇA ANOMALIA</small>
      </div>
      {safety === undefined && <small className="g2-nd">N/D</small>}
    </div>
  );
}

export function ConnectionPill({ status, ageMs }: { status: ConnectionStatus; ageMs: number | null }) {
  const tone = status === 'CONNECTED' ? 'running' : status === 'DISCONNECTED' ? 'danger' : 'warning';
  return (
    <span className={`smart-status-pill smart-status-pill--${tone}`}>
      {status}
      {ageMs !== null && status !== 'CONNECTED' ? ` · última telemetria há ${(ageMs / 1000).toFixed(1)}s` : ''}
    </span>
  );
}
