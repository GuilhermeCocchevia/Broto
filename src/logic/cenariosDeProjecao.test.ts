import {
  ajustarGastoDoDiaADia,
  calcularCorteNecessarioEmPercentual,
  descreverEseSe,
  explicarSemSolucao,
  FATOR_IMPREVISTOS,
  montarAvisoDeFolga,
  sugestaoParaMetaDeGuardar,
  temFaixaDeCenarios,
  type Avaliador,
} from './cenariosDeProjecao';
import { avaliarViabilidadeSimulacao } from './projecao';
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
function criarAvaliador(transacoes: Transacao[], simulacao: Simulacao): Avaliador {
  return (estimativa) => avaliarViabilidadeSimulacao(simulacao, transacoes, 0, 0, estimativa);
}
// A mesma meta começando no mês que vem (o cenário em que cortar gasto funciona).
const metaMesQueVem: Simulacao = { ...meta, dataInicio: '2026-10-01' };
const avaliar = criarAvaliador(transacoesReais, metaMesQueVem);

test('ajustarGastoDoDiaADia escala o variável E as recorrentes na prática, sem mexer no resto', () => {
  const estimativa: EstimativaDeGastos = {
    mesAtual: MES_ATUAL,
    gastoVariavelMensal: 1000,
    recorrentesNaPratica: [{ chave: 'cartao', descricao: 'Cartão', valorMensal: 200 }],
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
  const meta3: Simulacao = { ...meta, valorTotal: 2400, parcelas: 3, dataInicio: '2026-10-01' };
  const av = criarAvaliador(t, meta3);

  const esperado = av(estimativa);
  const pesado = av(ajustarGastoDoDiaADia(estimativa, FATOR_IMPREVISTOS));

  expect(esperado.viavel).toBe(true);
  expect(pesado.viavel).toBe(false);
  const aviso = montarAvisoDeFolga(esperado, pesado)!;
  expect(aviso).toMatch(/20%/);
  expect(aviso).toContain(pesado.piorMes);
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
  expect(ainda).toContain('2027-03');
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
