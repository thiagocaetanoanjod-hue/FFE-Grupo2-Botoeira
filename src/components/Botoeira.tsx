import type { CommandAction } from '../contract';
import type { Machine } from '../state/useMachine';
import { EStopVisual } from './EStopVisual';
import { SafetyLamps } from './SafetyLamps';

const BUTTONS: { action: Extract<CommandAction, 'START' | 'STOP' | 'RESET' | 'SETUP' | 'DESLIGA'>; label: string; cls: string }[] = [
  { action: 'START', label: 'START', cls: 'start' },
  { action: 'STOP', label: 'STOP', cls: 'stop' },
  { action: 'RESET', label: 'RESET', cls: 'reset' },
  { action: 'SETUP', label: 'SETUP', cls: 'setup' },
  { action: 'DESLIGA', label: 'DESLIGA', cls: 'off' },
];

/** Botoeira virtual: START, STOP, RESET, SETUP, DESLIGA + sinaleiras de segurança + cogumelo visual. */
export function Botoeira({ m }: { m: Machine }) {
  return (
    <section className="g2-card" aria-label="Botoeira virtual">
      <header className="g2-card__title">Botoeira (virtual)</header>
      <div className="g2-botoeira">
        <div className="g2-botoeira__buttons">
          {BUTTONS.map((b) => {
            const d = m.decide(b.action);
            return (
              <div key={b.action} className="g2-btn-wrap">
                <button
                  type="button"
                  className={`g2-pushbutton g2-pushbutton--${b.cls}`}
                  disabled={!d.enabled}
                  onClick={() => m.send(b.action)}
                  title={d.reason ?? `${b.label} (simulado)`}
                >
                  {b.label}
                </button>
                {!d.enabled && <small className="g2-lock">🔒 {d.reason}</small>}
              </div>
            );
          })}
        </div>
        <SafetyLamps state={m.state} />
        <EStopVisual decision={m.decide('EMERGENCY_STOP_SIM')} onPress={() => m.send('EMERGENCY_STOP_SIM')} />
      </div>
    </section>
  );
}
