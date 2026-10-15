import type { LogEntry, PendingCommand } from '../state/store';

export function EventLog({ log, commands, invalidCount }: { log: LogEntry[]; commands: PendingCommand[]; invalidCount: number }) {
  const lastCmd = commands[0];
  return (
    <section className="smart-card g2-log" aria-label="Log de eventos">
      <header className="smart-card-header">
        <h2 className="smart-card-title">Eventos</h2>
        <small className="g2-tag">
          último ACK: {lastCmd ? (lastCmd.ack ? lastCmd.ack.status : 'aguardando…') : '—'} · descartados: {invalidCount}
        </small>
      </header>
      <div className="g2-log-scroll">
        <table className="smart-table">
          <thead>
            <tr><th>Hora</th><th>Tipo</th><th>Detalhe</th></tr>
          </thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan={3}>Sem eventos ainda.</td></tr>}
            {log.map((e) => (
              <tr key={e.id}>
                <td>{new Date(e.at).toLocaleTimeString('pt-BR')}</td>
                <td className={`g2-kind g2-kind--${e.kind.toLowerCase()}`}>{e.kind}</td>
                <td>{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
