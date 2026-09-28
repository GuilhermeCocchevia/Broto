import {
  ajustarGastoDeCategoria,
  ajustarGastoDoDiaADia,
  calcularCenarios,
  calcularCorteNecessarioEmCategoria,
  calcularCorteNecessarioEmPercentual,
  descreverEseSe,
  descreverOndeCorta,
  explicarSemSolucao,
  explicarSemSolucaoNaCategoria,
  FATOR_IMPREVISTOS,
  listarItensDoDiaADiaPorCategoria,
  montarAvisoDeFolga,
  sugestaoParaMetaDeGuardar,
  temFaixaDeCenarios,
  totalDaCategoriaNoDiaADia,
  type Avaliador,
} from './cenariosDeProjecao';
import { avaliarViabilidadeSimulacao, type ResultadoViabilidade } from './projecao';
import { formatarMesBr } from '../utils/formatarDataBr';
import { estimarGastosFuturos, type EstimativaDeGastos } from './estimativaDeGastos';
import type { Simulacao, Transacao } from '../types/models';

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

const MES_ATUAL = '2026-09';

// Cenário do usuário real: renda 5760, fixos 2593,40, dia a dia 2790, meta 500/mês x 12.
const transacoesReais: Transacao[] = [
  criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'mensal', valor: 5760, data: '2026-09-05', descricao: 'Salários' }),
  criarTransacao({ id: 'f1', frequencia: 'mensal', valor: 2593.4, data: '2026-01-10', descricao: 'Fixos' }),
  criarTransacao({ id: 'v1', valor: 2790, data: '2026-09-10', descricao: 'Gastos do mês' }),
];
const meta: Simulacao = {
  id: 's',
  descricao: 'Viagem',
  tipo: 'economia',
  valorTotal: 6000,
  parcelas: 12,
  dataInicio: '2026-09-21',
  categoriaId: 'c',
  taxaJurosMensal: 0,
  aporteInicial: 0,
  criadoEm: '',
};
const estimativaReal = estimarGastosFuturos(transacoesReais, MES_ATUAL);

// Arredonda os saldos pra 6 casas decimais antes de comparar dois
// resultados que deveriam ser numericamente iguais — o motor dia a dia
// (ver projecao.ts) soma muito mais eventos que o antigo motor por mês (um
// por lançamento, não um por mês), e ponto flutuante não é associativo:
// `(x*0.9)*k` e `x*(0.9*k)` dão o mesmo número real, mas o último bit pode
// divergir. Nenhuma das duas contas está errada — é ruído bem abaixo do
// centavo, não uma diferença de verdade.
function arredondar(r: ResultadoViabilidade): ResultadoViabilidade {
  return {
    ...r,
    piorSaldo: Math.round(r.piorSaldo * 1e6) / 1e6,
    meses: r.meses.map((m) => ({ ...m, saldo: Math.round(m.saldo * 1e6) / 1e6 })),
  };
}

function criarAvaliador(transacoes: Transacao[], simulacao: Simulacao): Avaliador {
  return (estimativa) => avaliarViabilidadeSimulacao(simulacao, transacoes, 0, 0, estimativa);
}
// A mesma meta começando no mês que vem (o cenário em que cortar gasto
// funciona) — mesmo DIA do mês que `meta` (dia 21, depois do salário e das
// despesas do início do mês), só num mês diferente. Dia 1 criaria um
// problema de TIMING à parte (a parcela debitando antes do salário
// chegar, ver CASO REAL em projecao.test.ts) que não é o que estes testes
// querem exercitar — aqui o foco é a matemática do corte necessário.
const metaMesQueVem: Simulacao = { ...meta, dataInicio: '2026-10-21' };
const avaliar = criarAvaliador(transacoesReais, metaMesQueVem);

test('ajustarGastoDoDiaADia escala o variável E as recorrentes na prática, sem mexer no resto', () => {
  const estimativa: EstimativaDeGastos = {
    mesAtual: MES_ATUAL,
    gastoVariavelMensal: 1000,
    gastoVariavelPorCategoria: [{ categoriaId: 'c', valorMensal: 1000 }],
    recorrentesNaPratica: [{ chave: 'cartao', descricao: 'Cartão', valorMensal: 200, categoriaId: 'c2' }],
    mesesComDado: 2,
    confianca: 'media',
  };

  const menos = ajustarGastoDoDiaADia(estimativa, 0.9);

  expect(menos.gastoVariavelMensal).toBeCloseTo(900);
  expect(menos.recorrentesNaPratica[0].valorMensal).toBeCloseTo(180);
  expect(menos.recorrentesNaPratica[0].descricao).toBe('Cartão');
  expect(menos.mesesComDado).toBe(2);
  // Não muta a original.
  expect(estimativa.gastoVariavelMensal).toBe(1000);
});

