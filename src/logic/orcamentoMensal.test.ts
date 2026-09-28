import {
  calcularDespesasTotaisDoMes,
  calcularDespesasFixasDoMes,
  listarDespesasDoMesPorValor,
  projetarSituacaoAtual,
  avaliarSituacaoAtual,
  calcularReducaoParaFicarTranquilo,
  sugerirCorteNoMaiorGasto,
  type ProjecaoDeSituacao,
} from './orcamentoMensal';
import { projetarFluxoDeCaixaDiario, type MesProjetado } from './projecao';
import type { Transacao, Simulacao } from '../types/models';
import type { EstimativaDeGastos } from './estimativaDeGastos';

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

// Estimativa "neutra" (sem gasto do dia a dia estimado) — os testes deste
// arquivo querem controlar só os números REAIS lançados, sem depender da
// lógica própria de estimarGastosFuturos (testada à parte).
function criarEstimativaVazia(mesAtual: string): EstimativaDeGastos {
  return {
    mesAtual,
    gastoVariavelMensal: 0,
    gastoVariavelPorCategoria: [],
    recorrentesNaPratica: [],
    mesesComDado: 0,
    confianca: 'sem-dados',
  };
}

test('calcularDespesasTotaisDoMes soma despesas fixas e avulsas juntas, sem separar por tipo', () => {
  const transacoes = [
    criarTransacao({ frequencia: 'mensal', valor: 1000, data: '2026-01-05', dataFim: null }),
    criarTransacao({ frequencia: 'unica', valor: 80, data: '2026-09-05' }),
    criarTransacao({ frequencia: 'unica', valor: 120, data: '2026-09-20' }),
    // Receita: não conta, mesmo no mesmo mês.
    criarTransacao({ tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-09-05' }),
    // Mês diferente: não conta.
    criarTransacao({ frequencia: 'unica', valor: 999, data: '2026-08-15' }),
  ];

  expect(calcularDespesasTotaisDoMes(transacoes, '2026-09')).toBe(1000 + 80 + 120);
});

// Normaliza espaço não-separável que toLocaleString põe entre "R$" e o número.
function limpo(texto: string): string {
  return texto.replace(/\s/g, ' ');
}

// Mesma lógica de projetarSituacaoAtual, mas com `quantidadeDias`
// controlável — os testes deste arquivo querem janelas curtas e
// previsíveis, não os 365 dias fixos de produção (esses ficam cobertos
// pelo teste que chama projetarSituacaoAtual direto, mais abaixo).
function montarProjecao(
  transacoes: Transacao[],
  simulacoes: Simulacao[],
  saldoAtual: number,
  hoje: string,
  quantidadeDias: number,
  estimativa: EstimativaDeGastos,
  rendaFixaMensal = 0,
): ProjecaoDeSituacao {
  const pontos = projetarFluxoDeCaixaDiario(transacoes, simulacoes, saldoAtual, hoje, quantidadeDias, estimativa, rendaFixaMensal);
  let indicePior = 0;
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i].saldo < pontos[indicePior].saldo) indicePior = i;
  }
  return { pontos, saldoInicial: saldoAtual, indicePior, piorData: pontos[indicePior].data, piorSaldo: pontos[indicePior].saldo };
}

