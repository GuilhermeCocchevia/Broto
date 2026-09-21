import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../theme/colors';
import { formatarReal } from '../utils/formatarReal';
import { corDoSaldo } from '../utils/corPorValor';
import { calcularEscalaDoGrafico } from '../utils/escalaGrafico';
import { FATOR_IMPREVISTOS } from '../logic/cenariosDeProjecao';
import { calcularMesesDeGastoCobertos } from '../logic/saudeFinanceira';
import type { MesProjetado } from '../logic/projecao';

// Abrevia 'AAAA-MM' pro nome curto do mês em português, só pro eixo do
// gráfico não ficar poluído com "2026-10" embaixo de cada ponto.
const MESES_ABREVIADOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];
function abreviarMes(mes: string): string {
  const numeroDoMes = Number(mes.slice(5, 7));
  return MESES_ABREVIADOS[numeroDoMes - 1];
}

// Largura do gráfico = largura da tela menos o padding da tela (24 de cada
// lado, ver `conteudo` em SimuladorScreen) — sem isso o gráfico ou vaza da
// tela ou sobra espaço em branco, dependendo do aparelho.
const LARGURA_TELA = Dimensions.get('window').width;
const LARGURA_GRAFICO = LARGURA_TELA - 48;

const ALTURA_GRAFICO = 180;
// Respiro antes do primeiro ponto e depois do último (dentro da largura).
const ESPACO_LATERAL = 12;
// A biblioteca (`react-native-gifted-charts`) calcula a altura da parte
// NEGATIVA do gráfico como `ALTURA_GRAFICO * (|menorValor| / maiorValor)` —
// uma proporção direta, sem limite. Numa simulação de dívida que não cabe
// no orçamento (o caso que o Simulador existe pra mostrar!), o saldo
// projetado despenca muito mais fundo do que o saldo positivo de hoje é
// alto — ex: hoje R$270, projeção cai pra -R$6.000 — e a conta vira
// `180 * (6000/270)` ≈ 4000px de altura, um gráfico gigantesco e feio.
// Resolvido "achatando" (clamp) o valor exibido no gráfico num piso
// proporcional ao pico positivo, sem mexer no valor REAL mostrado no balão
// ao tocar nem na tabela de meses abaixo (essas continuam com o número
// exato) — o gráfico vira só um resumo visual da tendência, a precisão
// mora na tabela.
const PROPORCAO_MAXIMA_NEGATIVA = 1.5;