test('caso real: meta não cabe, e o corte necessário no dia a dia é de 5% (123,40 / 2790 = 4,4%, arredondado pra cima)', () => {
  expect(avaliar(estimativaReal).viavel).toBe(false);

  expect(calcularCorteNecessarioEmPercentual(avaliar, estimativaReal)).toBe(5);
});

test('o corte sugerido de fato faz a meta caber, e 1% a menos não faria', () => {
  const corte = calcularCorteNecessarioEmPercentual(avaliar, estimativaReal)!;

  expect(avaliar(ajustarGastoDoDiaADia(estimativaReal, 1 - corte / 100)).viavel).toBe(true);
  expect(avaliar(ajustarGastoDoDiaADia(estimativaReal, 1 - (corte - 1) / 100)).viavel).toBe(false);
});

test('já viável: corte necessário é 0', () => {
  const folgadas = [
    ...transacoesReais.slice(0, 2),
    criarTransacao({ id: 'v', valor: 500, data: '2026-09-10', descricao: 'Poucos gastos' }),
  ];
  const estimativa = estimarGastosFuturos(folgadas, MES_ATUAL);
  expect(calcularCorteNecessarioEmPercentual(criarAvaliador(folgadas, metaMesQueVem), estimativa)).toBe(0);
});

test('se nem cortando o dia a dia inteiro fica viável (fixos já passam da renda): null', () => {
  const apertado: Transacao[] = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'mensal', valor: 2000, data: '2026-01-05', descricao: 'Salário' }),
    criarTransacao({ id: 'f', frequencia: 'mensal', valor: 2400, data: '2026-01-05', descricao: 'Fixos' }),
    criarTransacao({ id: 'v', valor: 300, data: '2026-09-10', descricao: 'Gastos' }),
  ];
  const estimativa = estimarGastosFuturos(apertado, MES_ATUAL);
  const avaliarApertado = criarAvaliador(apertado, metaMesQueVem);

  expect(calcularCorteNecessarioEmPercentual(avaliarApertado, estimativa)).toBeNull();
  expect(explicarSemSolucao(avaliarApertado, estimativa)).toBe('fixos');
});

test('meta que começa NESTE mês: o gasto real do mês já aconteceu, cortar o resto não resolve — motivo "mes-atual"', () => {
  const avaliarEsteMes = criarAvaliador(transacoesReais, meta);

  expect(avaliarEsteMes(estimativaReal).viavel).toBe(false);
  expect(calcularCorteNecessarioEmPercentual(avaliarEsteMes, estimativaReal)).toBeNull();
  expect(explicarSemSolucao(avaliarEsteMes, estimativaReal)).toBe('mes-atual');
});

test('sem gasto do dia a dia pra cortar e não viável: null (não há o que reduzir)', () => {
  const semDiaADia: Transacao[] = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'mensal', valor: 2000, data: '2026-01-05', descricao: 'Salário' }),
    criarTransacao({ id: 'f', frequencia: 'mensal', valor: 1800, data: '2026-01-05', descricao: 'Fixos' }),
  ];
  const estimativa = estimarGastosFuturos(semDiaADia, MES_ATUAL);
  const avaliarSem = criarAvaliador(semDiaADia, metaMesQueVem);

  expect(avaliarSem(estimativa).viavel).toBe(false);
  expect(calcularCorteNecessarioEmPercentual(avaliarSem, estimativa)).toBeNull();
});

