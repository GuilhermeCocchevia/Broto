import { calcularSaldoProjetado, calcularRendaFixaMedia } from './projecao';
import type { Transacao, Simulacao } from '../types/models';

// Helpers só pra não repetir todo campo em toda transação/simulação de teste —
// cada teste passa só o que importa pra ele, o resto vem de um padrão razoável.
function criarTransacao(sobrescrever: Partial<Transacao>): Transacao {
  return {
    id: 'transacao-teste',
    descricao: 'Transação de teste',
    valor: 100,
    data: '2026-01-10',
    tipo: 'despesa',
    categoriaId: 'categoria-teste',
    frequencia: 'unica',
    dataFim: null,
    ...sobrescrever,
  };
}

function criarSimulacao(sobrescrever: Partial<Simulacao>): Simulacao {
  return {
    id: 'simulacao-teste',
    descricao: 'Simulação de teste',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-01-01',
    categoriaId: 'categoria-teste',
    criadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescrever,
  };
}

test('transação única só entra no mês em que aconteceu', () => {
  const transacao = criarTransacao({ frequencia: 'unica', valor: 50, data: '2026-02-15' });

  const resultado = calcularSaldoProjetado([transacao], [], '2026-01', 3);

  expect(resultado.map((m) => m.saidas)).toEqual([0, 50, 0]);
});

test('transação mensal sem dataFim se repete em todos os meses seguintes', () => {
  const salario = criarTransacao({
    frequencia: 'mensal',
    tipo: 'receita',
    valor: 3000,
    data: '2026-01-05',
    dataFim: null,
  });

  const resultado = calcularSaldoProjetado([salario], [], '2026-01', 4);

  expect(resultado.map((m) => m.entradas)).toEqual([3000, 3000, 3000, 3000]);
});

test('transação mensal para de contar depois do mês de dataFim', () => {
  const assinatura = criarTransacao({
    frequencia: 'mensal',
    valor: 40,
    data: '2026-01-01',
    dataFim: '2026-03-01',
  });

  const resultado = calcularSaldoProjetado([assinatura], [], '2026-01', 5);

  // Conta em jan, fev, mar (mês de dataFim ainda conta) e para em abr, mai.
  expect(resultado.map((m) => m.saidas)).toEqual([40, 40, 40, 0, 0]);
});

test('simulação parcelada só aparece durante o número de parcelas, a partir do início', () => {
  const compra = criarSimulacao({ valorTotal: 300, parcelas: 3, dataInicio: '2026-02-01' });

  const resultado = calcularSaldoProjetado([], [compra], '2026-01', 5);

  // jan (antes de começar) = 0, fev/mar/abr = 100 cada (3 parcelas), mai = 0.
  expect(resultado.map((m) => m.saidas)).toEqual([0, 100, 100, 100, 0]);
});

test('saldo acumulado combina saldo inicial, transações e simulações mês a mês', () => {
  const salario = criarTransacao({
    frequencia: 'mensal',
    tipo: 'receita',
    valor: 1000,
    data: '2026-01-01',
    dataFim: null,
  });
  const compra = criarSimulacao({ valorTotal: 200, parcelas: 2, dataInicio: '2026-01-01' });

  const resultado = calcularSaldoProjetado([salario], [compra], '2026-01', 3, 500);

  // Mês 1: 500 + 1000 - 100 = 1400. Mês 2: 1400 + 1000 - 100 = 2300.
  // Mês 3: parcelas acabaram, só entra o salário: 2300 + 1000 = 3300.
  expect(resultado.map((m) => m.saldo)).toEqual([1400, 2300, 3300]);
});

test('calcularRendaFixaMedia tira a média só das 3 receitas avulsas mais recentes', () => {
  const salarios = [
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-06-05' }),
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 3200, data: '2026-07-05' }),
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 2800, data: '2026-08-05' }),
    // Mais antigo que os 3 já contados — não deveria entrar na média.
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 100000, data: '2026-01-05' }),
  ];

  expect(calcularRendaFixaMedia(salarios)).toBe((3000 + 3200 + 2800) / 3);
});

test('calcularRendaFixaMedia ignora despesas e receitas recorrentes (já contadas à parte)', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-08-05' }),
    criarTransacao({ tipo: 'despesa', frequencia: 'unica', valor: 500, data: '2026-08-10' }),
    criarTransacao({ tipo: 'receita', frequencia: 'mensal', valor: 600, data: '2026-01-01' }),
  ];

  expect(calcularRendaFixaMedia(transacoes)).toBe(3000);
});

test('calcularRendaFixaMedia devolve 0 sem nenhuma receita avulsa registrada', () => {
  expect(calcularRendaFixaMedia([])).toBe(0);
});

test('rendaFixaMensal em calcularSaldoProjetado soma como entrada em todos os meses', () => {
  const resultado = calcularSaldoProjetado([], [], '2026-01', 3, 0, 3000);

  expect(resultado.map((m) => m.entradas)).toEqual([3000, 3000, 3000]);
  expect(resultado.map((m) => m.saldo)).toEqual([3000, 6000, 9000]);
});

test('rendaFixaMensal não soma em cima de um mês que já tem receita real registrada', () => {
  // Bug encontrado testando no simulador de verdade: o salário que gerou a
  // média (setembro) não pode contar 2x no próprio mês em que foi lançado.
  const salarioDeSetembro = criarTransacao({
    tipo: 'receita',
    frequencia: 'unica',
    valor: 3000,
    data: '2026-09-13',
  });

  const resultado = calcularSaldoProjetado([salarioDeSetembro], [], '2026-09', 3, 0, 3000);

  // Setembro já tinha o salário real (3000) — a renda fixa não soma de novo.
  // Outubro e novembro não têm nenhuma receita registrada, então usam a média.
  expect(resultado.map((m) => m.entradas)).toEqual([3000, 3000, 3000]);
});
