import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import { montarOpcoesApex } from '../charts/opcoesApex';
import { montarHtmlDoGrafico } from '../charts/htmlDoGrafico';
import { APEXCHARTS_JS } from '../charts/apexchartsEmbutido';
import { FATOR_IMPREVISTOS } from '../logic/cenariosDeProjecao';
import type { MesProjetado } from '../logic/projecao';

const ALTURA = 300;
// Se o gráfico não desenhar nesse tempo (WebView com problema), desiste e o
// app volta pro gráfico nativo — o usuário nunca fica com um quadro em branco.
const LIMITE_DE_ESPERA_MS = 10000;

// O ApexCharts é uma biblioteca de navegador (DOM/SVG): aqui ele roda dentro
// de uma WebView (`react-native-webview`, um módulo NATIVO). Duas
// consequências:
//  1. O módulo só existe no app depois de reconstruir o build nativo
//     (`npx expo run:ios`). Antes disso, importar `react-native-webview` LANÇA
//     ERRO (ele exige o módulo nativo no import) — por isso o `require` é
//     tardio e protegido; sem o módulo, `apexDisponivel()` é falso e o app
//     usa o gráfico nativo (ver GraficoSaldo.tsx).
//  2. O código do ApexCharts é embutido no app (sem CDN, funciona offline) —
//     ver scripts/gerar-apexcharts-embutido.js.
let webViewEmCache: ComponentType<Record<string, unknown>> | null | undefined;

function obterWebView(): ComponentType<Record<string, unknown>> | null {
  if (webViewEmCache === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      webViewEmCache = require('react-native-webview').WebView;
    } catch {
      webViewEmCache = null;
    }
  }
  return webViewEmCache ?? null;
}

export function apexDisponivel(): boolean {
  return obterWebView() !== null;
}

export function GraficoApex({
  saldoAtual,
  meses,
  mesesPesado,
  corLinha,
  onFalha,
}: {
  saldoAtual: number;
  meses: MesProjetado[];
  mesesPesado?: MesProjetado[];
  corLinha: string;
  // Chamado se a WebView der erro ou não desenhar a tempo.
  onFalha: () => void;
}) {
  const WebView = obterWebView();
  const [pronto, setPronto] = useState(false);

  const html = useMemo(() => {
    const opcoes = montarOpcoesApex({
      saldoAtual,
      meses,
      mesesPesado,
      rotuloPesado: `Com ${Math.round((FATOR_IMPREVISTOS - 1) * 100)}% a mais no dia a dia`,
      corLinha,
      corAlta: colors.primary,
      tema: { texto: colors.text, textoSuave: colors.textMuted, linhaGrade: 'rgba(141, 110, 99, 0.2)' },
      altura: ALTURA,
    });
    return montarHtmlDoGrafico(opcoes, APEXCHARTS_JS);
  }, [saldoAtual, meses, mesesPesado, corLinha]);

  useEffect(() => {
    if (pronto) return;
    const espera = setTimeout(onFalha, LIMITE_DE_ESPERA_MS);
    return () => clearTimeout(espera);
  }, [pronto, onFalha]);

  if (!WebView) return null;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        // O gráfico é só pra ver e tocar (tooltip): a página não rola nem dá
        // zoom, e a rolagem da TELA continua funcionando por cima.
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        androidLayerType="hardware"
        // Fundo transparente: o cartão/tela por trás aparece.
        opaque={false}
        style={styles.webview}
        onMessage={(evento: { nativeEvent: { data: string } }) => {
          if (evento.nativeEvent.data === 'pronto') setPronto(true);
        }}
        onError={onFalha}
        onHttpError={onFalha}
      />
      {!pronto && (
        <View style={styles.carregando} pointerEvents="none">
          <ActivityIndicator color={colors.primaryDark} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: ALTURA,
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  carregando: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