test('montarAvisoDeFolga: viável no esperado mas não com 20% a mais → aviso calmo com o mês', () => {
  // Renda 5000, fixos 2000, dia a dia 2000, meta 800/mês por 3 meses: sobra 200/mês no esperado.
  const t: Transacao[] = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'mensal', valor: 5000, data: '2026-01-05', descricao: 'Salário' }),
    criarTransacao({ id: 'f', frequencia: 'mensal', valor: 2000, data: '2026-01-05', descricao: 'Fixos' }),
    criarTransacao({ id: 'v', valor: 2000, data: '2026-09-10', descricao: 'Gastos' }),
  ];
  const estimativa = estimarGastosFuturos(t, MES_ATUAL);
  // Dia 21 (não dia 1): salário/fixos caem no dia 5 — começar a meta no
  // dia 1 debitaria ANTES do salário chegar, um risco de timing à parte
  // que não é o que este teste quer exercitar (ver CASO REAL em
  // projecao.test.ts pro cenário em que isso é o ponto).
  const meta3: Simulacao = { ...meta, valorTotal: 2400, parcelas: 3, dataInicio: '2026-10-21' };
  const av = criarAvaliador(t, meta3);

  const esperado = av(estimativa);
  const pesado = av(ajustarGastoDoDiaADia(estimativa, FATOR_IMPREVISTOS));

  expect(esperado.viavel).toBe(true);
  expect(pesado.viavel).toBe(false);
  const aviso = montarAvisoDeFolga(esperado, pesado)!;
  expect(aviso).toMatch(/20%/);
  expect(aviso).toContain(formatarMesBr(pesado.piorMes));
  // ...no formato brasileiro (MM/AAAA), não no ISO.
  expect(aviso).not.toContain(pesado.piorMes);
  expect(temFaixaDeCenarios(esperado, pesado)).toBe(true);
});

test('montarAvisoDeFolga: sem aviso quando os dois cenários cabem, ou quando o esperado já não cabe', () => {
  const ok = { viavel: true, meses: [], piorMes: '', piorSaldo: 0 };
  const ruim = { viavel: false, meses: [], piorMes: '2026-10', piorSaldo: -10 };
  expect(montarAvisoDeFolga(ok, ok)).toBeNull();
  expect(montarAvisoDeFolga(ruim, ruim)).toBeNull();
});

test('temFaixaDeCenarios: sem gasto do dia a dia os dois cenários são idênticos, não desenha faixa', () => {
  const sem = { ...estimativaReal, gastoVariavelMensal: 0, recorrentesNaPratica: [] };
  const a = avaliar(sem);
  const b = avaliar(ajustarGastoDoDiaADia(sem, FATOR_IMPREVISTOS));
  expect(temFaixaDeCenarios(a, b)).toBe(false);
});

test('descreverEseSe: cada situação tem uma frase calma e com números', () => {
  const ok = { viavel: true, meses: [], piorMes: '', piorSaldo: 0 };
  const ruim = { viavel: false, meses: [], piorMes: '2027-03', piorSaldo: -500 };

  // Sem mudar nada, já cabe.
  expect(descreverEseSe({ reducaoPct: 0, corteNecessario: 0, gastoDoDiaADia: 2790, esperado: ok })).toMatch(/já cabe/);
  // Sem mudar nada, não cabe: diz quanto cortar.
  const sugestao = descreverEseSe({ reducaoPct: 0, corteNecessario: 5, gastoDoDiaADia: 2790, esperado: ruim });
  expect(sugestao).toMatch(/5%/);
  // O valor em R$ exato mora no veredito; aqui só o percentual (dois números
  // diferentes na mesma tela confundiriam).
  expect(sugestao).not.toMatch(/R\$/);
  // Com um corte escolhido, o valor economizado aparece.
  expect(
    descreverEseSe({ reducaoPct: 10, corteNecessario: 5, gastoDoDiaADia: 2790, esperado: ok }).replace(/\s/g, ' '),
  ).toContain('R$ 279,00');
  // Só cortar o dia a dia não resolve.
  expect(descreverEseSe({ reducaoPct: 0, corteNecessario: null, gastoDoDiaADia: 2790, esperado: ruim })).toMatch(/não basta/);
  // ...ou o mês atual já fechou no negativo.
  expect(
    descreverEseSe({ reducaoPct: 0, corteNecessario: null, motivoSemSolucao: 'mes-atual', gastoDoDiaADia: 2790, esperado: ruim }),
  ).toMatch(/mês que vem/);
  // Com um corte escolhido: cabe / não cabe ainda.
  expect(descreverEseSe({ reducaoPct: 10, corteNecessario: 5, gastoDoDiaADia: 2790, esperado: ok })).toMatch(/10% a menos.*cabe/);
  const ainda = descreverEseSe({ reducaoPct: 2, corteNecessario: 5, gastoDoDiaADia: 2790, esperado: ruim });
  expect(ainda).toMatch(/ainda/);
  expect(ainda).toContain('03/2027');
  expect(ainda).not.toContain('2027-03');
});

