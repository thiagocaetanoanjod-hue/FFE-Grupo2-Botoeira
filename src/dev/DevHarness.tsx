import { useEffect, useRef } from 'react';
import { MockProducer, type Scenario } from './mockProducer';

const SCENARIOS: Scenario[] = ['NORMAL', 'ALARM', 'SAFETY_FAULT', 'EMERGENCY', 'UNKNOWN_STATUS', 'NO_SAFETY_SIGNAL'];

/** Painel de desenvolvimento (só standalone): simula o que o G1 publicaria no barramento. */
export function DevHarness() {
  const p = useRef<MockProducer | null>(null);
  useEffect(() => {
    const mp = new MockProducer();
    mp.start();
    p.current = mp;
    return () => mp.stop();
  }, []);

  return (
    <aside className="g2-dev" aria-label="Harness de desenvolvimento">
      <strong>DEV — mock do barramento (não existe no Shell)</strong>
      <div className="g2-dev__row">
        {SCENARIOS.map((s) => (
          <button key={s} type="button" onClick={() => p.current?.setScenario(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="g2-dev__row">
        <button type="button" onClick={() => { if (p.current) p.current.silenced = true; }}>Silenciar telemetria (→ STALE)</button>
        <button type="button" onClick={() => { if (p.current) p.current.silenced = false; }}>Retomar telemetria</button>
        <button type="button" onClick={() => p.current?.publishConnection('DISCONNECTED')}>Desconectar</button>
        <button type="button" onClick={() => p.current?.publishConnection('CONNECTED')}>Reconectar</button>
        <button type="button" onClick={() => p.current?.publishInvalid()}>Payload inválido</button>
      </div>
    </aside>
  );
}
