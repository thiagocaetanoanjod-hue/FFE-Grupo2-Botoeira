import type {
  CommandAction,
  ConnectionStatus,
  MachineTelemetryData,
} from '../contracts/contrato-smart40-v0.1';

/**
 * Regras de bloqueio da botoeira/IHM (runbook §6 G2, §7 e §8).
 * Função pura: recebe o que a UI sabe e devolve se o comando pode ser EMITIDO (simulado) e por quê não.
 * A UI não é camada de proteção — isto só evita emitir eventos que fariam pouco sentido.
 */
export interface GuardInput {
  connection: ConnectionStatus;
  machine: MachineTelemetryData | null;
}
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

/** Ações no sentido "desenergizar": continuam disponíveis mesmo sem telemetria (decisão a confirmar com o instrutor). */
const ALWAYS_ALLOWED: ReadonlySet<CommandAction> = new Set(['STOP', 'ESTOP_SIM', 'DESLIGA']);

export function isSafetyOk(m: MachineTelemetryData | null): boolean | undefined {
  if (!m) return undefined;
  if (m.emergencyActive === true) return false;
  return m.safetyInterlockOk;
}

export function canIssue(action: CommandAction, { connection, machine }: GuardInput): GuardResult {
  if (ALWAYS_ALLOWED.has(action)) return { allowed: true };

  if (connection !== 'CONNECTED') {
    return { allowed: false, reason: `Sem dados válidos (${connection}). Controles bloqueados.` };
  }
  if (!machine || machine.status === 'UNKNOWN') {
    return { allowed: false, reason: 'Estado da máquina desconhecido (UNKNOWN).' };
  }

  const safety = isSafetyOk(machine);
  const faulted =
    machine.emergencyActive === true ||
    safety === false ||
    machine.status === 'SAFETY_FAULT' ||
    machine.status === 'ALARM';

  switch (action) {
    case 'RESET':
      // Reset é justamente a ação de rearme; só impedimos quando a máquina está rodando.
      return machine.status === 'RUNNING'
        ? { allowed: false, reason: 'Reset indisponível com a máquina em execução.' }
        : { allowed: true };

    case 'START':
      if (machine.emergencyActive === true) return { allowed: false, reason: 'Emergência ativa. Rearme com RESET.' };
      if (safety !== true) return { allowed: false, reason: 'Segurança não confirmada (SEGURANÇA ANOMALIA / N/D).' };
      if (faulted) return { allowed: false, reason: 'Alarme/falha ativa. Use RESET.' };
      if (machine.status === 'RUNNING') return { allowed: false, reason: 'Máquina já está em execução.' };
      if (machine.status === 'MAINTENANCE') return { allowed: false, reason: 'Máquina em manutenção.' };
      return { allowed: true };

    case 'SET_MODE':
      return machine.status === 'RUNNING'
        ? { allowed: false, reason: 'Pare a máquina antes de trocar o modo.' }
        : { allowed: true };

    case 'JOG_BACKWARD':
    case 'JOG_FORWARD':
      if (machine.mode !== 'MANUAL') return { allowed: false, reason: 'Direcional só no modo MANUAL.' };
      if (faulted || safety !== true) return { allowed: false, reason: 'Direcional bloqueado: segurança não OK.' };
      if (machine.status === 'RUNNING') return { allowed: false, reason: 'Pare a máquina antes do jog.' };
      return { allowed: true };

    case 'SETUP_TOGGLE':
      return machine.status === 'RUNNING'
        ? { allowed: false, reason: 'Pare a máquina antes de alternar SETUP.' }
        : { allowed: true };

    default:
      return { allowed: true };
  }
}
