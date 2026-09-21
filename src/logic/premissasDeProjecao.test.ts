import { montarPremissas, textoDaConfianca } from './premissasDeProjecao';
import { estimarGastosFuturos } from './estimativaDeGastos';
import type { SaldoInicial, Transacao } from '../types/models';

function criarTransacao(sobrescrever: Partial<Transacao>): Transacao {
  return {
    id: 't',
    descricao: 'Transação',
    valor: 100,
    data: '2026-09-10',
    tipo: 'despesa',
    categoriaId: 'c',
    frequencia: 'unica',
    dataFim: null,
    ...sobrescrever,
  };
}

const SEM_SALDO: SaldoInicial[] = [];

test('montarPremissas: retrato do mês que vem (renda, fixos, dia a dia, sobra) com os dados reais', () => {
  const transacoes = [
    criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'mensal', valor: 3200, data: '2026-09-05', descricao: 'Salario Beca' }),
    criarTransacao({ id: 'r2', tipo: 'receita', frequencia: 'mensal', valor: 2560, data: '2026-09-05', descricao: 'Salario Gui' }),
    criarTransacao({ id: 'f1', frequencia: 'mensal', valor: 2593.4, data: '2026-01-10', descricao: 'Fixos' }),
    criarTransacao({ id: 'v1', valor: 2790, data: '2026-09-10', descricao: 'Cartoes' }),
  ];

  const p = montarPremissas(transacoes, SEM_SALDO, '2026-09');

  expect(p.mesTipico).toBe('2026-10');
  expect(p.rendaEsperada).toBe(5760);
  expect(p.despesasFixas).toBeCloseTo(2593.4, 2);
  expect(p.gastoDoDiaADia).toBe(2790);
  // Bate com a sobra do Dashboard (5760 - 5383,40 = 376,60).
  expect(p.sobraTipica).toBeCloseTo(376.6, 2);
});

test('montarPremissas: gasto do dia a dia soma o variável E as recorrentes na prática', () => {
  const transacoes = [
    criarTransacao({ id: 'a', valor: 140, data: '2026-08-10', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'b', valor: 160, data: '2026-09-10', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'c', valor: 500, data: '2026-09-03', descricao: 'Mercado' }),
  ];

  const p = montarPremissas(transacoes, SEM_SALDO, '2026-09');

  expect(p.gastoDoDiaADia).toBe(650);
});

test('montarPremissas: a estimativa devolvida é a mesma que o motor usa', () => {
  const transacoes = [criarTransacao({ id: 'v', valor: 900, data: '2026-09-03', descricao: 'Mercado' })];
  expect(montarPremissas(transacoes, SEM_SALDO, '2026-09').estimativa).toEqual(
    estimarGastosFuturos(transacoes, '2026-09'),
  );
});

test('textoDaConfianca: cada nível tem uma frase calma e honesta', () => {
  const base = estimarGastosFuturos([], '2026-09');
  expect(textoDaConfianca(base)).toMatch(/pode estar otimista/);
  expect(textoDaConfianca({ ...base, confianca: 'baixa', mesesComDado: 1 })).toMatch(/1 mês de lançamentos/);
  expect(textoDaConfianca({ ...base, confianca: 'media', mesesComDado: 2 })).toBe('Baseado em 2 meses de lançamentos.');
  expect(textoDaConfianca({ ...base, confianca: 'boa', mesesComDado: 4 })).toBe('Baseado em 4 meses de lançamentos.');
});
