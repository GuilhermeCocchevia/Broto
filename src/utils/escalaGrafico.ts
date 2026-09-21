import { maiorValorDaSerie } from './corPorValor';

// Quanto do eixo vertical (em fração da profundidade negativa) fica ACIMA do
// zero quando a série não tem nenhum valor positivo — só um respiro pro ponto
// "Hoje" (R$0) e a linha não colarem na borda de cima.
const FOLGA_ACIMA_DO_ZERO = 0.15;

export type EscalaDoGrafico = {
  maxValue: number;
  mostNegativeValue: number;
  // Altura (px) da parte ACIMA do zero — é o que a biblioteca chama de
  // `height`. A parte negativa sai de `altura * |mostNegativeValue| /
  // maxValue`, então altura total = altura + parte negativa.
  altura: number;
};

// Decide a escala vertical do gráfico de saldo (ver GraficoSaldo.tsx).
//
// Caso normal (existe algum saldo positivo): o pico positivo ocupa
// `alturaTotal` e o lado negativo é proporcional a ele, com um piso de
// `proporcaoMaximaNegativa` × pico pra uma dívida funda não virar um paredão.
//
// Caso sem nenhum valor positivo (ex: saldo de hoje R$0 e uma meta que faz
// tudo ficar negativo): antes o pico caía num valor-padrão (100) e a
// biblioteca reservava `alturaTotal` INTEIRA de espaço vazio acima do zero
// — o gráfico parecia começar bem embaixo, com um vazio grande em cima — e
// o piso derivado desse valor-padrão (-150) achatava a queda toda numa
// linha reta. Agora o espaço acima do zero é só uma folga pequena, o piso
// negativo é o valor real mais fundo (sem achatar), e a altura TOTAL
// continua sendo `alturaTotal`.
export function calcularEscalaDoGrafico(
  valoresReais: number[],
  alturaTotal: number,
  proporcaoMaximaNegativa: number,
): EscalaDoGrafico {
  const menorReal = Math.min(0, ...valoresReais);
  const semValorPositivo = Math.max(...valoresReais) <= 0;

  if (semValorPositivo && menorReal < 0) {
    const profundidade = -menorReal;
    const folga = profundidade * FOLGA_ACIMA_DO_ZERO;
    return {
      maxValue: folga,
      mostNegativeValue: menorReal,
      altura: (alturaTotal * folga) / (folga + profundidade),
    };
  }

  const maxValue = maiorValorDaSerie(valoresReais);
  return {
    maxValue,
    mostNegativeValue: Math.max(menorReal, -maxValue * proporcaoMaximaNegativa),
    altura: alturaTotal,
  };
}
