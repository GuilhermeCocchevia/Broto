import {
  direcaoDosSegmentos,
  montarOpcoesApex,
  montarParadasDeCor,
  type EntradaDoGrafico,
} from './opcoesApex';
import type { MesProjetado } from '../logic/projecao';

const TEMA = { texto: '#3E2723', textoSuave: '#8D6E63', linhaGrade: 'rgba(141,110,99,0.18)' };
const QUEDA = '#E53935';
const ALTA = '#4CAF50';

function mes(mesAAAAMM: string, saldo: number): MesProjetado {
  return { mes: mesAAAAMM, entradas: 0, saidas: 0, saldo };
}

function entrada(sobrescrever: Partial<EntradaDoGrafico> = {}): EntradaDoGrafico {
  return {
    saldoAtual: 1000,
    meses: [mes('2026-10', 800), mes('2026-11', 300), mes('2026-12', 500)],
    corLinha: QUEDA,
    corAlta: ALTA,
    tema: TEMA,
    altura: 300,
    ...sobrescrever,
  };
}

// As opções são um objeto JSON solto (vai serializado pra dentro da WebView);
// estes tipos só evitam `any` espalhado nos testes.
type Opcoes = {
  passoDosRotulos: number;
  series: { name: string; type: string; data: number[] }[];
  fill: { type: string[]; gradient: { type: string; colorStops: { offset: number; color: string }[] } };
  markers: { discrete: { dataPointIndex: number; fillColor: string }[] };
  dadosDoTooltip: { esperado: number[]; cores: string[]; pesado: number[] | null; rotuloPesado: string };
  xaxis: { categories: string[] };
  annotations: {
    yaxis: { y: number; y2?: number }[];
    points: { x: string; y: number; label: { text: string; offsetX: number } }[];
  };
  chart: { height: number };
};
const opcoes = (e: EntradaDoGrafico) => montarOpcoesApex(e) as unknown as Opcoes;

test('direcaoDosSegmentos: sobe (true) ou cai (false) em cada segmento', () => {
  expect(direcaoDosSegmentos([10, 5, 8, 3, 6])).toEqual([false, true, false, true]);
});

test('direcaoDosSegmentos: segmento parado herda o anterior; parado no começo herda o próximo; tudo parado = queda', () => {
  expect(direcaoDosSegmentos([1, 2, 2, 2, 1])).toEqual([true, true, true, false]);
  expect(direcaoDosSegmentos([5, 5, 5, 9])).toEqual([true, true, true]);
  expect(direcaoDosSegmentos([4, 4, 4])).toEqual([false, false]);
});

test('paradas de cor: cai até o vale e SOBE depois — cor de queda até o ponto de virada, verde a partir dele', () => {
  // 7 pontos, 6 segmentos: cai nos 3 primeiros, sobe nos 3 últimos → virada em 50%.
  const paradas = montarParadasDeCor([false, false, false, true, true, true], QUEDA, ALTA);
  expect(paradas).toEqual([
    { offset: 0, color: QUEDA, opacity: 1 },
    { offset: 50, color: QUEDA, opacity: 1 },
    { offset: 50, color: ALTA, opacity: 1 },
    { offset: 100, color: ALTA, opacity: 1 },
  ]);
});

test('paradas de cor: só queda ou só alta = uma cor só', () => {
  expect(montarParadasDeCor([false, false], QUEDA, ALTA).map((p) => p.color)).toEqual([QUEDA, QUEDA]);
  expect(montarParadasDeCor([true, true, true], QUEDA, ALTA).map((p) => p.color)).toEqual([ALTA, ALTA]);
});

test('paradas de cor: várias viradas (sobe, cai um mês, sobe) — cada troca é uma borda dura', () => {
  // 5 pontos, 4 segmentos: sobe, cai, sobe, sobe → trocas nos offsets 25 e 50.
  const paradas = montarParadasDeCor([true, false, true, true], QUEDA, ALTA);
  expect(paradas).toEqual([
    { offset: 0, color: ALTA, opacity: 1 },
    { offset: 25, color: ALTA, opacity: 1 },
    { offset: 25, color: QUEDA, opacity: 1 },
    { offset: 50, color: QUEDA, opacity: 1 },
    { offset: 50, color: ALTA, opacity: 1 },
    { offset: 100, color: ALTA, opacity: 1 },
  ]);
});

test('opções: área neutra + UMA linha do saldo com gradiente horizontal, e o menor saldo é onde a cor vira', () => {
  // 1000 -> 800 -> 300 (menor, no ponto 2 de 3 segmentos) -> 500.
  const o = opcoes(entrada());
  expect(o.series.map((s) => s.type)).toEqual(['area', 'line']);
  expect(o.series[1].data).toEqual([1000, 800, 300, 500]);
  expect(o.fill.type).toEqual(['solid', 'gradient', 'solid']);
  expect(o.fill.gradient.type).toBe('horizontal');
  const paradas = o.fill.gradient.colorStops;
  expect(paradas[0].color).toBe(QUEDA);
  expect(paradas[paradas.length - 1].color).toBe(ALTA);
  // Virada no ponto 2 de 3 segmentos: 2/3 da linha (66,67%).
  expect(paradas.filter((p) => p.offset > 0 && p.offset < 100).map((p) => p.offset)).toEqual([66.67, 66.67]);
  expect(o.xaxis.categories).toEqual(['Hoje', 'Out', 'Nov', 'Dez']);
  expect(o.chart.height).toBe(300);
});