test('sugestaoParaMetaDeGuardar: cortar resolve → valor exato por mês (o mesmo do Dashboard) e oferece o botão', () => {
  const base = avaliar(estimativaReal);
  const r = sugestaoParaMetaDeGuardar({ base, corteNecessario: 5, motivoSemSolucao: 'fixos' });

  expect(r.reducaoMensal).toBeCloseTo(123.4, 2);
  expect(r.texto.replace(/\s/g, ' ')).toContain('R$ 123,40');
  expect(r.texto).toMatch(/gastar menos/);
});

test('sugestaoParaMetaDeGuardar: mês atual já fechou negativo → sugere começar no mês que vem, sem botão', () => {
  const base = avaliar(estimativaReal);
  const r = sugestaoParaMetaDeGuardar({ base, corteNecessario: null, motivoSemSolucao: 'mes-atual' });

  expect(r.reducaoMensal).toBe(0);
  expect(r.texto).toMatch(/mês que vem/);
});

test('sugestaoParaMetaDeGuardar: nem cortando tudo cabe → fala das despesas fixas; plural concorda', () => {
  const base = avaliar(estimativaReal);
  const singular = sugestaoParaMetaDeGuardar({ base, corteNecessario: null, motivoSemSolucao: 'fixos' });
  const plural = sugestaoParaMetaDeGuardar({ base, corteNecessario: null, motivoSemSolucao: 'fixos', plural: true });

  expect(singular.texto).toMatch(/ela cabe/);
  expect(plural.texto).toMatch(/elas cabe/);
  expect(singular.reducaoMensal).toBe(0);
});

// --- "E se" por categoria (fase 3 do motor de projeção) ---
// Mesmo cenário real de cima, só que o gasto do mês (2790) chega repartido em
// duas categorias — pra poder testar que cortar UMA categoria deixa a outra
// intocada, e que o corte necessário É diferente pra cada uma.
const transacoesPorCategoria: Transacao[] = [
  criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'mensal', valor: 5760, data: '2026-09-05', descricao: 'Salários' }),
  criarTransacao({ id: 'f1', frequencia: 'mensal', valor: 2593.4, data: '2026-01-10', descricao: 'Fixos' }),
  criarTransacao({ id: 'v1', valor: 2000, data: '2026-09-10', categoriaId: 'mercado', descricao: 'Mercado' }),
  criarTransacao({ id: 'v2', valor: 790, data: '2026-09-12', categoriaId: 'lazer', descricao: 'Lazer' }),
];
const estimativaPorCategoria = estimarGastosFuturos(transacoesPorCategoria, MES_ATUAL);
const avaliarPorCategoria = criarAvaliador(transacoesPorCategoria, metaMesQueVem);

test('listarItensDoDiaADiaPorCategoria: uma entrada por categoria, maior primeiro', () => {
  expect(listarItensDoDiaADiaPorCategoria(estimativaPorCategoria)).toEqual([
    { categoriaId: 'mercado', valorMensal: 2000 },
    { categoriaId: 'lazer', valorMensal: 790 },
  ]);
});

test('listarItensDoDiaADiaPorCategoria: junta a fatia variável com a recorrente na prática da MESMA categoria', () => {
  const transacoes: Transacao[] = [
    criarTransacao({ id: 'a', valor: 140, data: '2026-08-10', categoriaId: 'cartao', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'b', valor: 160, data: '2026-09-10', categoriaId: 'cartao', descricao: 'Cartão Nubank' }),
    criarTransacao({ id: 'c', valor: 300, data: '2026-09-05', categoriaId: 'cartao', descricao: 'Outra compra no cartão' }),
  ];
  const estimativa = estimarGastosFuturos(transacoes, MES_ATUAL);
  // 150 = média(140, 160), a recorrente "Cartão Nubank"; 300 é a compra avulsa
  // comum (nome diferente, não vira recorrente) — as duas são categoria 'cartao'.
  expect(listarItensDoDiaADiaPorCategoria(estimativa)).toEqual([{ categoriaId: 'cartao', valorMensal: 450 }]);
});

test('totalDaCategoriaNoDiaADia: valor da categoria, 0 pra categoria sem gasto nenhum', () => {
  expect(totalDaCategoriaNoDiaADia(estimativaPorCategoria, 'mercado')).toBe(2000);
  expect(totalDaCategoriaNoDiaADia(estimativaPorCategoria, 'transporte')).toBe(0);
});

