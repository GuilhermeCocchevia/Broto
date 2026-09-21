import { montarOpcoesApex, type EntradaDoGrafico } from './opcoesApex';
import type { MesProjetado } from '../logic/projecao';

const TEMA = { texto: '#3E2723', textoSuave: '#8D6E63', linhaGrade: 'rgba(141,110,99,0.18)' };

function mes(mesAAAAMM: string, saldo: number): MesProjetado {
  return { mes: mesAAAAMM, entradas: 0, saidas: 0, saldo };
}

function entrada(sobrescrever: Partial<EntradaDoGrafico> = {}): EntradaDoGrafico {
  return {
    saldoAtual: 1000,
    meses: [mes('2026-10', 800), mes('2026-11', 300), mes('2026-12', 500)],
    corLinha: '#4CAF50',
    tema: TEMA,
    altura: 300,
    ...sobrescrever,
  };
}

// As opções são um objeto JSON solto (vai serializado pra dentro da WebView);
// estes helpers só evitam `any` espalhado nos testes.
type Opcoes = {
  series: { name: string; type: string; data: number[] }[];
  xaxis: { categories: string[] };
  passoDosRotulos: number;
  annotations: {
    yaxis: { y: number; y2?: number }[];
    points: { x: string; y: number; label: { text: string; offsetX: number } }[];
  };
  legend: { show: boolean };
  chart: { height: number };
};
const opcoes = (e: EntradaDoGrafico) => montarOpcoesApex(e) as unknown as Opcoes;

test('série esperada: "Hoje" + um ponto por mês projetado, com o saldo real (sem achatar)', () => {
  const o = opcoes(entrada());
  expect(o.series[0].name).toBe('Saldo esperado');
  expect(o.series[0].data).toEqual([1000, 800, 300, 500]);
  expect(o.xaxis.categories).toEqual(['Hoje', 'Out', 'Nov', 'Dez']);
  expect(o.chart.height).toBe(300);
});

test('sem cenário pesado: uma série só e legenda escondida', () => {
  const o = opcoes(entrada());
  expect(o.series).toHaveLength(1);
  expect(o.legend.show).toBe(false);
});

test('com cenário pesado: segunda série (linha) e legenda visível', () => {
  const o = opcoes(
    entrada({ mesesPesado: [mes('2026-10', 600), mes('2026-11', -100), mes('2026-12', -400)], rotuloPesado: 'Com 20% a mais' }),
  );
  expect(o.series).toHaveLength(2);
  expect(o.series[1]).toMatchObject({ name: 'Com 20% a mais', type: 'line', data: [1000, 600, -100, -400] });
  expect(o.legend.show).toBe(true);
});

test('anotação do menor saldo aponta pro mês certo, com o valor formatado em reais', () => {
  const o = opcoes(entrada());
  const ponto = o.annotations.points[0];
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
  expect(o.series[0].data).toEqual([1000, 123.4, 0]);
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
