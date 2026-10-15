import type { Machine } from '../state/useMachine';

export function CommandLog({ m }: { m: Machine }) {
  return (
    <section className="g2-card" aria-label="Log de comandos simulados">
      <header className="g2-card__title">Comandos simulados / ACK</header>
      {m.invalidCount > 0 && <p className="g2-nd">{m.invalidCount} payload(s) inválido(s) descartado(s)</p>}
      {m.log.length === 0 ? (
        <p className="g2-nd">Nenhum comando enviado.</p>
      ) : (
        <table className="smart-table">
          <thead>
            <tr>
              <th>Hora (UTC)</th>
              <th>Ação</th>
              <th>ACK</th>
              <th>commandId</th>
            </tr>
          </thead>
          <tbody>
            {m.log.map((e) => (
              <tr key={e.commandId}>
                <td>{e.at.slice(11, 23)}</td>
                <td>{e.action}</td>
                <td>
                  {e.status}
                  {e.message ? ` — ${e.message}` : ''}
                </td>
                <td className="g2-mono">{e.commandId.slice(0, 16)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
