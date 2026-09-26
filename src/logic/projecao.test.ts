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
  calcularRendaEsperadaDoMes,
  listarOcorrenciasAnuais,
  transacaoSeAplicaNoMes,
} from './projecao';
import { estimarGastosFuturos } from './estimativaDeGastos';
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

// --- Projeção com estimativa de gastos (mês de referência = mês ATUAL) ---

const MES_ATUAL = '2026-09';

function rendaEAluguel(): Transacao[] {
  return [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'mensal', valor: 5000, data: '2026-01-05', descricao: 'Salário' }),
    criarTransacao({ id: 'a', tipo: 'despesa', frequencia: 'mensal', valor: 2000, data: '2026-01-05', descricao: 'Aluguel' }),
  ];
}

test('com estimativa: mês FUTURO herda o gasto variável do mês atual (a regra antiga dava zero)', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'm', valor: 1000, data: '2026-09-03', descricao: 'Mercado' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const antiga = calcularSaldoProjetado(transacoes, [], '2026-10', 2, 0, 0);
  const nova = calcularSaldoProjetado(transacoes, [], '2026-10', 2, 0, 0, estimativa);

  // Antiga: outubro não tem avulsa própria → estimativa ancorada em outubro = 0.
  expect(antiga.map((m) => m.saidas)).toEqual([2000, 2000]);
  // Nova: aluguel 2000 + variável 1000 em todo mês futuro.
  expect(nova.map((m) => m.saidas)).toEqual([3000, 3000]);
});

test('com estimativa: mês atual completa só a diferença até a estimativa (não conta o já lançado 2x)', () => {
  const transacoes = [
    ...rendaEAluguel(),
    // Agosto foi um mês de R$1000 de variável; em setembro só 400 até agora.
    criarTransacao({ id: 'ago', valor: 1000, data: '2026-08-10', descricao: 'Mercado ago' }),
    criarTransacao({ id: 'set', valor: 400, data: '2026-09-03', descricao: 'Mercado set' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);
  expect(estimativa.gastoVariavelMensal).toBe(1000);

  const [setembro] = calcularSaldoProjetado(transacoes, [], MES_ATUAL, 1, 0, 0, estimativa);

  // Aluguel 2000 + os 400 reais + os 600 que faltam pra fechar os 1000 esperados.
  expect(setembro.saidas).toBe(3000);
});

test('com estimativa: mês atual sem nenhuma avulsa ainda recebe a estimativa inteira', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'ago', valor: 1000, data: '2026-08-10', descricao: 'Mercado ago' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const [setembro] = calcularSaldoProjetado(transacoes, [], MES_ATUAL, 1, 0, 0, estimativa);

  expect(setembro.saidas).toBe(3000);
});

test('com estimativa: meses ANTERIORES ao atual só têm o que foi lançado (histórico não é estimado)', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'set', valor: 1000, data: '2026-09-03', descricao: 'Mercado set' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const [agosto] = calcularSaldoProjetado(transacoes, [], '2026-08', 1, 0, 0, estimativa);

  expect(agosto.saidas).toBe(2000);
});

test('com estimativa: compra planejada lançada num mês futuro soma POR CIMA do gasto do dia a dia', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'm', valor: 1000, data: '2026-09-03', descricao: 'Mercado' }),
    criarTransacao({ id: 'tv', valor: 3000, data: '2026-10-15', descricao: 'TV planejada' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const [outubro, novembro] = calcularSaldoProjetado(transacoes, [], '2026-10', 2, 0, 0, estimativa);

  // Outubro: aluguel 2000 + TV 3000 + variável 1000. A regra antiga zerava a
  // estimativa só porque havia UMA avulsa no mês.
  expect(outubro.saidas).toBe(6000);
  expect(novembro.saidas).toBe(3000);
});

test('com estimativa: recorrente na prática (fatura de cartão) entra em todo mês futuro, sem contar 2x', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'c1', valor: 140, data: '2026-08-10', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'c2', valor: 160, data: '2026-09-10', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'm', valor: 500, data: '2026-09-03', descricao: 'Mercado' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const [outubro] = calcularSaldoProjetado(transacoes, [], '2026-10', 1, 0, 0, estimativa);

  // Aluguel 2000 + variável (só o mercado) 500 + cartão médio 150.
  expect(outubro.saidas).toBe(2650);
});

