import {
  calcularGastoPorCategoria,
  calcularTaxaDePoupanca,
  calcularComprometimentoDeRendaFixa,
} from './saudeFinanceira';
import type { Transacao } from '../types/models';

function criarTransacao(sobrescrever: Partial<Transacao>): Transacao {
  return {
    id: 'transacao-teste',
    descricao: 'Transação de teste',
    valor: 100,
    data: '2026-09-10',
    tipo: 'despesa',
    categoriaId: 'categoria-teste',
    frequencia: 'unica',
    dataFim: null,
    ...sobrescrever,
  };
}

test('calcularGastoPorCategoria soma por categoria e ordena da maior pra menor', () => {
  const transacoes = [
    criarTransacao({ categoriaId: 'mercado', valor: 300, data: '2026-09-05' }),
    criarTransacao({ categoriaId: 'transporte', valor: 800, data: '2026-09-10' }),
    criarTransacao({ categoriaId: 'mercado', valor: 150, data: '2026-09-20' }),
  ];

  const resultado = calcularGastoPorCategoria(transacoes, '2026-09');

  expect(resultado).toEqual([
    { categoriaId: 'transporte', total: 800 },
    { categoriaId: 'mercado', total: 450 },
  ]);
});

test('calcularGastoPorCategoria ignora receitas e transações de outro mês', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', categoriaId: 'salario', valor: 3000, data: '2026-09-05' }),
    criarTransacao({ categoriaId: 'mercado', valor: 300, data: '2026-08-05' }),
  ];

  expect(calcularGastoPorCategoria(transacoes, '2026-09')).toEqual([]);
});

test('calcularGastoPorCategoria conta uma despesa mensal recorrente que se aplica ao mês', () => {
  const aluguel = criarTransacao({
    categoriaId: 'moradia',
    valor: 1200,
    frequencia: 'mensal',
    data: '2026-01-05',
    dataFim: null,
  });

  expect(calcularGastoPorCategoria([aluguel], '2026-09')).toEqual([
    { categoriaId: 'moradia', total: 1200 },
  ]);
});

test('calcularTaxaDePoupanca calcula a proporção do que sobrou', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-09-01' }),
    criarTransacao({ tipo: 'despesa', valor: 800, data: '2026-09-10' }),
  ];

  expect(calcularTaxaDePoupanca(transacoes, '2026-09')).toBeCloseTo(0.2);
});

test('calcularTaxaDePoupanca fica negativa quando os gastos passam da renda', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-09-01' }),
    criarTransacao({ tipo: 'despesa', valor: 1500, data: '2026-09-10' }),
  ];

  expect(calcularTaxaDePoupanca(transacoes, '2026-09')).toBeCloseTo(-0.5);
});

test('calcularTaxaDePoupanca devolve 0 sem nenhuma entrada no mês (evita divisão por zero)', () => {
  const transacoes = [criarTransacao({ tipo: 'despesa', valor: 200, data: '2026-09-10' })];

  expect(calcularTaxaDePoupanca(transacoes, '2026-09')).toBe(0);
});

test('calcularComprometimentoDeRendaFixa só conta despesas mensais, não únicas', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', valor: 2000, data: '2026-09-01' }),
    criarTransacao({
      tipo: 'despesa',
      frequencia: 'mensal',
      valor: 800,
      data: '2026-01-05',
      dataFim: null,
    }),
    criarTransacao({ tipo: 'despesa', frequencia: 'unica', valor: 500, data: '2026-09-15' }),
  ];

  // Só o aluguel (mensal) conta — a compra avulsa de 500 fica de fora.
  expect(calcularComprometimentoDeRendaFixa(transacoes, '2026-09')).toBeCloseTo(800 / 2000);
});

test('calcularComprometimentoDeRendaFixa devolve 0 sem nenhuma entrada no mês', () => {
  const transacoes = [
    criarTransacao({ tipo: 'despesa', frequencia: 'mensal', valor: 800, data: '2026-01-05' }),
  ];

  expect(calcularComprometimentoDeRendaFixa(transacoes, '2026-09')).toBe(0);
});
