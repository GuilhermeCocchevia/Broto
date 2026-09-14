import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors } from '../theme/colors';
import { formatarReal } from '../utils/formatarReal';
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

export function GraficoSaldo({
  saldoAtual,
  meses,
}: {
  saldoAtual: number;
  meses: MesProjetado[];
}) {
  // O gráfico começa em "Hoje" (o saldo atual) e depois um ponto por mês
  // projetado — assim a linha mostra de onde você parte, não só pra onde vai.
  const pontos = [
    { value: saldoAtual, label: 'Hoje' },
    ...meses.map((mes) => ({ value: mes.saldo, label: abreviarMes(mes.mes) })),
  ];

  return (
    <View style={styles.container}>
      <LineChart
        data={pontos}
        width={LARGURA_GRAFICO}
        height={180}
        // `curved` deixa a linha suave (curva) em vez de segmentos retos —
        // é o que dá aquele visual "moderno" em vez de gráfico de planilha.
        curved
        areaChart
        startFillColor={colors.primary}
        startOpacity={0.35}
        endFillColor={colors.primary}
        endOpacity={0.02}
        color={colors.primaryDark}
        thickness={3}
        dataPointsColor={colors.primaryDark}
        dataPointsRadius={4}
        hideRules
        hideYAxisText
        xAxisColor={colors.surface}
        xAxisLabelTextStyle={styles.rotuloEixo}
        yAxisThickness={0}
        initialSpacing={12}
        endSpacing={12}
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
          pointerLabelComponent: (itens: { value: number }[]) => (
            <View style={styles.balaoValor}>
              <Text style={styles.balaoValorTexto}>{formatarReal(itens[0].value)}</Text>
            </View>
          ),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
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