test('com estimativa: recorrente na prática NÃO soma no mês em que o lançamento real já existe', () => {
  const transacoes = [
    ...rendaEAluguel(),
    criarTransacao({ id: 'c1', valor: 140, data: '2026-08-10', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'c2', valor: 160, data: '2026-09-10', descricao: 'Cartão Nubank' }),
    // Já lançou a fatura de outubro antes do tempo.
    criarTransacao({ id: 'c3', valor: 170, data: '2026-10-10', descricao: 'Cartão Nubank' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);

  const [outubro] = calcularSaldoProjetado(transacoes, [], '2026-10', 1, 0, 0, estimativa);

  // Aluguel 2000 + a fatura REAL de 170 (não 170 + 150 médio).
  expect(outubro.saidas).toBe(2170);
});

test('CASO REAL: a mesma meta não muda de veredito só porque começa no mês que vem', () => {
  const transacoes: Transacao[] = [
    criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'mensal', valor: 3200, data: '2026-09-05', descricao: 'Salario Beca' }),
    criarTransacao({ id: 'r2', tipo: 'receita', frequencia: 'mensal', valor: 2560, data: '2026-09-05', descricao: 'Salario Gui' }),
    criarTransacao({ id: 'f1', frequencia: 'mensal', valor: 2593.4, data: '2026-01-10', descricao: 'Fixos do mês' }),
    criarTransacao({ id: 'v1', valor: 1320, data: '2026-09-10', descricao: 'Cartao Mercado Pago' }),
    criarTransacao({ id: 'v2', valor: 922, data: '2026-09-10', descricao: 'Cartao Caixa' }),
    criarTransacao({ id: 'v3', valor: 300, data: '2026-09-10', descricao: 'Cartao Itau' }),
    criarTransacao({ id: 'v4', valor: 140, data: '2026-09-10', descricao: 'Cartao Nubank' }),
    criarTransacao({ id: 'v5', valor: 108, data: '2026-09-10', descricao: 'Outros' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);
  const meta = (dataInicio: string) =>
    criarSimulacao({ tipo: 'economia', valorTotal: 6000, parcelas: 12, dataInicio });

  const esteMes = avaliarViabilidadeSimulacao(meta('2026-09-21'), transacoes, 0, 0, estimativa);
  const mesQueVem = avaliarViabilidadeSimulacao(meta('2026-10-01'), transacoes, 0, 0, estimativa);
  const antigaMesQueVem = avaliarViabilidadeSimulacao(meta('2026-10-01'), transacoes, 0, 0);

  expect(esteMes.viavel).toBe(false);
  expect(mesQueVem.viavel).toBe(false);
  // O primeiro mês de cada janela sai igual: -123,40 (5760 - 2593,40 - 2790 - 500).
  expect(esteMes.meses[0].saldo).toBeCloseTo(-123.4, 2);
  expect(mesQueVem.meses[0].saldo).toBeCloseTo(-123.4, 2);
  // A regra antiga dava "viável" pro mesmo cenário (variável = 0 em outubro).
  expect(antigaMesQueVem.viavel).toBe(true);
});

test('calcularRendaEsperadaDoMes: recorrente + estimativa quando não há avulsa no mês', () => {
  const transacoes = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'mensal', valor: 300, data: '2026-01-05' }),
  ];
  // 300 do benefício fixo + 3000 estimados (nenhuma receita avulsa em outubro).
  expect(calcularRendaEsperadaDoMes(transacoes, '2026-10', 3000)).toBe(3300);
});

test('calcularRendaEsperadaDoMes: com receita avulsa no mês, a estimativa não é somada', () => {
  const transacoes = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-10-05' }),
  ];
  expect(calcularRendaEsperadaDoMes(transacoes, '2026-10', 3000)).toBe(3000);
});

test('obterSaldoAtual: saldo informado à noite (22h locais) não esconde os lançamentos do dia seguinte', () => {
  // 20/09 às 22h em Brasília = 21/09 01:00 em UTC. O checkpoint vale como dia 20,
  // então uma despesa de 21/09 acontece DEPOIS dele e precisa ser descontada.
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2026-09-21T01:00:00.000Z' }];
  const despesaDeAmanha = criarTransacao({ valor: 100, data: '2026-09-21', tipo: 'despesa' });

  expect(obterSaldoAtual(saldos, [despesaDeAmanha], '2026-09-21')).toBe(900);
});

// --- Frequência ANUAL (fase 4 do motor de projeção) ---
// Risco central: várias contas tratavam "não é única" como "é mensal". Uma
// transação anual precisa cair SÓ no mês do ano dela, nunca em todo mês.
const ipva = criarTransacao({ id: 'ipva', frequencia: 'anual', valor: 1500, data: '2026-01-15', descricao: 'IPVA' });

test('transacaoSeAplicaNoMes: anual só cai no mesmo mês do ano, a partir do ano em que começou', () => {
  expect(transacaoSeAplicaNoMes(ipva, '2026-01')).toBe(true);
  expect(transacaoSeAplicaNoMes(ipva, '2027-01')).toBe(true);
  expect(transacaoSeAplicaNoMes(ipva, '2030-01')).toBe(true);
  // Outros meses do ano: nunca.
  for (const mes of ['2026-02', '2026-06', '2026-12', '2027-02']) {
    expect(transacaoSeAplicaNoMes(ipva, mes)).toBe(false);
  }
  // Antes de começar: não vale (mesmo sendo janeiro).
  expect(transacaoSeAplicaNoMes(ipva, '2025-01')).toBe(false);
});

