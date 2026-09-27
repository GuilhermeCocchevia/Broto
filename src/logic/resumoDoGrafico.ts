// Texto que descreve o gráfico de saldo pra quem NÃO enxerga ele (leitor de
// tela). O gráfico é uma imagem (WebView com ApexCharts, ou SVG nativo): pro
// VoiceOver ele é um "buraco". Esse resumo diz o essencial que o desenho
// mostra — de onde parte, aonde chega, o ponto mais baixo e o cenário de
// gasto maior — sempre em tom calmo e com números, igual o resto do app.
import type { MesProjetado } from './projecao';
import { formatarReal } from '../utils/formatarReal';
import { formatarMesPorExtenso } from '../utils/formatarDataBr';

export function resumirGraficoParaLeitor(
  saldoAtual: number,
  meses: MesProjetado[],
  mesesPesado?: MesProjetado[],
): string {
  if (meses.length === 0) return 'Gráfico do saldo sem dados para mostrar.';

  const ultimo = meses[meses.length - 1];
  const pior = meses.reduce((menor, mes) => (mes.saldo < menor.saldo ? mes : menor), meses[0]);
  const diferenca = ultimo.saldo - saldoAtual;
  const tendencia =
    Math.abs(diferenca) < 0.005 ? 'estável' : diferenca > 0 ? 'subindo' : 'caindo';

  const partes = [
    `Gráfico do saldo dos próximos ${meses.length} ${meses.length === 1 ? 'mês' : 'meses'}.`,
    `Hoje: ${formatarReal(saldoAtual)}.`,
    `Em ${formatarMesPorExtenso(ultimo.mes)}: ${formatarReal(ultimo.saldo)}, ${tendencia} em relação a hoje.`,
    `Ponto mais baixo entre os meses: ${formatarReal(pior.saldo)} em ${formatarMesPorExtenso(pior.mes)}.`,
  ];
  if (mesesPesado && mesesPesado.length > 0) {
    const ultimoPesado = mesesPesado[mesesPesado.length - 1];
    partes.push(`Com 20% a mais de gasto no dia a dia, o saldo final seria ${formatarReal(ultimoPesado.saldo)}.`);
  }
  return partes.join(' ');
}
