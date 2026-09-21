import { montarHtmlDoGrafico } from './htmlDoGrafico';

test('o HTML embute o ApexCharts, as opções e os formatadores de moeda em pt-BR', () => {
  const html = montarHtmlDoGrafico({ series: [], yaxis: { labels: {} }, xaxis: { categories: [], labels: {} }, tooltip: {}, chart: {} }, 'window.ApexCharts = function () {};');

  expect(html).toContain('window.ApexCharts = function () {};');
  expect(html).toContain("new Intl.NumberFormat('pt-BR'");
  expect(html).toContain('notation: \'compact\'');
  expect(html).toContain("postMessage('pronto')");
});

test('texto nas opções que pareça fechar o <script> não quebra a página', () => {
  const html = montarHtmlDoGrafico({ series: [{ name: '</script><b>x' }], yaxis: {}, tooltip: {}, chart: {} }, '');

  // Só existem os 2 fechamentos de <script> do próprio template.
  expect(html.match(/<\/script>/g)).toHaveLength(2);
  expect(html).toContain('\\u003c/script>');
});