test('avaliarSituacaoAtual: um lançamento no MEIO do mês pode deixar o saldo negativo mesmo o mês fechando positivo — bug real corrigido', () => {
  // Cenário relatado pelo usuário: salário de R$4.271,54 cai no dia 30 de
  // setembro (mensal, sem dataFim); uma conta de R$5.000 vence dia 10 de
  // outubro — ANTES do próximo salário (dia 30). "Por mês" (a versão
  // anterior deste conserto) via outubro FECHAR em 1743,08 (positivo, o
  // salário do dia 30 compensa) e nunca via que, no MEIO do mês, antes
  // desse salário chegar, o saldo ficava negativo de verdade.
  const transacoes = [
    criarTransacao({
      id: 'salario',
      tipo: 'receita',
      frequencia: 'mensal',
      valor: 4271.54,
      data: '2026-09-30',
      dataFim: null,
    }),
    criarTransacao({ id: 'emprestimo', frequencia: 'mensal', valor: 900, data: '2026-09-30', dataFim: null }),
    criarTransacao({ id: 'financiamento', frequencia: 'unica', valor: 5000, data: '2026-10-10' }),
  ];

  const projecao = montarProjecao(transacoes, [], 0, '2026-09-27', 40, criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  expect(r.nivel).toBe('negativo');
  expect(r.piorData).toBe('2026-10-10');
  expect(r.piorSaldo).toBeCloseTo(-1628.46, 2);
  expect(limpo(r.mensagem)).toContain('R$ 1.628,46');
  expect(r.mensagem).toMatch(/10 de outubro de 2026/);
  // Único mergulho na janela (o saldo se recupera dia 30 e não cai de
  // novo antes do fim da janela) — sem "piora ainda mais depois" pra
  // avisar.
  expect(r.pioraDepois).toBeNull();
});

test('avaliarSituacaoAtual: "negativo" avisa a PRIMEIRA data que fica no vermelho, não a mais funda — bug real reportado', () => {
  // Cenário relatado pelo usuário: o saldo já fica negativo em outubro,
  // se recupera um pouco, e piora de novo (mais fundo ainda) em março —
  // uma despesa anual (tipo IPVA) chegando depois de uma recuperação
  // parcial. Avisar só março (o ponto mais fundo) escondia que o
  // problema já começa bem antes, em outubro.
  const transacoes = [
    criarTransacao({ id: 'salario', tipo: 'receita', frequencia: 'mensal', valor: 1000, data: '2026-09-05', dataFim: null }),
    // Deixa outubro em -200 (primeiro negativo).
    criarTransacao({ id: 'despesa-out', frequencia: 'unica', valor: 1200, data: '2026-10-05' }),
    // Salário sozinho recupera o saldo mês a mês depois disso (até
    // 4.800 em março), mas uma despesa anual grande (tipo IPVA) derruba
    // de novo pra -1.200 — mais fundo que o primeiro mergulho de outubro.
    criarTransacao({ id: 'ipva', frequencia: 'anual', valor: 6000, data: '2027-03-15' }),
  ];

  const projecao = montarProjecao(transacoes, [], 0, '2026-09-27', 200, criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  expect(r.nivel).toBe('negativo');
  // Primeiro negativo: outubro (-200), não março (bem mais fundo).
  expect(r.piorData).toBe('2026-10-05');
  expect(r.piorSaldo).toBeCloseTo(-200, 2);
  // Mas o card não esconde que piora ainda mais depois.
  expect(r.pioraDepois).not.toBeNull();
  expect(r.pioraDepois!.data).toBe('2027-03-15');
  expect(r.pioraDepois!.saldo).toBeLessThan(-200);
  expect(r.mensagem).toMatch(/5 de outubro de 2026/);
  expect(r.mensagem).toMatch(/piora ainda mais/);
  expect(r.mensagem).toMatch(/15 de março de 2027/);
});

test('projetarSituacaoAtual: janela de um ano pega um déficit recorrente que uma janela curta esconderia', () => {
  // Déficit de R$300/mês, todo dia 5 — persistente, não só um tropeço de
  // um mês. `piorData`/`piorSaldo` agora são a PRIMEIRA vez que isso
  // acontece (05/10, -300), não o fundo do poço depois de um ano
  // acumulando (que seria bem mais fundo) — avisar só o fundo do poço
  // esconderia que o problema já começa já no mês que vem.
  const transacoes = [
    criarTransacao({ id: 'salario', tipo: 'receita', frequencia: 'mensal', valor: 1000, data: '2026-09-05', dataFim: null }),
    criarTransacao({ id: 'despesa-recorrente', frequencia: 'mensal', valor: 1300, data: '2026-10-05', dataFim: null }),
  ];

  // projetarSituacaoAtual (não montarProjecao): valida a janela de
  // PRODUÇÃO de verdade (365 dias), não uma janela artificialmente curta.
  const projecao = projetarSituacaoAtual(transacoes, [], 0, '2026-09-27', criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  expect(r.nivel).toBe('negativo');
  expect(r.piorData).toBe('2026-10-05');
  expect(r.piorSaldo).toBeCloseTo(-300, 2);
  // O déficit continua todo mês — bem mais fundo um ano depois. O card
  // não esconde isso: avisa que piora ainda mais adiante.
  expect(r.pioraDepois).not.toBeNull();
  expect(r.pioraDepois!.saldo).toBeLessThan(-300);
});

test('avaliarSituacaoAtual: sem nenhuma receita esperada na janela, nivel é "sem-dados" (não inventa número)', () => {
  const projecao = montarProjecao([], [], 0, '2026-09-27', 40, criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  expect(r.nivel).toBe('sem-dados');
  expect(r.falta).toBe(0);
  expect(r.percentual).toBe(0);
});

test('avaliarSituacaoAtual: cabe mas com folga menor que 10% da renda até o pior momento é "apertado"', () => {
  const transacoes = [
    criarTransacao({ id: 'salario', tipo: 'receita', frequencia: 'unica', valor: 5000, data: '2026-09-05' }),
    // Deixa o saldo em 299,99 (saldoAtual 5000 + salario 5000 - despesa) —
    // abaixo dos 10% da renda que entrou até aqui (500).
    criarTransacao({ id: 'despesa', frequencia: 'unica', valor: 9700.01, data: '2026-09-10' }),
  ];

  // saldoAtual = 5000 (não 0) de propósito: com saldo de partida zero, o
  // próprio "hoje" (saldo 0, sem nenhum evento ainda) empataria como
  // "pior ponto" sempre que a trajetória nunca cai abaixo de zero — não é
  // o que este teste quer isolar (ver teste seguinte pra esse caso).
  const projecao = montarProjecao(transacoes, [], 5000, '2026-09-01', 20, criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  expect(r.piorData).toBe('2026-09-10');
  expect(r.nivel).toBe('apertado');
  expect(r.piorSaldo).toBeCloseTo(299.99, 2);
});

test('avaliarSituacaoAtual: simulação ativa (meta/compra parcelada) entra como saída na trajetória', () => {
  const transacoes = [
    criarTransacao({ id: 'salario', tipo: 'receita', frequencia: 'unica', valor: 3000, data: '2026-09-05' }),
  ];
  const simulacoes = [criarSimulacao({ tipo: 'economia', valorTotal: 3000, parcelas: 3, dataInicio: '2026-09-10' })];

  const projecao = montarProjecao(transacoes, simulacoes, 0, '2026-09-01', 20, criarEstimativaVazia('2026-09'));

  // Verifica o ponto exato (não "o pior da janela", que aqui seria o
  // trivial "hoje, saldo 0" — nada nesse cenário fica pior que o
  // começo): a parcela de fato SAI do saldo em 10/09, não é ignorada.
  // 05/09: 0+3000=3000. 10/09 (parcela 1000/3): 3000-1000=2000.
  const pontoDepoisDaParcela = projecao.pontos.find((p) => p.data === '2026-09-10');
  expect(pontoDepoisDaParcela?.saldo).toBeCloseTo(2000, 2);
  expect(avaliarSituacaoAtual(projecao).nivel).not.toBe('sem-dados');
});

test('avaliarSituacaoAtual: teto e barra chegam a 100% exatamente quando o pior saldo é zero', () => {
  // saldoAtual > 0 e uma receita real (500) de propósito — sem nenhuma
  // receita no período, rendaNaJanela fica 0 e o resultado vira
  // "sem-dados" antes de chegar no cálculo de teto/percentual (ver teste
  // dedicado a "sem-dados" acima).
  const transacoes = [
    criarTransacao({ id: 'salario', tipo: 'receita', frequencia: 'unica', valor: 500, data: '2026-09-03' }),
    criarTransacao({ id: 'despesa', frequencia: 'unica', valor: 1000, data: '2026-09-05' }),
  ];

  const projecao = montarProjecao(transacoes, [], 500, '2026-09-01', 20, criarEstimativaVazia('2026-09'));
  const r = avaliarSituacaoAtual(projecao);

  // saldoAtual(500) + salario(500) - despesa(1000) = 0 no dia 05/09.
  expect(r.piorData).toBe('2026-09-05');
  expect(r.piorSaldo).toBe(0);
  expect(r.teto).toBe(1000);
  expect(r.percentual).toBe(1);
  // Zero não é negativo — a barra cheia, mas ainda não vira "negativo".
  expect(r.nivel).not.toBe('negativo');
});

function criarMesProjetado(sobrescrever: Partial<MesProjetado>): MesProjetado {
  return { mes: '2026-09', entradas: 1000, saidas: 900, saldo: 100, ...sobrescrever };
}

test('calcularReducaoParaFicarTranquilo: nenhum mês abaixo da folga alvo (10% da renda) não pede corte', () => {
  const meses = [criarMesProjetado({ saldo: 500 }), criarMesProjetado({ mes: '2026-10', saldo: 100 })];

  expect(calcularReducaoParaFicarTranquilo(meses)).toBe(0);
});

test('calcularReducaoParaFicarTranquilo: um mês abaixo da folga alvo pede a diferença exata (só ele já passou)', () => {
  // entradas 1000, folga alvo = 10% = 100; saldo 90 falta só 10 pra chegar lá.
  const meses = [criarMesProjetado({ saldo: 90 })];

  expect(calcularReducaoParaFicarTranquilo(meses)).toBe(10);
});

test('calcularReducaoParaFicarTranquilo: corte é recorrente, então divide pela quantidade de meses já passados — pega o PIOR caso, não a soma', () => {
  // Mês 0 (índice 0): falta 10 pra folga → precisaria de 10/1 = 10.
  // Mês 1 (índice 1): falta 290 pra folga → precisaria de 290/2 = 145 (o
  // corte já teria valido duas vezes até esse mês). 145 > 10, então o
  // corte tem que ser 145 (o suficiente pro PIOR mês, não a soma dos dois).
  const meses = [
    criarMesProjetado({ mes: '2026-09', saldo: 90 }),
    criarMesProjetado({ mes: '2026-10', saldo: -190 }),
  ];

  expect(calcularReducaoParaFicarTranquilo(meses)).toBe(145);
});

test('sugerirCorteNoMaiorGasto: sugere valor e percentual sobre o maior gasto, quando o corte cabe nele', () => {
  const despesas = [
    criarTransacao({ id: 'cartao', descricao: 'Cartão de crédito', valor: 2000, data: '2026-09-05' }),
    criarTransacao({ id: 'luz', descricao: 'Luz', valor: 200, data: '2026-09-10' }),
  ];

  const sugestao = sugerirCorteNoMaiorGasto(despesas, 500);

  expect(sugestao?.item.id).toBe('cartao');
  expect(sugestao?.reducaoSugerida).toBe(500);
  expect(sugestao?.percentualSugerido).toBeCloseTo(25, 2);
  expect(sugestao?.excedeOItem).toBe(false);
});

test('sugerirCorteNoMaiorGasto: quando o corte necessário passa do valor do maior item, sugere o item inteiro e avisa que excede', () => {
  const despesas = [criarTransacao({ id: 'cartao', valor: 300, data: '2026-09-05' })];

  const sugestao = sugerirCorteNoMaiorGasto(despesas, 500);

  expect(sugestao?.reducaoSugerida).toBe(300);
  expect(sugestao?.percentualSugerido).toBe(100);
  expect(sugestao?.excedeOItem).toBe(true);
});

test('sugerirCorteNoMaiorGasto: sem corte necessário (0 ou negativo), não sugere nada', () => {
  const despesas = [criarTransacao({ id: 'cartao', valor: 300, data: '2026-09-05' })];

  expect(sugerirCorteNoMaiorGasto(despesas, 0)).toBeNull();
  expect(sugerirCorteNoMaiorGasto(despesas, -10)).toBeNull();
});

test('sugerirCorteNoMaiorGasto: sem despesas no mês, não sugere nada', () => {
  expect(sugerirCorteNoMaiorGasto([], 500)).toBeNull();
});

test('listarDespesasDoMesPorValor: só despesas do mês, da mais cara pra mais barata', () => {
  const transacoes = [
    criarTransacao({ id: 'barata', valor: 30, data: '2026-03-02' }),
    criarTransacao({ id: 'aluguel', valor: 1200, frequencia: 'mensal', data: '2026-01-05' }),
    criarTransacao({ id: 'media', valor: 250, data: '2026-03-20' }),
    // Fora da lista: avulsa de outro mês, receita, e recorrente já encerrada.
    criarTransacao({ id: 'outro-mes', valor: 9999, data: '2026-02-10' }),
    criarTransacao({ id: 'salario', valor: 5000, tipo: 'receita', frequencia: 'mensal', data: '2026-01-01' }),
    criarTransacao({ id: 'encerrada', valor: 800, frequencia: 'mensal', data: '2026-01-01', dataFim: '2026-02-01' }),
  ];

  const resultado = listarDespesasDoMesPorValor(transacoes, '2026-03');

  expect(resultado.map((t) => t.id)).toEqual(['aluguel', 'media', 'barata']);
});

test('listarDespesasDoMesPorValor não muta o array original', () => {
  const transacoes = [
    criarTransacao({ id: 'a', valor: 10, data: '2026-03-02' }),
    criarTransacao({ id: 'b', valor: 20, data: '2026-03-03' }),
  ];

  listarDespesasDoMesPorValor(transacoes, '2026-03');

  expect(transacoes.map((t) => t.id)).toEqual(['a', 'b']);
});

test('calcularDespesasFixasDoMes: só as mensais ativas no mês (sem avulsas, sem receitas, sem encerradas)', () => {
  const transacoes = [
    criarTransacao({ id: 'aluguel', valor: 1800, frequencia: 'mensal', data: '2026-01-05' }),
    criarTransacao({ id: 'luz', valor: 119, frequencia: 'mensal', data: '2026-01-15' }),
    criarTransacao({ id: 'avulsa', valor: 900, frequencia: 'unica', data: '2026-03-10' }),
    criarTransacao({ id: 'salario', valor: 5000, tipo: 'receita', frequencia: 'mensal', data: '2026-01-01' }),
    criarTransacao({ id: 'encerrada', valor: 800, frequencia: 'mensal', data: '2026-01-01', dataFim: '2026-02-01' }),
  ];

  expect(calcularDespesasFixasDoMes(transacoes, '2026-03')).toBe(1919);
});

test('despesa anual entra no total do mês em que cai, mas não nas despesas FIXAS mensais', () => {
  const anual = criarTransacao({ id: 'a', frequencia: 'anual', valor: 900, data: '2026-03-20' });
  const fixa = criarTransacao({ id: 'f', frequencia: 'mensal', valor: 100, data: '2026-01-10' });

  expect(calcularDespesasTotaisDoMes([anual, fixa], '2027-03')).toBe(1000);
  expect(calcularDespesasTotaisDoMes([anual, fixa], '2027-04')).toBe(100);
  expect(calcularDespesasFixasDoMes([anual, fixa], '2027-03')).toBe(100);
});
