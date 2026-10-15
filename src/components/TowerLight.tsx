import type { EffectiveState } from '../state/derive';
import { isSafetyCondition } from '../state/derive';

/** Torre LED (Verde: executando | Amarelo: aguardando/setup | Vermelho: parada por alarme/emergência). */
export function TowerLight({ state }: { state: EffectiveState }) {
  let on: 'green' | 'yellow' | 'red' | null = null;
  let label = 'SEM DADOS';
  if (state.trusted) {
    if (isSafetyCondition(state) || state.status === 'ALARM') {
      on = 'red';
      label = 'ALARME / EMERGÊNCIA';
    } else if (state.status === 'RUNNING') {
      on = 'green';
      label = 'EXECUTANDO';
    } else {
      on = 'yellow';
      label = 'AGUARDANDO / SETUP';
    }
  } else if (state.status === 'STALE') {
    label = 'DADO VENCIDO';
  }
  return (
    <div className="g2-tower" aria-label={`Torre luminosa: ${label}`}>
      {(['red', 'yellow', 'green'] as const).map((c) => (
        <span key={c} className={`g2-lamp g2-lamp--${c}${on === c ? ' is-on' : ''}`} />
      ))}
      <small>{label}</small>
    </div>
  );
}