test('marcadores e tooltip: cada ponto na cor do trecho que chega nele', () => {
  const o = opcoes(entrada());
  // Hoje/Out/Nov chegam por queda; Dez chega por alta.
  expect(o.dadosDoTooltip.cores).toEqual([QUEDA, QUEDA, QUEDA, ALTA]);
  expect(o.markers.discrete.map((m) => m.fillColor)).toEqual([QUEDA, QUEDA, QUEDA, ALTA]);
  expect(o.dadosDoTooltip.esperado).toEqual([1000, 800, 300, 500]);
});

test('sem cenário pesado: duas séries e altura cheia; sem legenda', () => {
  const o = opcoes(entrada());
  expect(o.series).toHaveLength(2);
  expect(o.dadosDoTooltip.pesado).toBeNull();
  expect(o.chart.height).toBe(300);
});

test('com cenário pesado: terceira série (linha tracejada) e o gráfico cede espaço pra legenda', () => {
  const o = opcoes(
    entrada({ mesesPesado: [mes('2026-10', 600), mes('2026-11', -100), mes('2026-12', -400)], rotuloPesado: 'Com 20% a mais' }),
  );
  expect(o.series).toHaveLength(3);
  expect(o.series[2]).toMatchObject({ name: 'Com 20% a mais', type: 'line', data: [1000, 600, -100, -400] });
  expect(o.dadosDoTooltip.pesado).toEqual([1000, 600, -100, -400]);
  expect(o.dadosDoTooltip.rotuloPesado).toBe('Com 20% a mais');
  expect(o.chart.height).toBeLessThan(300);
});

test('anotação do menor saldo aponta pro mês certo, com o valor formatado em reais', () => {
  const ponto = opcoes(entrada()).annotations.points[0];
  expect(ponto.x).toBe('Nov');
  expect(ponto.y).toBe(300);
  expect(ponto.label.text.replace(/\s/g, ' ')).toContain('R$ 300,00');
});

test('sem saldo negativo: só a linha do zero, sem faixa sombreada', () => {
  const o = opcoes(entrada());
  expect(o.annotations.yaxis).toHaveLength(1);
  expect(o.annotations.yaxis[0].y).toBe(0);
});

test('com saldo negativo (inclusive no cenário pesado): faixa sombreada do mínimo até o zero', () => {
  const o = opcoes(entrada({ mesesPesado: [mes('2026-10', 100), mes('2026-11', -900), mes('2026-12', -1200)] }));
  const faixa = o.annotations.yaxis.find((a) => a.y2 !== undefined)!;
  expect(faixa.y2).toBe(0);
  expect(faixa.y).toBeLessThan(-1200);
});

test('séries longas (mais de 12 meses) não repetem rótulos: o ano entra no nome do mês repetido', () => {
  const muitos = Array.from({ length: 14 }, (_, i) => {
    const total = 2026 * 12 + 8 + i; // a partir de set/2026
    const ano = Math.floor(total / 12);
    const numero = (total % 12) + 1;
    return mes(`${ano}-${String(numero).padStart(2, '0')}`, 100 - i);
  });
  const categorias = opcoes(entrada({ meses: muitos })).xaxis.categories;
  expect(new Set(categorias).size).toBe(categorias.length);
});

test('valores são arredondados em centavos (nada de 123.39999999)', () => {
  const o = opcoes(entrada({ meses: [mes('2026-10', 123.39999999), mes('2026-11', -0.001)] }));
  expect(o.dadosDoTooltip.esperado).toEqual([1000, 123.4, 0]);
});

test('se o menor saldo é o próprio "Hoje" (série que só cresce), não há anotação de menor saldo', () => {
  const o = opcoes(entrada({ saldoAtual: 100, meses: [mes('2026-10', 300), mes('2026-11', 500)] }));
  expect(o.annotations.points).toEqual([]);
});

test('o rótulo do menor saldo é empurrado pra dentro quando o ponto está na ponta direita', () => {
  const naPonta = opcoes(entrada({ saldoAtual: 0, meses: [mes('2026-10', -100), mes('2026-11', -200), mes('2026-12', -300)] }));
  expect(naPonta.annotations.points[0].label.offsetX).toBeLessThan(0);

  const noMeio = opcoes(entrada({ saldoAtual: 500, meses: [mes('2026-10', 300), mes('2026-11', 100), mes('2026-12', 400), mes('2027-01', 600), mes('2027-02', 700)] }));
  expect(noMeio.annotations.points[0].label.offsetX).toBe(0);
});

test('passo dos rótulos do eixo: 1 até 14 pontos, cresce em séries longas', () => {
  expect(opcoes(entrada()).passoDosRotulos).toBe(1);
  const longos = Array.from({ length: 24 }, (_, i) => mes(`${2026 + Math.floor((9 + i) / 12)}-${String(((9 + i) % 12) + 1).padStart(2, '0')}`, i));
  expect(opcoes(entrada({ meses: longos })).passoDosRotulos).toBeGreaterThan(1);
});