test('ajustarGastoDeCategoria: corta só a fatia da categoria escolhida; a outra fica intocada', () => {
  const cortada = ajustarGastoDeCategoria(estimativaPorCategoria, 'mercado', 0.5); // -50% só no mercado

  const itemMercado = cortada.gastoVariavelPorCategoria.find((i) => i.categoriaId === 'mercado')!;
  const itemLazer = cortada.gastoVariavelPorCategoria.find((i) => i.categoriaId === 'lazer')!;
  expect(itemMercado.valorMensal).toBeCloseTo(1000);
  expect(itemLazer.valorMensal).toBeCloseTo(790);
  expect(cortada.gastoVariavelMensal).toBeCloseTo(2790 - 1000);
  // Não muta a original.
  expect(estimativaPorCategoria.gastoVariavelMensal).toBe(2790);
});

test('ajustarGastoDeCategoria: categoria sem gasto nenhum não muda nada (nada pra cortar)', () => {
  const igual = ajustarGastoDeCategoria(estimativaPorCategoria, 'transporte', 0);
  expect(igual.gastoVariavelMensal).toBe(2790);
  expect(igual.gastoVariavelPorCategoria).toEqual(estimativaPorCategoria.gastoVariavelPorCategoria);
});

test('calcularCorteNecessarioEmCategoria: já viável é 0; categoria sem gasto e não viável é null', () => {
  const folgadas = [
    ...transacoesPorCategoria.slice(0, 2),
    criarTransacao({ id: 'v', valor: 300, data: '2026-09-10', categoriaId: 'mercado', descricao: 'Poucos gastos' }),
  ];
  const est = estimarGastosFuturos(folgadas, MES_ATUAL);
  expect(calcularCorteNecessarioEmCategoria(criarAvaliador(folgadas, metaMesQueVem), est, 'mercado')).toBe(0);

  expect(calcularCorteNecessarioEmCategoria(avaliarPorCategoria, estimativaPorCategoria, 'transporte')).toBeNull();
});

test('calcularCorteNecessarioEmCategoria: o corte sugerido em CADA categoria de fato resolve sozinho (1% a menos não resolveria)', () => {
  for (const categoriaId of ['mercado', 'lazer']) {
    const corte = calcularCorteNecessarioEmCategoria(avaliarPorCategoria, estimativaPorCategoria, categoriaId)!;
    expect(corte).not.toBeNull();
    expect(
      avaliarPorCategoria(ajustarGastoDeCategoria(estimativaPorCategoria, categoriaId, 1 - corte / 100)).viavel,
    ).toBe(true);
    expect(
      avaliarPorCategoria(ajustarGastoDeCategoria(estimativaPorCategoria, categoriaId, 1 - (corte - 1) / 100)).viavel,
    ).toBe(false);
  }
});

test('calcularCorteNecessarioEmCategoria: categoria que é 100% do dia a dia dá o MESMO corte que o corte geral', () => {
  // No cenário real original, a única avulsa (2790) é toda da categoria 'c'.
  expect(estimativaReal.gastoVariavelPorCategoria).toEqual([{ categoriaId: 'c', valorMensal: 2790 }]);
  expect(calcularCorteNecessarioEmCategoria(avaliar, estimativaReal, 'c')).toBe(
    calcularCorteNecessarioEmPercentual(avaliar, estimativaReal),
  );
});

test('explicarSemSolucaoNaCategoria: mês atual já com o gasto real lançado — zerar uma categoria futura não muda isso', () => {
  const avaliarEsteMes = criarAvaliador(transacoesPorCategoria, meta); // meta começa NESTE mês
  expect(explicarSemSolucaoNaCategoria(avaliarEsteMes, estimativaPorCategoria, 'mercado')).toBe('mes-atual');
});

test('descreverEseSe: com nomeCategoria, o texto cita a categoria em vez do "dia a dia" genérico', () => {
  const ok = { viavel: true, meses: [], piorMes: '', piorSaldo: 0 };
  const ruim = { viavel: false, meses: [], piorMes: '2027-03', piorSaldo: -500 };

  expect(
    descreverEseSe({ reducaoPct: 0, corteNecessario: 5, gastoDoDiaADia: 790, esperado: ruim, nomeCategoria: 'Lazer' }),
  ).toMatch(/do gasto em Lazer/);
  expect(
    descreverEseSe({ reducaoPct: 10, corteNecessario: 5, gastoDoDiaADia: 790, esperado: ok, nomeCategoria: 'Lazer' }),
  ).toMatch(/10% a menos em Lazer/);
  expect(
    descreverEseSe({ reducaoPct: 0, corteNecessario: null, gastoDoDiaADia: 790, esperado: ruim, nomeCategoria: 'Lazer' }),
  ).toMatch(/gasto em Lazer não basta/);
  // Sem nomeCategoria, o texto continua exatamente como antes.
  expect(descreverEseSe({ reducaoPct: 10, corteNecessario: 5, gastoDoDiaADia: 2790, esperado: ok })).toMatch(
    /10% a menos no dia a dia/,
  );
});

