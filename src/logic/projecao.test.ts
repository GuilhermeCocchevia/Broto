import {
  calcularSaldoProjetado,
  calcularRendaFixaMedia,
  obterSaldoAtual,
  calcularValorDaParcela,
  calcularJurosTotal,
  calcularDataFimPorQuantidadeDeMeses,
  calcularQuantidadeDeMesesPorDataFim,
  avaliarViabilidadeSimulacao,
  avaliarViabilidadeConjunta,
  simulacaoAtivaNoMes,
  calcularValorFuturoComAportes,
  calcularParcelaEfetiva,
  calcularSaidaEfetivaNoMes,
  calcularDespesaVariavelMedia,
  calcularReducaoMensalNecessaria,
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

test('simulação tipo "economia" afeta a projeção exatamente como uma "compra" (mesmos campos por baixo)', () => {
  const meta = criarSimulacao({
    tipo: 'economia',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-02-01',
  });

  const resultado = calcularSaldoProjetado([], [meta], '2026-01', 5);

  // Mesmo resultado do teste de "compra" acima: dinheiro comprometido sai
  // do disponível todo mês, não importa se é parcela de dívida ou
  // contribuição pra uma meta de guardar dinheiro.
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

test('calcularValorFuturoComAportes sem taxa é só a soma simples dos aportes', () => {
  expect(calcularValorFuturoComAportes(100, 0, 12)).toBe(1200);
});

test('calcularValorFuturoComAportes com taxa rende mais que a soma simples', () => {
  const semJuros = calcularValorFuturoComAportes(100, 0, 12);
  const comJuros = calcularValorFuturoComAportes(100, 0.01, 12);

  expect(comJuros).toBeGreaterThan(semJuros);
});

test('calcularValorFuturoComAportes bate com a conta manual mês a mês', () => {
  const aporteMensal = 100;
  const taxaMensal = 0.02;
  const meses = 3;

  // Cada aporte rende juros só a partir do mês em que entra: o 1º aporte
  // rende 2 meses, o 2º rende 1 mês, o 3º não rende nada ainda.
  const esperado =
    aporteMensal * Math.pow(1 + taxaMensal, 2) +
    aporteMensal * Math.pow(1 + taxaMensal, 1) +
    aporteMensal;

  expect(calcularValorFuturoComAportes(aporteMensal, taxaMensal, meses)).toBeCloseTo(esperado, 6);
});

test('calcularValorFuturoComAportes com aporteInicial soma o valor inicial já composto pelos meses inteiros', () => {
  const aporteMensal = 100;
  const taxaMensal = 0.01;
  const meses = 12;
  const aporteInicial = 1000;

  const comInicial = calcularValorFuturoComAportes(aporteMensal, taxaMensal, meses, aporteInicial);
  const semInicial = calcularValorFuturoComAportes(aporteMensal, taxaMensal, meses);
  const rendimentoDoInicial = aporteInicial * Math.pow(1 + taxaMensal, meses);

  expect(comInicial).toBeCloseTo(semInicial + rendimentoDoInicial, 6);
});

test('calcularValorFuturoComAportes com aporteInicial e taxa 0 é só a soma direta (sem juros pra render)', () => {
  expect(calcularValorFuturoComAportes(100, 0, 12, 1000)).toBe(1000 + 100 * 12);
});

test('calcularSaidaEfetivaNoMes soma o aporteInicial só no primeiro mês da simulação', () => {
  const simulacao = criarSimulacao({
    tipo: 'rendimento',
    valorTotal: 1200,
    parcelas: 12,
    dataInicio: '2026-01-01',
    aporteInicial: 500,
  });

  expect(calcularSaidaEfetivaNoMes(simulacao, '2026-01')).toBe(100 + 500);
  expect(calcularSaidaEfetivaNoMes(simulacao, '2026-02')).toBe(100);
});

test('aporteInicial sai do saldo projetado uma vez só, no primeiro mês da simulação', () => {
  const simulacao = criarSimulacao({
    tipo: 'rendimento',
    valorTotal: 1200,
    parcelas: 3,
    dataInicio: '2026-02-01',
    aporteInicial: 500,
  });

  const resultado = calcularSaldoProjetado([], [simulacao], '2026-01', 5);

  // jan (antes de começar) = 0, fev = 400 + 500 (aporte inicial), mar/abr =
  // 400 cada (1200/3), mai (já terminou) = 0.
  expect(resultado.map((m) => m.saidas)).toEqual([0, 900, 400, 400, 0]);
});

test('calcularParcelaEfetiva usa a taxa de juros pra compra (amortização)', () => {
  const compra = criarSimulacao({ tipo: 'compra', valorTotal: 1000, parcelas: 10, taxaJurosMensal: 0.02 });
  expect(calcularParcelaEfetiva(compra)).toBe(calcularValorDaParcela(1000, 10, 0.02));
});

test('calcularParcelaEfetiva ignora taxaJurosMensal pra economia/rendimento (sempre divisão simples)', () => {
  const economia = criarSimulacao({ tipo: 'economia', valorTotal: 1200, parcelas: 12, taxaJurosMensal: 0 });
  // 'rendimento' guarda uma taxa de RENDIMENTO real no campo — mas ela não
  // pode inflar o valor que sai do saldo disponível (isso é bug, não
  // feature: taxaJurosMensal aqui não é custo de parcelamento nenhum).
  const rendimento = criarSimulacao({ tipo: 'rendimento', valorTotal: 1200, parcelas: 12, taxaJurosMensal: 0.008 });

  expect(calcularParcelaEfetiva(economia)).toBe(100);
  expect(calcularParcelaEfetiva(rendimento)).toBe(100);
});

test('simulacaoAtivaNoMes é true durante a janela de parcelas, false fora dela', () => {
  const simulacao = criarSimulacao({ dataInicio: '2026-01-01', parcelas: 3 });

  expect(simulacaoAtivaNoMes(simulacao, '2025-12')).toBe(false);
  expect(simulacaoAtivaNoMes(simulacao, '2026-01')).toBe(true);
  expect(simulacaoAtivaNoMes(simulacao, '2026-03')).toBe(true);
  expect(simulacaoAtivaNoMes(simulacao, '2026-04')).toBe(false);
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

test('rendaFixaMensal continua somando mesmo com uma receita recorrente (mensal) no mês', () => {
  // Bug real encontrado testando com dados robustos: um benefício fixo
  // recorrente (frequencia 'mensal', ex: R$300/mês) estava marcando o mês
  // como "já tem receita registrada" e silenciando a renda fixa projetada
  // inteira — mesmo ela sendo R$3.000+ de estimativa de salário. Receita
  // 'mensal' é um valor certo À PARTE, não substitui a estimativa de
  // salário avulso; só receita 'unica' deveria suprimir a renda fixa.
  const beneficioFixo = criarTransacao({
    tipo: 'receita',
    frequencia: 'mensal',
    valor: 300,
    data: '2026-01-10',
    dataFim: null,
  });

  const resultado = calcularSaldoProjetado([beneficioFixo], [], '2026-10', 2, 0, 3266.67);

  // Cada mês: 300 do benefício + 3266,67 da renda fixa projetada.
  expect(resultado.map((m) => Math.round(m.entradas * 100) / 100)).toEqual([3566.67, 3566.67]);
});

test('calcularDespesaVariavelMedia tira a média das despesas avulsas dos últimos meses fechados', () => {
  const transacoes = [
    criarTransacao({ frequencia: 'unica', valor: 400, data: '2026-06-10' }),
    criarTransacao({ frequencia: 'unica', valor: 600, data: '2026-07-15' }),
    criarTransacao({ frequencia: 'unica', valor: 500, data: '2026-08-20' }),
    // Fora da janela de 3 meses terminando em agosto: não conta.
    criarTransacao({ frequencia: 'unica', valor: 100000, data: '2026-01-05' }),
  ];

  expect(calcularDespesaVariavelMedia(transacoes, '2026-08', 3)).toBe((400 + 600 + 500) / 3);
});

test('calcularDespesaVariavelMedia ignora despesas fixas e receitas (já contadas à parte)', () => {
  const transacoes = [
    criarTransacao({ frequencia: 'unica', valor: 500, data: '2026-08-05' }),
    criarTransacao({ frequencia: 'mensal', valor: 1000, data: '2026-01-01', dataFim: null }),
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-08-05' }),
  ];

  expect(calcularDespesaVariavelMedia(transacoes, '2026-08', 1)).toBe(500);
});

test('calcularSaldoProjetado projeta a despesa avulsa do mês BASE (o primeiro da janela) pros meses seguintes sem despesa própria', () => {
  // Só o mês base (janeiro, o primeiro da janela de 3 meses) tem despesa
  // avulsa de verdade lançada — fevereiro e março não têm nenhuma.
  const gastoDeJaneiro = criarTransacao({ frequencia: 'unica', valor: 800, data: '2026-01-15' });

  const resultado = calcularSaldoProjetado([gastoDeJaneiro], [], '2026-01', 3);

  // Janeiro usa o valor real (800) — não soma a "média" em cima do
  // próprio mês que a originou. Fevereiro e março, sem despesa avulsa
  // própria, replicam os 800 de janeiro (não ficam em 0).
  expect(resultado.map((m) => m.saidas)).toEqual([800, 800, 800]);
});

test('calcularSaldoProjetado NÃO substitui a despesa avulsa real de um mês que já tem a sua própria', () => {
  const gastoDeJaneiro = criarTransacao({ frequencia: 'unica', valor: 800, data: '2026-01-15' });
  // Março gasta bem menos que o mês base — o valor REAL de março continua
  // valendo, a estimativa (baseada em janeiro) não sobrescreve.
  const gastoDeMarco = criarTransacao({ frequencia: 'unica', valor: 200, data: '2026-03-10' });

  const resultado = calcularSaldoProjetado([gastoDeJaneiro, gastoDeMarco], [], '2026-01', 3);

  expect(resultado.map((m) => m.saidas)).toEqual([800, 800, 200]);
});

test('calcularSaldoProjetado sem nenhuma despesa avulsa no mês base não projeta estimativa nenhuma (fica em 0)', () => {
  // Sem despesa avulsa nenhuma no mês base (janeiro), não há o que
  // replicar — os meses seguintes ficam mesmo em 0, não inventam um
  // número do nada.
  const resultado = calcularSaldoProjetado([], [], '2026-01', 3);

  expect(resultado.map((m) => m.saidas)).toEqual([0, 0, 0]);
});

test('a estimativa de despesa avulsa soma junto de despesas recorrentes (fixas) normalmente', () => {
  const aluguel = criarTransacao({ frequencia: 'mensal', valor: 1200, data: '2026-01-05', dataFim: null });
  const gastoDeJaneiro = criarTransacao({ frequencia: 'unica', valor: 800, data: '2026-01-20' });

  const resultado = calcularSaldoProjetado([aluguel, gastoDeJaneiro], [], '2026-01', 2);

  // Janeiro: 1200 (aluguel) + 800 (avulsa real). Fevereiro: 1200
  // (aluguel) + 800 (avulsa projetada a partir de janeiro).
  expect(resultado.map((m) => m.saidas)).toEqual([2000, 2000]);
});

test('uma simulação fica menos otimista quando o mês em que ela começa já tem despesa avulsa real', () => {
  const compraLonga = criarSimulacao({
    tipo: 'compra',
    valorTotal: 1200,
    parcelas: 12,
    dataInicio: '2026-01-01',
  });
  const rendaMensal = criarTransacao({
    tipo: 'receita',
    frequencia: 'mensal',
    valor: 3000,
    data: '2026-01-01',
    dataFim: null,
  });
  const gastoVariavelDoMesBase = criarTransacao({ frequencia: 'unica', valor: 1500, data: '2026-01-10' });

  const semGastoVariavel = avaliarViabilidadeSimulacao(compraLonga, [rendaMensal], 0, 0);
  const comGastoVariavel = avaliarViabilidadeSimulacao(
    compraLonga,
    [rendaMensal, gastoVariavelDoMesBase],
    0,
    0,
  );

  // Mesma renda e compromissos — só o gasto avulso do mês em que a
  // simulação começa muda, e ele se projeta pros meses seguintes. Com
  // ele, o pior saldo tem que ser sempre igual ou pior (nunca melhor).
  expect(comGastoVariavel.piorSaldo).toBeLessThan(semGastoVariavel.piorSaldo);
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

test('calcularDataFimPorQuantidadeDeMeses: "repete por 1 mês" termina no próprio mês de início', () => {
  expect(calcularDataFimPorQuantidadeDeMeses('2026-03-10', 1)).toBe('2026-03-10');
});

test('calcularDataFimPorQuantidadeDeMeses: soma os meses a partir do início, mantendo o dia', () => {
  expect(calcularDataFimPorQuantidadeDeMeses('2026-03-10', 12)).toBe('2027-02-10');
});

test('calcularDataFimPorQuantidadeDeMeses: "gruda" no último dia em meses mais curtos', () => {
  // Começa dia 31/01; 2 meses (jan + fev) termina em fevereiro, que só tem 28 dias.
  expect(calcularDataFimPorQuantidadeDeMeses('2026-01-31', 2)).toBe('2026-02-28');
});

test('calcularQuantidadeDeMesesPorDataFim é o caminho inverso de calcularDataFimPorQuantidadeDeMeses', () => {
  expect(calcularQuantidadeDeMesesPorDataFim('2026-03-10', '2027-02-10')).toBe(12);
  expect(calcularQuantidadeDeMesesPorDataFim('2026-03-10', '2026-03-10')).toBe(1);
});

test('avaliarViabilidadeSimulacao: viável quando o saldo nunca fica negativo durante o compromisso', () => {
  const rendaMensal = criarTransacao({
    tipo: 'receita',
    frequencia: 'mensal',
    valor: 2000,
    data: '2026-01-01',
    dataFim: null,
  });
  const compra = criarSimulacao({ valorTotal: 300, parcelas: 3, dataInicio: '2026-02-01' });

  const resultado = avaliarViabilidadeSimulacao(compra, [rendaMensal], 500, 0);

  expect(resultado.meses.map((m) => m.mes)).toEqual(['2026-02', '2026-03', '2026-04']);
  // fev: 500 + 2000 - 100 = 2400 (o pior mês, o saldo só cresce depois).
  expect(resultado.piorMes).toBe('2026-02');
  expect(resultado.piorSaldo).toBe(2400);
  expect(resultado.viavel).toBe(true);
});

test('avaliarViabilidadeSimulacao: não viável quando o saldo fica negativo, aponta o pior mês e valor', () => {
  const compra = criarSimulacao({ valorTotal: 300, parcelas: 3, dataInicio: '2026-02-01' });

  const resultado = avaliarViabilidadeSimulacao(compra, [], 50, 0);

  // Sem nenhuma renda, o saldo só piora: fev -50, mar -150, abr -250.
  expect(resultado.meses.map((m) => m.saldo)).toEqual([-50, -150, -250]);
  expect(resultado.piorMes).toBe('2026-04');
  expect(resultado.piorSaldo).toBe(-250);
  expect(resultado.viavel).toBe(false);
});

test('avaliarViabilidadeSimulacao: funciona com uma parcela só', () => {
  const aVista = criarSimulacao({ valorTotal: 200, parcelas: 1, dataInicio: '2026-05-01' });

  const resultado = avaliarViabilidadeSimulacao(aVista, [], 100, 0);

  expect(resultado.meses).toHaveLength(1);
  expect(resultado.piorMes).toBe('2026-05');
  expect(resultado.piorSaldo).toBe(-100);
  expect(resultado.viavel).toBe(false);
});

test('avaliarViabilidadeConjunta sem nenhuma simulação é trivialmente viável', () => {
  const resultado = avaliarViabilidadeConjunta([], [], 1000, 0);

  expect(resultado.viavel).toBe(true);
  expect(resultado.meses).toEqual([]);
});

test('avaliarViabilidadeConjunta com 1 simulação só dá o mesmo resultado de avaliarViabilidadeSimulacao', () => {
  const compra = criarSimulacao({ valorTotal: 300, parcelas: 3, dataInicio: '2026-02-01' });

  const isolado = avaliarViabilidadeSimulacao(compra, [], 500, 0);
  const conjunto = avaliarViabilidadeConjunta([compra], [], 500, 0);

  expect(conjunto).toEqual(isolado);
});

test('avaliarViabilidadeConjunta: a janela cobre do início da mais cedo até o fim da mais tarde', () => {
  const comecaAntes = criarSimulacao({
    id: 'a',
    valorTotal: 200,
    parcelas: 2,
    dataInicio: '2026-02-01',
  });
  const comecaDepois = criarSimulacao({
    id: 'b',
    tipo: 'economia',
    valorTotal: 200,
    parcelas: 2,
    dataInicio: '2026-04-01',
  });

  const resultado = avaliarViabilidadeConjunta([comecaAntes, comecaDepois], [], 1000, 0);

  // fev/mar: só a 1ª ativa (100 cada). abr/mai: só a 2ª ativa (100 cada).
  expect(resultado.meses.map((m) => m.mes)).toEqual(['2026-02', '2026-03', '2026-04', '2026-05']);
  expect(resultado.meses.map((m) => m.saldo)).toEqual([900, 800, 700, 600]);
  expect(resultado.viavel).toBe(true);
});

test('avaliarViabilidadeConjunta: duas simulações viáveis sozinhas podem ficar inviáveis juntas', () => {
  const rendaMensal = criarTransacao({
    tipo: 'receita',
    frequencia: 'mensal',
    valor: 2000,
    data: '2026-01-01',
    dataFim: null,
  });
  // Isolada: 0 + 2000 - 100 = 1900 (viável).
  const compra = criarSimulacao({
    id: 'compra',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-02-01',
  });
  // Isolada: 0 + 2000 - 2000 = 0 (viável, no limite).
  const meta = criarSimulacao({
    id: 'meta',
    tipo: 'economia',
    valorTotal: 6000,
    parcelas: 3,
    dataInicio: '2026-02-01',
  });

  expect(avaliarViabilidadeSimulacao(compra, [rendaMensal], 0, 0).viavel).toBe(true);
  expect(avaliarViabilidadeSimulacao(meta, [rendaMensal], 0, 0).viavel).toBe(true);

  // Juntas: cada mês perde mais 2100 (100 da compra + 2000 da meta) do que
  // os 2000 que entram — o saldo só piora mês a mês, ficando bem negativo
  // (não dá pra fazer as duas ao mesmo tempo).
  const conjunto = avaliarViabilidadeConjunta([compra, meta], [rendaMensal], 0, 0);
  expect(conjunto.meses.map((m) => m.saldo)).toEqual([-100, -200, -300]);
  expect(conjunto.viavel).toBe(false);
  expect(conjunto.piorSaldo).toBe(-300);
});

test('avaliarViabilidadeSimulacao: "economia" é avaliada exatamente como "compra" (mesmos campos por baixo)', () => {
  const rendaMensal = criarTransacao({
    tipo: 'receita',
    frequencia: 'mensal',
    valor: 2000,
    data: '2026-01-01',
    dataFim: null,
  });
  const meta = criarSimulacao({
    tipo: 'economia',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-02-01',
  });

  const resultado = avaliarViabilidadeSimulacao(meta, [rendaMensal], 500, 0);

  expect(resultado.piorMes).toBe('2026-02');
  expect(resultado.piorSaldo).toBe(2400);
  expect(resultado.viavel).toBe(true);
});

test('calcularReducaoMensalNecessaria: 0 quando nenhum mês fica negativo', () => {
  const meses = [
    { mes: '2026-02', entradas: 0, saidas: 0, saldo: 100 },
    { mes: '2026-03', entradas: 0, saidas: 0, saldo: 0 },
  ];

  expect(calcularReducaoMensalNecessaria(meses)).toBe(0);
});

test('calcularReducaoMensalNecessaria: o corte de cada mês se acumula nos meses seguintes', () => {
  // -50, -150, -250: cortar R$r por mês dá +r, +2r, +3r. O mês 1 pede
  // 50/1, o mês 2 pede 150/2 = 75, o mês 3 pede 250/3 ≈ 83,34 (arredondado
  // pra cima). O maior manda — R$83,34 zera os três meses.
  const meses = [
    { mes: '2026-02', entradas: 0, saidas: 0, saldo: -50 },
    { mes: '2026-03', entradas: 0, saidas: 0, saldo: -150 },
    { mes: '2026-04', entradas: 0, saidas: 0, saldo: -250 },
  ];

  const reducao = calcularReducaoMensalNecessaria(meses);

  expect(reducao).toBe(83.34);
  meses.forEach((mes, indice) => {
    expect(mes.saldo + reducao * (indice + 1)).toBeGreaterThanOrEqual(0);
  });
});

test('calcularReducaoMensalNecessaria: o mês MENOS negativo pode ser o que define o corte', () => {
  // Mês 1 em -100 (só 1 mês pra acumular economia) pede R$100; o mês 3, em
  // -150, pede só R$50. Olhar só o pior saldo (-150) sugeriria R$50 e
  // deixaria o primeiro mês ainda no vermelho.
  const meses = [
    { mes: '2026-02', entradas: 0, saidas: 0, saldo: -100 },
    { mes: '2026-03', entradas: 0, saidas: 0, saldo: 20 },
    { mes: '2026-04', entradas: 0, saidas: 0, saldo: -150 },
  ];

  expect(calcularReducaoMensalNecessaria(meses)).toBe(100);
});

test('calcularReducaoMensalNecessaria: sem nenhum mês devolve 0', () => {
  expect(calcularReducaoMensalNecessaria([])).toBe(0);
});
