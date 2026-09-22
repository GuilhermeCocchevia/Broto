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
  // Cor dos trechos em QUEDA — a "saúde" do pior saldo (ver corDoSaldo).
  corLinha: string;
  // Cor dos trechos em ALTA (o saldo passa a subir): verde.
  corAlta: string;
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

// Pra cada segmento entre dois pontos consecutivos: o saldo SOBE (true) ou cai
// (false)? Segmento sem variação (saldo igual) herda a direção do anterior —
// ou, no começo da série, a do primeiro segmento que varia; série toda parada
// conta como queda. Assim uma linha reta e horizontal não "pisca" de cor.
export function direcaoDosSegmentos(valores: number[]): boolean[] {
  const direcoes: (boolean | null)[] = [];
  for (let i = 0; i < valores.length - 1; i++) {
    const variacao = valores[i + 1] - valores[i];
    direcoes.push(variacao === 0 ? null : variacao > 0);
  }
  for (let i = 1; i < direcoes.length; i++) if (direcoes[i] === null) direcoes[i] = direcoes[i - 1];
  for (let i = direcoes.length - 2; i >= 0; i--) if (direcoes[i] === null) direcoes[i] = direcoes[i + 1];
  return direcoes.map((subindo) => subindo === true);
}

export type ParadaDeCor = { offset: number; color: string; opacity: number };

// As paradas do gradiente HORIZONTAL do traço: a linha muda de cor exatamente
// no ponto onde a direção muda (cor de queda até ali, verde depois, e assim por
// diante, qualquer número de viradas). Cada ponto i fica na posição i/(n-1) da
// largura da linha; a troca de cor é uma borda dura (duas paradas no mesmo
// offset). O ApexCharts não colore uma linha por trecho de outro jeito — duas
// séries (queda/alta) se sobrepunham quando uma alta durava um segmento só.
export function montarParadasDeCor(direcoes: boolean[], corQueda: string, corAlta: string): ParadaDeCor[] {
  const corDoSegmento = (subindo: boolean) => (subindo ? corAlta : corQueda);
  if (direcoes.length === 0) {
    return [
      { offset: 0, color: corQueda, opacity: 1 },
      { offset: 100, color: corQueda, opacity: 1 },
    ];
  }
  const paradas: ParadaDeCor[] = [{ offset: 0, color: corDoSegmento(direcoes[0]), opacity: 1 }];
  direcoes.forEach((subindo, i) => {
    if (i > 0 && subindo !== direcoes[i - 1]) {
      const offset = Math.round((i / direcoes.length) * 10000) / 100;
      paradas.push({ offset, color: corDoSegmento(direcoes[i - 1]), opacity: 1 });
      paradas.push({ offset, color: corDoSegmento(subindo), opacity: 1 });
    }
  });
  paradas.push({ offset: 100, color: corDoSegmento(direcoes[direcoes.length - 1]), opacity: 1 });
  return paradas;
}

export function montarOpcoesApex(entrada: EntradaDoGrafico): Record<string, unknown> {
  const { saldoAtual, meses, mesesPesado, corLinha, corAlta, tema, altura } = entrada;
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

  // A linha do saldo esperado muda de cor conforme a direção (cai → cor de saúde,
  // sobe → verde) por um gradiente horizontal no traço (ver montarParadasDeCor).
  // Por baixo dela, uma área neutra e translúcida (só o "chão" visual — colorir a
  // área por trecho brigaria com o gradiente do traço, que é compartilhado).
  const direcoes = direcaoDosSegmentos(esperado);
  const paradasDeCor = montarParadasDeCor(direcoes, corLinha, corAlta);
  // Cor do ponto (marcador e tooltip): a do segmento que CHEGA nele; o primeiro
  // ponto usa a do primeiro segmento.
  const coresDosPontos = esperado.map((_, i) => {
    const subindo = direcoes.length === 0 ? false : direcoes[Math.max(0, i - 1)];
    return subindo ? corAlta : corLinha;
  });

  const series: Record<string, unknown>[] = [
    { name: 'Saldo esperado', type: 'area', data: esperado },
    { name: 'Saldo esperado', type: 'line', data: esperado },
  ];
  if (pesado) {
    series.push({ name: entrada.rotuloPesado ?? 'Cenário mais pesado', type: 'line', data: pesado });
  }
  // A legenda (só quando há a linha tracejada) é um texto no HTML, abaixo do
  // gráfico — ocupa esta altura, que sai do gráfico.
  const alturaDaLegenda = pesado ? 24 : 0;

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
    // Dados pro tooltip personalizado do HTML e pra legenda do cenário pesado.
    dadosDoTooltip: {
      categorias,
      esperado,
      cores: coresDosPontos,
      pesado: pesado ?? null,
      rotuloPesado: entrada.rotuloPesado ?? 'Cenário mais pesado',
    },
    series,
    chart: {
      type: 'line',
      height: altura - alturaDaLegenda,
      background: 'transparent',
      fontFamily: '-apple-system, system-ui, Roboto, sans-serif',
      foreColor: tema.textoSuave,
      parentHeightOffset: 0,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true, speed: 500, animateGradually: { enabled: false } },
    },
    // A cor da linha do saldo vem do gradiente (fill abaixo); a de `colors` só
    // vale de reserva. Séries: [área neutra, linha do saldo, (linha tracejada)].
    colors: [tema.textoSuave, corAlta, tema.textoSuave],
    // monotoneCubic (não 'smooth'): a curva suave comum "passa do ponto" e
    // faz ondulações num crescimento reto; esta nunca sai do intervalo dos dados.
    stroke: { curve: 'monotoneCubic', width: [0, 3, 2], dashArray: [0, 0, 6] },
    fill: {
      type: ['solid', 'gradient', 'solid'],
      opacity: [0.1, 1, 1],
      gradient: { type: 'horizontal', colorStops: paradasDeCor },
    },
    markers: {
      size: [0, 4, 0],
      strokeColors: '#FFFFFF',
      strokeWidth: 2,
      hover: { size: 6 },
      // Cada ponto na cor do trecho que chega nele.
      discrete: coresDosPontos.map((cor, i) => ({
        seriesIndex: 1,
        dataPointIndex: i,
        fillColor: cor,
        strokeColor: '#FFFFFF',
        size: 4,
      })),
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
    // A legenda do cenário pesado é um texto no HTML (ver htmlDoGrafico.ts).
    legend: { show: false },
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
