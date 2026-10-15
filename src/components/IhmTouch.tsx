import type { MachineMode } from '../contract';
import type { Machine } from '../state/useMachine';

const MODES: { value: Exclude<MachineMode, 'UNKNOWN'>; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'SEMI_AUTO', label: 'Semi-automático' },
  { value: 'AUTO', label: 'Automático' },
];

const STATUS_LABEL: Record<string, string> = {
  IDLE: 'Desligada',
  READY: 'Pronta',
  RUNNING: 'Operando',
  STOPPED: 'Parada',
  ALARM: 'Alarme',
  SAFETY_FAULT: 'Falha de segurança',
  EMERGENCY: 'Emergência',
  UNKNOWN: 'Desconhecido (UNKNOWN)',
  STALE: 'Dado vencido (STALE)',
};

/** Réplica web simplificada da IHM SIMATIC: seletor de modo, direcionais << >> e estado global. */
export function IhmTouch({ m }: { m: Machine }) {
  const { state } = m;
  const modeLock = m.decide('MODE_SELECT');
  const back = m.decide('JOG_BACKWARD');
  const fwd = m.decide('JOG_FORWARD');
  const tone = !state.trusted ? 'off' : state.status === 'RUNNING' ? 'ok' : state.status === 'ALARM' || state.status === 'EMERGENCY' || state.status === 'SAFETY_FAULT' ? 'danger' : 'warning';

  return (
    <section className="g2-card g2-ihm" aria-label="IHM touch (mock)">
      <header className="g2-card__title">IHM Touch (mock SIMATIC)</header>

      <div className="g2-ihm__status">
        <span className="g2-label">Estado global</span>
        <span className={`g2-state g2-state--${tone}`} data-testid="estado-global">
          {STATUS_LABEL[state.status] ?? state.status}
        </span>
        {!state.trusted && state.lastTimestamp && <small className="g2-nd">último dado: {state.lastTimestamp}</small>}
      </div>

      <div className="g2-ihm__mode" role="radiogroup" aria-label="Modo de operação">
        <span className="g2-label">Modo (seletor)</span>
        <div className="g2-segmented">
          {MODES.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={state.mode === o.value}
              className={`g2-seg${state.mode === o.value ? ' is-active' : ''}`}
              disabled={!modeLock.enabled}
              onClick={() => m.send('MODE_SELECT', o.value)}
              title={modeLock.reason}
            >
              {o.label}
            </button>
          ))}
        </div>
        {!modeLock.enabled && <small className="g2-lock">🔒 {modeLock.reason}</small>}
        {state.mode === 'UNKNOWN' && <small className="g2-nd">Modo N/D</small>}
      </div>

      <div className="g2-ihm__jog">
        <span className="g2-label">Movimento manual (simulado)</span>
        <div className="g2-jog">
          <button type="button" className="g2-jog__btn" disabled={!back.enabled} onClick={() => m.send('JOG_BACKWARD')} title={back.reason}>
            «
          </button>
          <button type="button" className="g2-jog__btn" disabled={!fwd.enabled} onClick={() => m.send('JOG_FORWARD')} title={fwd.reason}>
            »
          </button>
        </div>
        {!(back.enabled && fwd.enabled) && <small className="g2-lock">🔒 {back.reason ?? fwd.reason}</small>}
      </div>
    </section>
  );
}
