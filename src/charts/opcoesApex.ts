// Monta as OPÇÕES do ApexCharts pro gráfico de saldo das simulações. É lógica
// pura (só devolve um objeto JSON, sem tocar em React nem em WebView) pra ser
// testável — o objeto é serializado e executado dentro de uma WebView (ver
// htmlDoGrafico.ts e GraficoApex.tsx), porque o ApexCharts é uma biblioteca de
// navegador (DOM/SVG) e não roda direto no React Native.
//
// Funções (formatadores de moeda) NÃO cabem em JSON, então ficam no HTML,
// aplicadas sobre estas opções — aqui só o que é dado.
import type { MesProjetado } from '../logic/projecao';
import { abreviarMes } from '../utils/abreviarMes';
import { formatarReal } from '../utils/formatarReal';

export type TemaDoGrafico = {
  texto: string;
  textoSuave: string;
  linhaGrade: string;
};

export type EntradaDoGrafico = {
  saldoAtual: number;
  meses: MesProjetado[];
  // Cenário mais pesado (linha tracejada). Ausente = só o esperado.
  mesesPesado?: MesProjetado[];
  rotuloPesado?: string;
  // Cor da linha/área principal — a "saúde" do pior saldo (ver corDoSaldo).
  corLinha: string;
  tema: TemaDoGrafico;
  altura: number;
};

// Em centavos, e sem "-0" (que o JSON e os testes tratam como valor diferente de 0).
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100 + 0;
}

// 'Hoje' + um rótulo por mês. Numa série longa o mesmo nome de mês se repete
// (set/26 e set/27) — aí o ano entra só nos repetidos, pra cada rótulo do eixo
// (e a anotação que aponta pra ele) ser único.
function montarCategorias(meses: MesProjetado[]): string[] {
  const nomes = meses.map((m) => abreviarMes(m.mes));
  const contagem = new Map<string, number>();
  nomes.forEach((nome) => contagem.set(nome, (contagem.get(nome) ?? 0) + 1));
  const rotulos = meses.map((m, i) => {
    if ((contagem.get(nomes[i]) ?? 0) <= 1) return nomes[i];
    return `${nomes[i]}/${m.mes.slice(2, 4)}`;
  });
  return ['Hoje', ...rotulos];
}

export function montarOpcoesApex(entrada: EntradaDoGrafico): Record<string, unknown> {
  const { saldoAtual, meses, mesesPesado, corLinha, tema, altura } = entrada;
  const categorias = montarCategorias(meses);
  const esperado = [saldoAtual, ...meses.map((m) => m.saldo)].map(arredondar);
  const pesado = mesesPesado ? [saldoAtual, ...mesesPesado.map((m) => m.saldo)].map(arredondar) : undefined;

  // Menor saldo do cenário esperado — o ponto que a anotação destaca.
  let indiceDoMenor = 0;
  esperado.forEach((valor, i) => {
    if (valor < esperado[indiceDoMenor]) indiceDoMenor = i;
  });

  const todosOsValores = [...esperado, ...(pesado ?? [])];
  const menorValor = Math.min(...todosOsValores);
  const temNegativo = menorValor < 0;

  const series: Record<string, unknown>[] = [{ name: 'Saldo esperado', type: 'area', data: esperado }];
  if (pesado) {
    series.push({ name: entrada.rotuloPesado ?? 'Cenário mais pesado', type: 'line', data: pesado });
  }

  const estiloDoTexto = { colors: tema.textoSuave, fontSize: '10px' };

  // Numa série longa (24 meses) não cabe um rótulo por mês: mostra um a cada
  // `passo`. O HTML aplica isso num formatador (funções não vão em JSON).
  // Rótulos com ano ('Out/26') são mais largos: cabem menos.
  const maximoDeRotulos = categorias.some((c) => c.includes('/')) ? 6 : 13;
  const passoDosRotulos = Math.max(1, Math.ceil(categorias.length / maximoDeRotulos));

  // O menor saldo só vira anotação quando é um mês PROJETADO — se o menor é o
  // próprio "Hoje" (série que só cresce), destacar seria ruído. Perto das
  // pontas o texto é empurrado pra dentro pra não ser cortado.
  const posicaoRelativa = categorias.length > 1 ? indiceDoMenor / (categorias.length - 1) : 0;
  const deslocamentoX = posicaoRelativa > 0.75 ? -64 : posicaoRelativa < 0.25 ? 64 : 0;
  const pontosAnotados =
    indiceDoMenor > 0
      ? [
          {
            x: categorias[indiceDoMenor],
            y: esperado[indiceDoMenor],
            marker: { size: 6, fillColor: '#FFFFFF', strokeColor: corLinha, strokeWidth: 3 },
            label: {
              text: `Menor saldo: ${formatarReal(esperado[indiceDoMenor])}`,
              borderColor: corLinha,
              offsetX: deslocamentoX,
              offsetY: temNegativo ? 28 : -8,
              style: { color: '#FFFFFF', background: corLinha, fontSize: '11px' },
            },
          },
        ]
      : [];

  return {
    passoDosRotulos,
    series,
    chart: {
      type: 'line',
      height: altura,
      background: 'transparent',
      fontFamily: '-apple-system, system-ui, Roboto, sans-serif',
      foreColor: tema.textoSuave,
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 500, animateGradually: { enabled: false } },
    },
    colors: [corLinha, tema.textoSuave],
    // monotoneCubic (não 'smooth'): a curva suave comum "passa do ponto" e
    // faz ondulações num crescimento reto; esta nunca sai do intervalo dos dados.
    stroke: { curve: 'monotoneCubic', width: [3, 2], dashArray: [0, 6] },
    fill: {
      type: ['gradient', 'solid'],
      gradient: { shade: 'light', shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] },
    },
    markers: {
      size: [4, 0],
      strokeColors: '#FFFFFF',
      strokeWidth: 2,
      hover: { size: 6 },
    },
    dataLabels: { enabled: false },
    grid: {
      borderColor: tema.linhaGrade,
      strokeDashArray: 4,
      padding: { left: 8, right: 16 },
    },
    xaxis: {
      categories: categorias,
      labels: { rotate: 0, hideOverlappingLabels: true, style: estiloDoTexto },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tooltip: { enabled: false },
    },
    yaxis: {
      forceNiceScale: true,
      labels: { style: estiloDoTexto },
    },
    legend: {
      show: Boolean(pesado),
      position: 'bottom',
      horizontalAlign: 'left',
      fontSize: '12px',
      labels: { colors: tema.textoSuave },
      markers: { size: 5, shape: 'circle' },
    },
    tooltip: { shared: true, intersect: false, theme: 'light' },
    annotations: {
      yaxis: [
        // A linha do zero: acima dela o dinheiro sobra, abaixo falta (sem texto:
        // o "R$ 0" do eixo já diz, e um rótulo aqui brigava com a anotação do menor saldo).
        {
          y: 0,
          borderColor: tema.textoSuave,
          strokeDashArray: 0,
          opacity: 0.55,
        },
        // Faixa suave abaixo do zero, só quando algum ponto chega lá — cor
        // neutra e translúcida de propósito (nada de vermelho: o app é calmo).
        ...(temNegativo
          ? [
              {
                y: arredondar(menorValor * 1.08),
                y2: 0,
                borderWidth: 0,
                fillColor: tema.textoSuave,
                opacity: 0.08,
              },
            ]
          : []),
      ],
      points: pontosAnotados,
    },
  };
}
