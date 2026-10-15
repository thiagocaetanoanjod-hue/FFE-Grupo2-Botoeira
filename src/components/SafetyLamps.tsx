import type { EffectiveState } from '../state/derive';
import { isSafetyCondition } from '../state/derive';

/** Sinaleiras SEGURANÇA OK / SEGURANÇA ANOMALIA. Sem dado confiável: ambas apagadas (N/D) — nunca "OK" presumido. */
export function SafetyLamps({ state }: { state: EffectiveState }) {
  const known = state.trusted && state.safetyInterlockOk !== undefined;
  const anomaly = known && isSafetyCondition(state);
  const okOn = known && !anomaly;
  return (
    <div className="g2-safety-lamps">
      <div className={`g2-pilot g2-pilot--ok${okOn ? ' is-on' : ''}`}>
        <span className="g2-lamp" />
        SEGURANÇA OK
      </div>
      <div className={`g2-pilot g2-pilot--bad${anomaly ? ' is-on' : ''}`}>
        <span className="g2-lamp" />
        SEGURANÇA ANOMALIA
      </div>
      {!known && <small className="g2-nd">N/D</small>}
    </div>
  );
}
