// Lógica da reserva de emergência: quantos meses de despesa o saldo atual
// cobre, e quando faz sentido SUGERIR essa funcionalidade pra quem já
// recusou uma vez. Regra de negócio central (decisão consciente, não
// técnica): nunca insistir por tempo — só voltar a sugerir quando a saúde
// financeira do usuário mostrar sinal real de melhora (taxa de poupança
// positiva por alguns meses seguidos), pra não pressionar ninguém.
import type { MetaReserva, Transacao } from '../types/models';
import { adicionarMeses } from './projecao';
import { calcularTaxaDePoupanca, calcularTotalDespesasDoMes } from './saudeFinanceira';

// A decisão mais recente do usuário sobre a reserva — `null` significa que
// ele nunca foi perguntado (nem ativou, nem recusou). Mesma ideia de
// obterSaldoAtual: como as linhas são insert-only, "o estado atual" é
// sempre a linha com criadoEm mais recente.
export function obterMetaAtual(metas: MetaReserva[]): MetaReserva | null {
  if (metas.length === 0) return null;
  return metas.reduce((atual, candidata) => (candidata.criadoEm > atual.criadoEm ? candidata : atual));
}

// Média de despesa mensal olhando pra trás `quantidadeMeses` a partir de
// `mesFinal` (inclusive) — usada como "quanto eu gasto normalmente por mês"
// pra saber quantos meses o saldo atual aguentaria.
export function calcularDespesaMediaMensal(
  transacoes: Transacao[],
  mesFinal: string,
  quantidadeMeses: number,
): number {
  if (quantidadeMeses <= 0) return 0;

  let soma = 0;
  let mes = mesFinal;
  for (let i = 0; i < quantidadeMeses; i++) {
    soma += calcularTotalDespesasDoMes(transacoes, mes);
    mes = adicionarMeses(mes, -1);
  }

  return soma / quantidadeMeses;
}

// Quantos meses de despesa o saldo atual cobre — o número central da
// reserva de emergência ("você tem X meses de colchão"). Sem despesa média
// (usuário não tem histórico, ou não gasta nada) não dá pra calcular uma
// proporção — devolve 0 em vez de Infinity.
export function calcularMesesDeReservaCobertos(saldoAtual: number, despesaMediaMensal: number): number {
  if (despesaMediaMensal <= 0) return 0;
  return saldoAtual / despesaMediaMensal;
}

// Sinal pra saber se vale sugerir (de novo) a reserva pra quem já recusou:
// taxa de poupança positiva nos últimos `quantidadeMeses` meses FECHADOS
// (`mesFinal` pra trás) seguidos. "Fechados" = normalmente o mês anterior
// ao atual, nunca o mês corrente — ele ainda não terminou, então a taxa
// dele pode mudar a qualquer lançamento novo, não é um sinal confiável
// ainda de "esses 3 meses foram bons".
export function taxaDePoupancaPositivaPorMesesSeguidos(
  transacoes: Transacao[],
  mesFinal: string,
  quantidadeMeses: number,
): boolean {
  let mes = mesFinal;
  for (let i = 0; i < quantidadeMeses; i++) {
    if (calcularTaxaDePoupanca(transacoes, mes) <= 0) {
      return false;
    }
    mes = adicionarMeses(mes, -1);
  }
  return true;
}