test('transacaoSeAplicaNoMes: anual respeita dataFim (não cai em anos depois do fim)', () => {
  const comFim = { ...ipva, dataFim: '2027-06-01' };
  expect(transacaoSeAplicaNoMes(comFim, '2027-01')).toBe(true);
  expect(transacaoSeAplicaNoMes(comFim, '2028-01')).toBe(false);
});

test('transacaoSeAplicaNoMes continua igual pra única e mensal', () => {
  const unica = criarTransacao({ data: '2026-03-10' });
  expect(transacaoSeAplicaNoMes(unica, '2026-03')).toBe(true);
  expect(transacaoSeAplicaNoMes(unica, '2027-03')).toBe(false);
  const mensal = criarTransacao({ frequencia: 'mensal', data: '2026-03-10' });
  expect(transacaoSeAplicaNoMes(mensal, '2026-04')).toBe(true);
});

test('calcularSaldoProjetado: IPVA anual aparece só em janeiro, atravessando a virada do ano', () => {
  const meses = calcularSaldoProjetado([ipva], [], '2026-11', 15);
  // nov/2026 .. jan/2028: janeiro/2027 e janeiro/2028 têm o IPVA; o resto, zero.
  const comSaida = meses.filter((m) => m.saidas > 0).map((m) => m.mes);
  expect(comSaida).toEqual(['2027-01', '2028-01']);
  expect(meses.find((m) => m.mes === '2027-01')!.saidas).toBe(1500);
  expect(meses[meses.length - 1].saldo).toBe(-3000);
});

test('13º salário (receita anual em dezembro) soma no mês certo e NÃO cala a renda fixa estimada', () => {
  const decimoTerceiro = criarTransacao({
    id: '13', tipo: 'receita', frequencia: 'anual', valor: 3000, data: '2026-12-20', descricao: '13º salário',
  });
  const meses = calcularSaldoProjetado([decimoTerceiro], [], '2026-11', 3, 0, 3000);
  // renda fixa estimada (3000) vale nos 3 meses; em dezembro soma o 13º por cima.
  expect(meses.map((m) => m.entradas)).toEqual([3000, 6000, 3000]);
});

test('despesa anual não é tratada como gasto avulso pelo motor (não vira estimativa de gasto variável)', () => {
  const estimativa = estimarGastosFuturos([ipva], '2026-01');
  expect(estimativa.gastoVariavelMensal).toBe(0);
  expect(estimativa.recorrentesNaPratica).toEqual([]);
  expect(estimativa.mesesComDado).toBe(0);
});

test('obterSaldoAtual: conta a anual UMA vez por ano já passado, nunca todo mês', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 10000, criadoEm: '2026-01-01T10:00:00.000Z' }];
  // IPVA em 15/jan: 2026-01-15 e 2027-01-15 já passaram em 2027-06-01 => 2 ocorrências.
  expect(obterSaldoAtual(saldos, [ipva], '2027-06-01')).toBe(10000 - 1500 * 2);
  // Um mês depois da primeira, ainda só 1 (se fosse tratada como mensal seriam várias).
  expect(obterSaldoAtual(saldos, [ipva], '2026-03-01')).toBe(10000 - 1500);
});

test('obterSaldoAtual: anual só conta quando o dia do ano já passou', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 5000, criadoEm: '2026-01-01T10:00:00.000Z' }];
  const iptu = criarTransacao({ frequencia: 'anual', valor: 900, data: '2026-03-20' });
  expect(obterSaldoAtual(saldos, [iptu], '2027-03-10')).toBe(5000 - 900); // 20/mar/2027 ainda não chegou
  expect(obterSaldoAtual(saldos, [iptu], '2027-03-25')).toBe(5000 - 900 * 2);
});

test('obterSaldoAtual: anual em 29/fev cai em 28/fev nos anos não bissextos', () => {
  const saldos: SaldoInicial[] = [{ id: '1', valor: 1000, criadoEm: '2027-01-01T10:00:00.000Z' }];
  const seguro = criarTransacao({ frequencia: 'anual', valor: 100, data: '2024-02-29' });
  expect(obterSaldoAtual(saldos, [seguro], '2027-03-01')).toBe(1000 - 100);
});

test('listarOcorrenciasAnuais: só as anuais dos próximos meses, em ordem cronológica', () => {
  const iptu = criarTransacao({ id: 'iptu', frequencia: 'anual', valor: 900, data: '2026-03-20', descricao: 'IPTU' });
  const mensal = criarTransacao({ id: 'm', frequencia: 'mensal', valor: 50 });
  const r = listarOcorrenciasAnuais([iptu, mensal, ipva], '2026-11', 12);
  expect(r.map((o) => [o.transacao.descricao, o.mes])).toEqual([
    ['IPVA', '2027-01'],
    ['IPTU', '2027-03'],
  ]);
});
