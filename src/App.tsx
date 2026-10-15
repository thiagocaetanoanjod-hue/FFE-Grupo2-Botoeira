import { Botoeira } from './components/Botoeira';
import { CommandLog } from './components/CommandLog';
import { IhmTouch } from './components/IhmTouch';
import { SimulationBanner } from './components/SimulationBanner';
import { TowerLight } from './components/TowerLight';
import { useMachine } from './state/useMachine';

export default function App() {
  const m = useMachine();
  return (
    <div className="g2-root">
      <SimulationBanner />
      <header className="g2-header">
        <h1>IHM Siemens + Botoeira</h1>
        <span className="smart-status-pill smart-status-pill--warning">Grupo 2 · Sprint 1</span>
        <span className="g2-conn">conexão: {m.connection ?? 'N/D'}</span>
      </header>
      <main className="g2-grid">
        <IhmTouch m={m} />
        <div className="g2-col">
          <Botoeira m={m} />
          <section className="g2-card" aria-label="Torre luminosa">
            <header className="g2-card__title">Torre luminosa</header>
            <TowerLight state={m.state} />
          </section>
        </div>
        <CommandLog m={m} />
      </main>
    </div>
  );
}
