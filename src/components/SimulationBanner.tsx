export function SimulationBanner() {
  return (
    <div className="g2-sim-banner" role="alert" aria-live="polite">
      <strong>SIMULAÇÃO</strong>
      <span>
        Painel de ensaio — nenhum controle aciona a máquina. O botão de emergência desta tela <u>NÃO</u> é a parada de
        emergência física.
      </span>
    </div>
  );
}