// --- calcularCenarios: o que NÃO pode depender do foco do "e se" ---
test('calcularCenarios: corte geral e motivo (base da sugestão "gaste menos" e do botão Rever gastos) não mudam com o foco', () => {
  const geral = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 0, { tipo: 'geral' });
  expect(geral.corteNecessario).toBe(5);
  for (const categoriaId of ['mercado', 'lazer', 'transporte']) {
    const c = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 0, { tipo: 'categoria', categoriaId });
    expect(c.corteNecessario).toBe(geral.corteNecessario);
    expect(c.motivoSemSolucao).toBe(geral.motivoSemSolucao);
    expect(c.base).toEqual(geral.base);
  }
});

test('calcularCenarios: corteNoFoco é o da categoria em foco (e o geral quando o foco é "Tudo")', () => {
  const geral = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 0, { tipo: 'geral' });
  expect(geral.corteNoFoco).toBe(geral.corteNecessario);
  const lazer = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 0, { tipo: 'categoria', categoriaId: 'lazer' });
  expect(lazer.corteNoFoco).toBe(calcularCorteNecessarioEmCategoria(avaliarPorCategoria, estimativaPorCategoria, 'lazer'));
  expect(lazer.corteNoFoco).not.toBe(lazer.corteNecessario);
});

test('calcularCenarios: o "pesado" é sempre +20% no dia a dia INTEIRO (em cima do corte escolhido), qualquer que seja o foco', () => {
  const foco = { tipo: 'categoria', categoriaId: 'lazer' } as const;
  const c = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 10, foco);
  const esperadaEstimativa = ajustarGastoDeCategoria(estimativaPorCategoria, 'lazer', 0.9);
  expect(arredondar(c.esperado)).toEqual(arredondar(avaliarPorCategoria(esperadaEstimativa)));
  expect(arredondar(c.pesado)).toEqual(arredondar(avaliarPorCategoria(ajustarGastoDoDiaADia(esperadaEstimativa, FATOR_IMPREVISTOS))));

  // Com foco geral, igual ao comportamento de antes da fase 3 fechar (fator * 1.2).
  const g = calcularCenarios(estimativaPorCategoria, avaliarPorCategoria, 10, { tipo: 'geral' });
  expect(arredondar(g.pesado)).toEqual(arredondar(avaliarPorCategoria(ajustarGastoDoDiaADia(estimativaPorCategoria, 0.9 * FATOR_IMPREVISTOS))));
});

test('categoria pequena demais pra resolver sozinha: não culpa as despesas fixas — diz que é só uma parte do dia a dia', () => {
  const comCafe = [
    ...transacoesPorCategoria,
    criarTransacao({ id: 'v3', valor: 20, data: '2026-09-13', categoriaId: 'cafe', descricao: 'Café' }),
  ];
  const est = estimarGastosFuturos(comCafe, MES_ATUAL);
  const av = criarAvaliador(comCafe, metaMesQueVem);
  const c = calcularCenarios(est, av, 0, { tipo: 'categoria', categoriaId: 'cafe' });

  expect(c.corteNoFoco).toBeNull();
  expect(c.corteNecessario).not.toBeNull();
  const texto = descreverEseSe({
    reducaoPct: 0, corteNecessario: c.corteNoFoco, motivoSemSolucao: c.motivoNoFoco, gastoDoDiaADia: 20,
    esperado: c.esperado, nomeCategoria: 'Café', corteGeral: c.corteNecessario,
  });
  expect(texto).toMatch(/só uma parte do seu dia a dia/);
  expect(texto).not.toMatch(/despesas fixas/);
  // Se nem o corte geral resolve, aí sim são as despesas fixas.
  expect(
    descreverEseSe({ reducaoPct: 0, corteNecessario: null, motivoSemSolucao: 'fixos', gastoDoDiaADia: 20, esperado: c.esperado, nomeCategoria: 'Café', corteGeral: null }),
  ).toMatch(/despesas fixas/);
});

test('descreverOndeCorta: "no dia a dia" no geral, "em <categoria>" com foco', () => {
  expect(descreverOndeCorta()).toBe('no dia a dia');
  expect(descreverOndeCorta('Lazer')).toBe('em Lazer');
});