export function GraficoSaldo({
  saldoAtual,
  meses,
  mesesPesado,
}: {
  saldoAtual: number;
  meses: MesProjetado[];
  // Cenário "mais pesado" (ver cenariosDeProjecao.ts), desenhado como uma
  // segunda linha tracejada — a faixa entre o esperado e o pior razoável.
  // Ausente = só a linha esperada.
  mesesPesado?: MesProjetado[];
}) {
  const valoresReais = [saldoAtual, ...meses.map((mes) => mes.saldo)];
  // O eixo precisa caber as DUAS linhas, senão a tracejada sairia do quadro.
  const valoresDaEscala = mesesPesado
    ? [...valoresReais, ...mesesPesado.map((mes) => mes.saldo)]
    : valoresReais;
  // Escala vertical (até onde o eixo vai pra cima e pra baixo, e a altura da
  // parte acima do zero) — ver calcularEscalaDoGrafico pro raciocínio
  // completo, inclusive o caso "nenhum saldo positivo" (que antes deixava um
  // vazio grande acima da linha) e o teto de profundidade pra dívida funda
  // não virar um paredão.
  const escala = calcularEscalaDoGrafico(valoresDaEscala, ALTURA_GRAFICO, PROPORCAO_MAXIMA_NEGATIVA);
  const menorValorPermitido = escala.mostNegativeValue;

  // Referência ABSOLUTA pra cor (ver corDoSaldo em corPorValor.ts): a média
  // de saída mensal da própria janela sendo mostrada — "quantos meses, no
  // ritmo de gasto DESSA simulação, esse saldo aguentaria". Diferente do
  // `escala` acima (que é só o eixo do gráfico), essa conta não
  // depende de nenhum outro ponto da série além do próprio ritmo de gasto —
  // um saldo saudável continua verde não importa quão alto o gráfico chega
  // lá na frente.
  const despesaMediaDoPeriodo = meses.reduce((soma, mes) => soma + mes.saidas, 0) / meses.length;
  const corPorSaldo = (saldo: number) =>
    corDoSaldo(calcularMesesDeGastoCobertos(saldo, despesaMediaDoPeriodo));

  // O gráfico começa em "Hoje" (o saldo atual) e depois um ponto por mês
  // projetado — assim a linha mostra de onde você parte, não só pra onde vai.
  // `valorReal` viaja junto com cada ponto só pro balão de toque mostrar o
  // número exato mesmo quando `value` (o que desenha a curva) foi achatado.
  // `dataPointColor` por ponto é a "saúde" daquele mês específico (ver
  // `corDoSaldo`) — antes o gráfico ficava sempre verde, não importava se a
  // projeção estava andando pra uma dívida ou não.
  const pontos = [
    {
      value: saldoAtual,
      valorReal: saldoAtual,
      label: 'Hoje',
      dataPointColor: corPorSaldo(saldoAtual),
    },
    ...meses.map((mes) => ({
      value: Math.max(mes.saldo, menorValorPermitido),
      valorReal: mes.saldo,
      label: abreviarMes(mes.mes),
      dataPointColor: corPorSaldo(mes.saldo),
    })),
  ];

  // Pontos da linha tracejada: o mesmo "Hoje" e um por mês, achatados no
  // mesmo piso do eixo (o valor exato só existe na tabela).
  const pontosPesado = mesesPesado
    ? [
        { value: saldoAtual },
        ...mesesPesado.map((mes) => ({ value: Math.max(mes.saldo, menorValorPermitido) })),
      ]
    : undefined;

  // A LINHA (não só os pontos) também muda de cor conforme a "saúde" do
  // saldo — cada segmento pega a cor do ponto em que ele TERMINA, então a
  // transição de verde pra amarelo/vermelho acontece bem onde a projeção
  // realmente começa a apertar, não só nos pontinhos isolados.
  const segmentosDaLinha = pontos.slice(1).map((ponto, indice) => ({
    startIndex: indice,
    endIndex: indice + 1,
    color: ponto.dataPointColor,
  }));

  // Área/linha "de base" usam a cor do PIOR mês da série inteira — dá o
  // clima geral da simulação (arriscada ou tranquila) de relance, antes
  // mesmo de olhar pra curva com atenção.
  const piorSaldo = Math.min(...valoresReais);
  const corDoPior = corPorSaldo(piorSaldo);

  return (
    <View style={styles.container}>
      <LineChart
        data={pontos}
        width={LARGURA_GRAFICO}
        height={escala.altura}
        // Sem esses dois, a biblioteca tentaria auto-detectar o menor valor
        // a partir dos pontos já achatados — o que ainda destravaria a
        // altura toda vez que o achatamento entrasse em ação. Fixando os
        // dois explicitamente, a altura do gráfico fica sempre previsível.
        maxValue={escala.maxValue}
        mostNegativeValue={menorValorPermitido}
        // `curved` deixa a linha suave (curva) em vez de segmentos retos —
        // é o que dá aquele visual "moderno" em vez de gráfico de planilha.
        curved
        areaChart
        startFillColor={corDoPior}
        startOpacity={0.35}
        endFillColor={corDoPior}
        endOpacity={0.02}
        color={corDoPior}
        lineSegments={segmentosDaLinha}
        thickness={3}
        // Linha tracejada e discreta do cenário mais pesado (sem pontos, sem
        // preenchimento) — informação de contexto, não o protagonista.
        data2={pontosPesado}
        color2={colors.textMuted}
        thickness2={2}
        strokeDashArray2={[6, 6]}
        hideDataPoints2
        dataPointsRadius={4}
        hideRules
        hideYAxisText
        xAxisColor={colors.surface}
        xAxisLabelTextStyle={styles.rotuloEixo}
        yAxisThickness={0}
        initialSpacing={ESPACO_LATERAL}
        endSpacing={ESPACO_LATERAL}
        // Distância entre pontos calculada pra a série INTEIRA caber na
        // largura, seja com 6 ou 12+ meses — o padrão da biblioteca (50px)
        // só cabia em ~7 pontos; com mais que isso a linha saía pela borda
        // direita e o último mês ficava cortado.
        spacing={(LARGURA_GRAFICO - 2 * ESPACO_LATERAL) / Math.max(1, pontos.length - 1)}
        // pointerConfig liga o "toque e arraste pra ver o valor exato" —
        // sem isso o gráfico é só decorativo, com isso vira interativo.
        pointerConfig={{
          pointerStripHeight: 160,
          pointerStripColor: colors.primaryDark,
          pointerStripWidth: 1,
          pointerColor: colors.primaryDark,
          radius: 5,
          pointerLabelWidth: 100,
          pointerLabelHeight: 40,
          activatePointersOnLongPress: false,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (itens: { valorReal: number }[]) => (
            <View style={[styles.balaoValor, { backgroundColor: corPorSaldo(itens[0].valorReal) }]}>
              <Text style={styles.balaoValorTexto}>{formatarReal(itens[0].valorReal)}</Text>
            </View>
          ),
        }}
      />
      {pontosPesado && (
        <Text style={styles.legenda}>
          Linha tracejada: se o gasto do dia a dia custar {Math.round((FATOR_IMPREVISTOS - 1) * 100)}% a mais.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legenda: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  // Sem `marginTop` próprio agora — o espaçamento em relação ao que vem
  // antes (o botão "+ nova simulação") é controlado pelo `gap` do
  // container pai (ver SimuladorScreen.tsx), pra não empilhar dois
  // espaços diferentes um em cima do outro.
  container: {
    alignItems: 'center',
  },
  rotuloEixo: {
    color: colors.textMuted,
    fontSize: 11,
  },
  balaoValor: {
    backgroundColor: colors.primaryDark,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  balaoValorTexto: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 12,
  },
});
