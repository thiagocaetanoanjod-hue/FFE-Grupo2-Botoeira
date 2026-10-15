import type { ControlDecision } from '../state/controls';

/** Cogumelo VISUAL de emergência. Rótulo explícito para não ser confundido com o dispositivo físico. */
export function EStopVisual({ decision, onPress }: { decision: ControlDecision; onPress: () => void }) {
  return (
    <div className="g2-estop">
      <button
        type="button"
        className="g2-estop__mushroom"
        disabled={!decision.enabled}
        onClick={onPress}
        aria-label="Emergência simulada (não é o botão físico)"
        title={decision.reason ?? 'Emergência SIMULADA'}
      >
        <span>E-STOP</span>
      </button>
      <small className="g2-estop__tag">VISUAL / SIMULADO — não substitui o E-Stop físico</small>
      {!decision.enabled && <small className="g2-lock">🔒 {decision.reason}</small>}
    </div>
  );
}
