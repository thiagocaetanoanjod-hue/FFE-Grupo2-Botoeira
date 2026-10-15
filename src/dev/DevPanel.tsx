import { useEffect, useRef } from 'react';
import { startMockBus, type Scenario } from './mockBus';

/** Painel de cenários — só aparece no modo standalone (npm run dev). Serve para os testes do runbook §7. */
export function DevPanel() {
  const bus = useRef<ReturnType<typeof startMockBus> | null>(null);
  useEffect(() => {
    bus.current = startMockBus();
    return () => bus.current?.stop();
  }, []);
  const sc = (s: Scenario) => () => bus.current?.scenario(s);

  return (
    <aside className="g2-dev" aria-label="Cenários de teste (mock)">
      <strong>Mock · cenários</strong>
      <button onClick={sc('NORMAL')}>Normal</button>
      <button onClick={sc('EMERGENCY')}>emergencyActive</button>
      <button onClick={sc('SAFETY_FAULT')}>safetyInterlockOk=false</button>
      <button onClick={sc('ALARM')}>ALARM</button>
      <button onClick={sc('UNKNOWN')}>UNKNOWN</button>
      <button onClick={() => bus.current?.setSilent(true)}>Silenciar (→ STALE)</button>
      <button onClick={() => bus.current?.setSilent(false)}>Voltar telemetria</button>
      <button onClick={() => bus.current?.setDisconnected(true)}>Desconectar</button>
      <button onClick={() => bus.current?.setDisconnected(false)}>Reconectar</button>
      <button onClick={() => bus.current?.sendInvalid()}>Payload inválido</button>
    </aside>
  );
}
