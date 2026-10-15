import type { CommandAction, MachineTelemetryData, OperationMode } from '../contracts/contrato-smart40-v0.1';
import type { GuardResult } from '../lib/guards';
import { GlobalStateBadge, TowerLight, type GlobalState } from './Indicators';

interface Props {
  machine: MachineTelemetryData | null;
  globalState: GlobalState;
  check: (a: CommandAction) => GuardResult;
  send: (a: CommandAction, target?: 'BOTOEIRA' | 'IHM', params?: { mode?: OperationMode }) => boolean;
}

const MODES: { value: OperationMode; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'SEMI_AUTO', label: 'Semi-automático' },
  { value: 'AUTO', label: 'Automático' },
];

/** Réplica web (simplificada) da IHM SIMATIC KTP700: seleção de modo, direcional << / >> e status. */
export function HmiTouch({ machine, globalState, check, send }: Props) {
  const setMode = check('SET_MODE');
  const back = check('JOG_BACKWARD');
  const fwd = check('JOG_FORWARD');
  return (
    <section className="smart-card g2-hmi" aria-label="IHM touch simulada">
      <header className="smart-card-header">
        <h2 className="smart-card-title">IHM SIMATIC KTP700</h2>
        <small className="g2-tag">SIMULADA</small>
      </header>

      <div className="g2-hmi-screen">
        <div className="g2-hmi-status">
          <GlobalStateBadge state={globalState} />
          <TowerLight state={globalState} setup={machine?.setupKeyOn === true} />
        </div>

        <div className="g2-hmi-block">
          <span className="g2-label">Modo de operação</span>
          <div className="g2-segment" role="radiogroup" aria-label="Modo de operação">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={machine?.mode === m.value}
                className={`g2-seg ${machine?.mode === m.value ? 'is-active' : ''}`}
                disabled={!setMode.allowed}
                title={setMode.allowed ? undefined : setMode.reason}
                onClick={() => send('SET_MODE', 'IHM', { mode: m.value })}
              >
                {m.label}
              </button>
            ))}
          </div>
          {machine?.mode === undefined && <small className="g2-nd">modo: N/D</small>}
        </div>

        <div className="g2-hmi-block">
          <span className="g2-label">Direcional (somente modo Manual)</span>
          <div className="g2-jog">
            <button type="button" className="smart-btn smart-btn--primary" disabled={!back.allowed} title={back.reason} onClick={() => send('JOG_BACKWARD', 'IHM')}>
              &laquo;
            </button>
            <button type="button" className="smart-btn smart-btn--primary" disabled={!fwd.allowed} title={fwd.reason} onClick={() => send('JOG_FORWARD', 'IHM')}>
              &raquo;
            </button>
          </div>
        </div>

        <div className="g2-hmi-block">
          <span className="g2-label">Dados</span>
          <div className="smart-digital-display g2-data">
            <div>CICLO: {machine?.cycleTimeMs === undefined ? 'N/D' : `${(machine.cycleTimeMs / 1000).toFixed(1)} s`}</div>
            <div>ALARMES: {machine?.alarms === undefined ? 'N/D' : machine.alarms.length === 0 ? 'nenhum' : machine.alarms.join(' | ')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
