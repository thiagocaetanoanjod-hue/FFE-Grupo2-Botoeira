/**
 * Regras de habilitação dos controles do G2. Função PURA (testável).
 * Toda decisão devolve `reason` em texto para exibir ao operador POR QUE está bloqueado.
 *
 * DECISÃO ABERTA (levar ao instrutor): com UNKNOWN/STALE bloqueamos TODOS os controles, inclusive
 * o E-Stop *simulado*, como pede o runbook (G2: "controles bloqueados quando UNKNOWN/STALE").
 * O E-Stop real nunca depende desta UI.
 */
import type { CommandAction } from '../contract';
import { isSafetyCondition, type EffectiveState } from './derive';

export interface ControlDecision {
  enabled: boolean;
  reason?: string;
}
const ok: ControlDecision = { enabled: true };
const no = (reason: string): ControlDecision => ({ enabled: false, reason });

export function decideControl(action: CommandAction, s: EffectiveState): ControlDecision {
  if (!s.trusted) {
    if (s.reason === 'NO_DATA') return no('Sem dados (UNKNOWN)');
    if (s.reason === 'DISCONNECTED') return no('Desconectado — dado vencido (STALE)');
    if (s.reason === 'STALE') return no('Telemetria antiga (STALE)');
    return no('Estado desconhecido (UNKNOWN)');
  }

  const safety = isSafetyCondition(s);
  const running = s.status === 'RUNNING';

  switch (action) {
    case 'EMERGENCY_STOP_SIM':
      return ok; // simulação de emergência sempre disponível quando há dado confiável
    case 'START':
      if (safety) return no('Emergência/segurança ativa — faça RESET');
      if (running) return no('Máquina já em execução');
      if (s.status === 'ALARM') return no('Alarme ativo — faça RESET');
      if (s.safetyInterlockOk === undefined) return no('Intertravamento N/D');
      return ok;
    case 'STOP':
      return running ? ok : no('Máquina não está em execução');
    case 'RESET':
      return safety || s.status === 'ALARM' ? ok : no('Nada a reinicializar');
    case 'SETUP':
      if (safety) return no('Emergência/segurança ativa');
      return running ? no('Pare a máquina antes do SETUP') : ok;
    case 'DESLIGA':
      return running ? no('Pare a máquina antes de DESLIGAR') : ok;
    case 'MODE_SELECT':
      if (safety) return no('Emergência/segurança ativa');
      return running ? no('Pare a máquina para trocar o modo') : ok;
    case 'JOG_BACKWARD':
    case 'JOG_FORWARD':
      if (safety) return no('Emergência/segurança ativa');
      if (s.mode !== 'MANUAL') return no('Disponível só em modo MANUAL');
      return running ? no('Pare a máquina para movimentação manual') : ok;
  }
}
