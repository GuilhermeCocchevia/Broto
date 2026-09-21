// As "premissas" da projeção do futuro, num lugar só: tudo que o app assume
// pra dizer "dá pra fazer" ou "cuidado", montado uma vez e usado por todas as
// telas que avaliam simulações (Detalhe, Comparar) — antes cada tela refazia
// a conta do seu jeito, e podiam se contradizer. Também é o que alimenta o
// cartão "Como calculei", pro usuário enxergar de onde vem o veredito.
import type { SaldoInicial, Transacao } from '../types/models';
import {
  adicionarMeses,
  calcularRendaEsperadaDoMes,
  calcularRendaFixaMedia,
  obterSaldoAtual,
} from './projecao';
import { estimarGastosFuturos, type EstimativaDeGastos } from './estimativaDeGastos';
import { calcularDespesasFixasDoMes } from './orcamentoMensal';

export type PremissasDeProjecao = {
  saldoAtual: number;
  // Estimativa de renda pra meses sem receita avulsa própria (ver
  // calcularRendaFixaMedia) — é o que o motor recebe.
  rendaFixaMensal: number;
  estimativa: EstimativaDeGastos;
  // Retrato de um mês futuro TÍPICO (o mês que vem), pra mostrar na tela.
  mesTipico: string;
  rendaEsperada: number;
  despesasFixas: number;
  // Gasto do dia a dia: variável + o que se repete na prática (cartões).
  gastoDoDiaADia: number;
  sobraTipica: number;
};

export function montarPremissas(
  transacoes: Transacao[],
  saldosIniciais: SaldoInicial[],
  mesAtual: string,
): PremissasDeProjecao {
  const saldoAtual = obterSaldoAtual(saldosIniciais, transacoes);
  const rendaFixaMensal = calcularRendaFixaMedia(transacoes);
  const estimativa = estimarGastosFuturos(transacoes, mesAtual);

  const mesTipico = adicionarMeses(mesAtual, 1);
  const rendaEsperada = calcularRendaEsperadaDoMes(transacoes, mesTipico, rendaFixaMensal);
  const despesasFixas = calcularDespesasFixasDoMes(transacoes, mesTipico);
  const gastoDoDiaADia =
    estimativa.gastoVariavelMensal +
    estimativa.recorrentesNaPratica.reduce((soma, r) => soma + r.valorMensal, 0);

  return {
    saldoAtual,
    rendaFixaMensal,
    estimativa,
    mesTipico,
    rendaEsperada,
    despesasFixas,
    gastoDoDiaADia,
    sobraTipica: rendaEsperada - despesasFixas - gastoDoDiaADia,
  };
}

// Frase (sempre calma, nunca de alarme) sobre o quanto dá pra confiar na
// estimativa de gasto do dia a dia.
export function textoDaConfianca(estimativa: EstimativaDeGastos): string {
  const meses = estimativa.mesesComDado;
  switch (estimativa.confianca) {
    case 'sem-dados':
      return 'Ainda não há gastos avulsos lançados, então a projeção pode estar otimista.';
    case 'baixa':
      return 'Baseado em 1 mês de lançamentos — quanto mais você lançar, mais precisa fica.';
    case 'media':
      return `Baseado em ${meses} meses de lançamentos.`;
    default:
      return `Baseado em ${meses} meses de lançamentos.`;
  }
}
