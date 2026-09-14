import {
  calcularSaldoProjetado,
  calcularRendaFixaMedia,
  obterSaldoAtual,
  calcularValorDaParcela,
  calcularJurosTotal,
} from './projecao';
import type { Transacao, Simulacao, SaldoInicial } from '../types/models';

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
    taxaJurosMensal: 0,
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

test('calcularValorDaParcela sem juros é a divisão simples de sempre', () => {
  expect(calcularValorDaParcela(300, 3, 0)).toBe(100);
});

test('calcularValorDaParcela com 1 parcela é só o valor mais 1 mês de juros', () => {
  // Financiar por 1 mês só: a parcela cobre o principal + os juros desse
  // único mês — é o caso mais simples de conferir de cabeça.
  expect(calcularValorDaParcela(1000, 1, 0.1)).toBeCloseTo(1100);
});

test('calcularValorDaParcela: soma dos valores presentes das parcelas bate com o valor financiado', () => {
  // Checagem independente da fórmula usada na implementação: por definição
  // de amortização por parcelas fixas, trazer cada parcela a valor presente
  // (descontando os juros mês a mês) e somar tem que devolver exatamente o
  // valor financiado — é a definição econômica de "financiamento justo",
  // não só reescrever a mesma fórmula da função e comparar com ela mesma.
  const valorTotal = 1000;
  const parcelas = 6;
  const taxaJurosMensal = 0.03;
  const parcela = calcularValorDaParcela(valorTotal, parcelas, taxaJurosMensal);

  let somaValorPresente = 0;
  for (let mes = 1; mes <= parcelas; mes++) {
    somaValorPresente += parcela / Math.pow(1 + taxaJurosMensal, mes);
  }

  expect(somaValorPresente).toBeCloseTo(valorTotal, 6);
});

test('calcularJurosTotal é 0 sem taxa de juros', () => {
  expect(calcularJurosTotal(1000, 10, 0)).toBe(0);
});

test('calcularJurosTotal é positivo e cresce com a taxa de juros', () => {
  const jurosBaixo = calcularJurosTotal(1000, 10, 0.01);
  const jurosAlto = calcularJurosTotal(1000, 10, 0.05);

  expect(jurosBaixo).toBeGreaterThan(0);
  expect(jurosAlto).toBeGreaterThan(jurosBaixo);
});

test('simulação com juros aumenta as saídas projetadas em relação a sem juros', () => {
  const semJuros = criarSimulacao({ valorTotal: 1200, parcelas: 12, taxaJurosMensal: 0, dataInicio: '2026-01-01' });
  const comJuros = criarSimulacao({ valorTotal: 1200, parcelas: 12, taxaJurosMensal: 0.03, dataInicio: '2026-01-01' });

  const resultadoSemJuros = calcularSaldoProjetado([], [semJuros], '2026-01', 1);
  const resultadoComJuros = calcularSaldoProjetado([], [comJuros], '2026-01', 1);

  expect(resultadoComJuros[0].saidas).toBeGreaterThan(resultadoSemJuros[0].saidas);
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

test('calcularRendaFixaMedia não deixa uma receita pontual de outra categoria distorcer a média', () => {
  // Bug real encontrado testando com dados realistas: um freelance avulso
  // mais recente que os salários empurrava um salário de verdade pra fora
  // da média, mesmo sendo de uma categoria completamente diferente.
  const transacoes = [
    criarTransacao({ tipo: 'receita', categoriaId: 'salario', valor: 3500, data: '2026-07-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'salario', valor: 3500, data: '2026-08-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'salario', valor: 3600, data: '2026-09-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'freelance', valor: 500, data: '2026-09-10' }),
  ];

  expect(calcularRendaFixaMedia(transacoes)).toBe((3500 + 3500 + 3600) / 3);
});

test('calcularRendaFixaMedia desempata categorias com a mesma quantidade pela mais recente', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', categoriaId: 'antiga', valor: 1000, data: '2026-01-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'antiga', valor: 1000, data: '2026-02-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'nova', valor: 2000, data: '2026-08-05' }),
    criarTransacao({ tipo: 'receita', categoriaId: 'nova', valor: 2000, data: '2026-09-05' }),
  ];

  expect(calcularRendaFixaMedia(transacoes)).toBe(2000);
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

test('obterSaldoAtual pega o valor da linha mais recente (nunca soma nem faz média)', () => {
  const saldos: SaldoInicial[] = [
    { id: '1', valor: 1000, criadoEm: '2026-08-01T10:00:00.000Z' },
    { id: '2', valor: 2500, criadoEm: '2026-09-13T10:00:00.000Z' },
    { id: '3', valor: 900, criadoEm: '2026-09-01T10:00:00.000Z' },
  ];

  expect(obterSaldoAtual(saldos)).toBe(2500);
});

test('obterSaldoAtual devolve 0 se o usuário nunca informou nenhum saldo', () => {
  expect(obterSaldoAtual([])).toBe(0);
});

test('obterSaldoAtual soma transações únicas lançadas depois do saldo informado', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-09-10T10:00:00.000Z' }];
  const despesaDepois = criarTransacao({ tipo: 'despesa', valor: 50, data: '2026-09-12' });
  const receitaDepois = criarTransacao({ tipo: 'receita', valor: 200, data: '2026-09-13' });

  const resultado = obterSaldoAtual(saldos, [despesaDepois, receitaDepois], '2026-09-14');

  expect(resultado).toBe(1000 - 50 + 200);
});

test('obterSaldoAtual ignora transações de antes do saldo informado (já estão embutidas nele)', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-09-10T10:00:00.000Z' }];
  const despesaAntiga = criarTransacao({ tipo: 'despesa', valor: 900, data: '2026-08-01' });

  const resultado = obterSaldoAtual(saldos, [despesaAntiga], '2026-09-14');

  expect(resultado).toBe(1000);
});

test('obterSaldoAtual ignora transação única com data futura (ainda não aconteceu)', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-09-10T10:00:00.000Z' }];
  const despesaFutura = criarTransacao({ tipo: 'despesa', valor: 300, data: '2026-09-20' });

  const resultado = obterSaldoAtual(saldos, [despesaFutura], '2026-09-14');

  expect(resultado).toBe(1000);
});

test('obterSaldoAtual só conta a parcela mensal se o dia de cobrança já passou', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-08-01T10:00:00.000Z' }];
  // Cobra todo dia 20 — em setembro, se hoje é dia 14, ainda não cobrou.
  const assinatura = criarTransacao({
    frequencia: 'mensal',
    valor: 40,
    data: '2026-01-20',
    dataFim: null,
  });

  const resultado = obterSaldoAtual(saldos, [assinatura], '2026-09-14');

  // fev-jul já estão embutidos no saldo informado (dia 01/08). De ago em
  // diante: ago-20 já aconteceu (conta), mas set-20 ainda não (hoje é dia 14).
  expect(resultado).toBe(1000 - 40 * 1);
});

test('obterSaldoAtual "gruda" a cobrança mensal no último dia de meses mais curtos', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-01-31T10:00:00.000Z' }];
  // Dia 31 — fevereiro de 2026 (não bissexto) só tem 28 dias.
  const assinatura = criarTransacao({
    frequencia: 'mensal',
    valor: 100,
    data: '2026-01-31',
    dataFim: null,
  });

  const resultado = obterSaldoAtual(saldos, [assinatura], '2026-02-28');

  // A cobrança de fevereiro "gruda" no dia 28 (último dia do mês) — já aconteceu.
  expect(resultado).toBe(1000 - 100);
});
