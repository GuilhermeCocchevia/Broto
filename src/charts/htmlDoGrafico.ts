// Monta a página HTML que a WebView carrega: o ApexCharts (embutido, ver
// scripts/gerar-apexcharts-embutido.js — sem CDN, o app funciona offline) +
// as opções do gráfico + os formatadores de moeda em pt-BR, que são funções e
// por isso não cabem no JSON das opções (ver opcoesApex.ts).
//
// Quando o gráfico termina de desenhar, avisa o app (`postMessage('pronto')`)
// — é o que deixa o app desistir da WebView e cair no gráfico nativo se algo
// dar errado (ver GraficoApex.tsx).

// Escapa o que poderia fechar o <script> antes da hora ou quebrar a string:
// "<" vira "\u003c" (continua valendo como "<" pro JavaScript da página).
function paraJsonSeguro(valor: unknown): string {
  return JSON.stringify(valor).replace(/</g, '\\u003c');
}

export function montarHtmlDoGrafico(opcoes: Record<string, unknown>, apexJs: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin: 0; padding: 0; background: transparent; overflow: hidden;
    -webkit-user-select: none; user-select: none; -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent; }
  #grafico { width: 100%; }
</style>
</head>
<body>
<div id="grafico"></div>
<script>${apexJs}</script>
<script>
(function () {
  var opcoes = ${paraJsonSeguro(opcoes)};
  var moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var compacta = new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1
  });
  opcoes.yaxis.labels.formatter = function (v) { return compacta.format(v); };
  // Em série longa mostra só um rótulo a cada "passo".
  var passo = opcoes.passoDosRotulos || 1;
  opcoes.xaxis.labels.formatter = function (valor, timestamp, extra) {
    var i = extra && typeof extra.i === 'number' ? extra.i : 0;
    return i % passo === 0 ? valor : '';
  };
  delete opcoes.passoDosRotulos;
  opcoes.tooltip.y = { formatter: function (v) { return moeda.format(v); } };
  // Só avisa o app DEPOIS do primeiro desenho.
  opcoes.chart.events = {
    mounted: function () {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('pronto');
    }
  };
  new ApexCharts(document.getElementById('grafico'), opcoes).render();
})();
</script>
</body>
</html>`;
}
