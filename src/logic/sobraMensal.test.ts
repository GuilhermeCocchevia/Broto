import {
  calcularParcelasAtivasNoMes,
  calcularSobraMensal,
  sugerirInvestimentoInicial,
} from './sobraMensal';
import type { Simulacao } from '../types/models';

function criarSimulacao(sobrescrever: Partial<Simulacao>): Simulacao {
  return {
    id: 'simulacao-teste',
    descricao: 'Simulação de teste',
    tipo: 'compra',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-01-01',
    categoriaId: 'categoria-teste',
    taxaJurosMensal: 0,
    aporteInicial: 0,
    criadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescrever,
  };
}

test('calcularParcelasAtivasNoMes devolve 0 sem nenhuma simulação ativa nesse mês', () => {
  const simulacoes = [criarSimulacao({ dataInicio: '2026-01-01', parcelas: 3 })];
  // Janeiro a março só — abril já não tem mais parcela.
  expect(calcularParcelasAtivasNoMes(simulacoes, '2026-04')).toBe(0);
});

test('calcularParcelasAtivasNoMes soma a parcela de cada simulação ativa no mês', () => {
  const simulacoes = [
    criarSimulacao({ id: '1', valorTotal: 300, parcelas: 3, dataInicio: '2026-01-01' }),
    criarSimulacao({ id: '2', tipo: 'economia', valorTotal: 1200, parcelas: 12, dataInicio: '2026-02-01' }),
  ];

  // Fevereiro: as duas estão ativas — 100 (300/3) + 100 (1200/12).
  expect(calcularParcelasAtivasNoMes(simulacoes, '2026-02')).toBe(200);
});

test('calcularParcelasAtivasNoMes soma o aporteInicial só no primeiro mês da simulação', () => {
  const simulacoes = [
    criarSimulacao({ tipo: 'rendimento', valorTotal: 1200, parcelas: 12, dataInicio: '2026-02-01', aporteInicial: 500 }),
  ];

  expect(calcularParcelasAtivasNoMes(simulacoes, '2026-02')).toBe(100 + 500);
  expect(calcularParcelasAtivasNoMes(simulacoes, '2026-03')).toBe(100);
});

test('calcularSobraMensal desconta despesas do mês e parcelas ativas da renda esperada', () => {
  const simulacoes = [criarSimulacao({ valorTotal: 300, parcelas: 3, dataInicio: '2026-01-01' })];

  const sobra = calcularSobraMensal(5000, 3000, simulacoes, '2026-02');

  expect(sobra).toBe(5000 - 3000 - 100);
});

test('calcularSobraMensal pode dar negativo (não sobra nada)', () => {
  const sobra = calcularSobraMensal(2000, 2500, [], '2026-02');
  expect(sobra).toBe(-500);
});

test('calcularSobraMensal devolve 0 sem despesa nenhuma pra comparar, em vez de inflar a sobra', () => {
  const sobra = calcularSobraMensal(5000, 0, [], '2026-02');
  expect(sobra).toBe(0);
});

test('sugerirInvestimentoInicial: só o que passa de um mês de despesas do saldo', () => {
  expect(sugerirInvestimentoInicial(8000, 5000)).toBe(3000);
});

test('sugerirInvestimentoInicial: saldo menor ou igual a um mês de despesas sugere 0', () => {
  expect(sugerirInvestimentoInicial(0, 5383.4)).toBe(0);
  expect(sugerirInvestimentoInicial(5000, 5000)).toBe(0);
  expect(sugerirInvestimentoInicial(-200, 1000)).toBe(0);
});

test('sugerirInvestimentoInicial: sem despesa registrada não há colchão pra medir, sugere 0', () => {
  expect(sugerirInvestimentoInicial(10000, 0)).toBe(0);
});

test('sugerirInvestimentoInicial: arredonda pra baixo em centavos', () => {
  expect(sugerirInvestimentoInicial(1000.999, 500)).toBe(500.99);
});
