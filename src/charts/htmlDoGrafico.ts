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
  #legenda { height: 24px; display: flex; align-items: center; gap: 8px; padding-left: 8px;
    font: 12px -apple-system, system-ui, Roboto, sans-serif; color: #8D6E63; }
  #legenda .tracejado { width: 22px; border-top: 2px dashed #8D6E63; }
</style>
</head>
<body>
<div id="grafico"></div>
<div id="legenda" style="display:none"></div>
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
  // Tooltip próprio (uma linha por ponto): as séries de queda e de alta
  // dividem o ponto de virada, e o tooltip padrão mostraria esse ponto duas vezes.
  var dt = opcoes.dadosDoTooltip;
  delete opcoes.dadosDoTooltip;
  opcoes.tooltip.custom = function (ctx) {
    var i = ctx.dataPointIndex;
    var linha = function (cor, rotulo, valor) {
      return '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + cor + '"></span>' +
        '<span>' + rotulo + ': <b>' + moeda.format(valor) + '</b></span></div>';
    };
    var html = '<div style="padding:6px 10px;font-size:12px;color:#3E2723">' +
      '<div style="font-weight:700">' + dt.categorias[i] + '</div>' +
      linha(dt.cores[i], 'Saldo esperado', dt.esperado[i]);
    if (dt.pesado) html += linha('#8D6E63', dt.rotuloPesado, dt.pesado[i]);
    return html + '</div>';
  };
  // Só avisa o app DEPOIS do primeiro desenho.
  opcoes.chart.events = {
    mounted: function () {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('pronto');
    }
  };
  if (dt.pesado) {
    var legenda = document.getElementById('legenda');
    legenda.style.display = 'flex';
    legenda.innerHTML = '<span class="tracejado"></span><span></span>';
    legenda.lastChild.textContent = dt.rotuloPesado;
  }
  new ApexCharts(document.getElementById('grafico'), opcoes).render();
})();
</script>
</body>
</html>`;
}
