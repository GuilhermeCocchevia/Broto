import { avaliarConquistasElegiveis, CONQUISTAS } from './conquistas';
import type { Simulacao, Transacao } from '../types/models';

const MES_ATUAL = '2026-09';

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

function criarSimulacao(sobrescrever: Partial<Simulacao>): Simulacao {
  return {
    id: 's',
    descricao: 'Simulação',
    tipo: 'compra',
    valorTotal: 300,
    parcelas: 3,
    dataInicio: '2026-09-01',
    categoriaId: 'c',
    taxaJurosMensal: 0,
    aporteInicial: 0,
    criadoEm: '2026-09-01T00:00:00.000Z',
    ...sobrescrever,
  };
}

test('sem nenhum dado, nenhuma conquista', () => {
  expect(avaliarConquistasElegiveis([], [], MES_ATUAL)).toEqual([]);
});

test('primeiro-lancamento: qualquer transação já basta', () => {
  expect(avaliarConquistasElegiveis([criarTransacao({})], [], MES_ATUAL)).toContain('primeiro-lancamento');
});

test('primeira-simulacao: qualquer simulação já basta', () => {
  expect(avaliarConquistasElegiveis([], [criarSimulacao({})], MES_ATUAL)).toContain('primeira-simulacao');
});

test('mes-completo: precisa de receita E despesa no MESMO mês', () => {
  const soDespesa = [criarTransacao({ tipo: 'despesa', data: '2026-08-10' })];
  expect(avaliarConquistasElegiveis(soDespesa, [], MES_ATUAL)).not.toContain('mes-completo');

  const mesesDiferentes = [
    criarTransacao({ id: 'r', tipo: 'receita', data: '2026-07-05' }),
    criarTransacao({ id: 'd', tipo: 'despesa', data: '2026-08-10' }),
  ];
  expect(avaliarConquistasElegiveis(mesesDiferentes, [], MES_ATUAL)).not.toContain('mes-completo');

  const mesmoMes = [
    criarTransacao({ id: 'r', tipo: 'receita', data: '2026-08-05' }),
    criarTransacao({ id: 'd', tipo: 'despesa', data: '2026-08-10' }),
  ];
  expect(avaliarConquistasElegiveis(mesmoMes, [], MES_ATUAL)).toContain('mes-completo');
});

test('mes-completo: uma despesa mensal recorrente conta pro mês em que ela se aplica', () => {
  const transacoes = [
    criarTransacao({ id: 'r', tipo: 'receita', frequencia: 'unica', data: '2026-08-05' }),
    criarTransacao({ id: 'f', tipo: 'despesa', frequencia: 'mensal', data: '2026-01-10' }),
  ];
  expect(avaliarConquistasElegiveis(transacoes, [], MES_ATUAL)).toContain('mes-completo');
});

test('habito-formado: precisa de despesa AVULSA em 3 meses diferentes (fixa não conta)', () => {
  const soFixa = [criarTransacao({ frequencia: 'mensal', data: '2026-01-10' })];
  expect(avaliarConquistasElegiveis(soFixa, [], MES_ATUAL)).not.toContain('habito-formado');

  const doisMeses = [
    criarTransacao({ id: 'a', data: '2026-07-10' }),
    criarTransacao({ id: 'b', data: '2026-08-10' }),
  ];
  expect(avaliarConquistasElegiveis(doisMeses, [], MES_ATUAL)).not.toContain('habito-formado');

  const tresMeses = [
    criarTransacao({ id: 'a', data: '2026-07-10' }),
    criarTransacao({ id: 'b', data: '2026-08-10' }),
    criarTransacao({ id: 'c', data: '2026-09-10' }),
  ];
  expect(avaliarConquistasElegiveis(tresMeses, [], MES_ATUAL)).toContain('habito-formado');
});

test('habito-formado: duas despesas avulsas no MESMO mês contam como 1 mês só', () => {
  const transacoes = [
    criarTransacao({ id: 'a', data: '2026-09-05' }),
    criarTransacao({ id: 'b', data: '2026-09-20' }),
  ];
  expect(avaliarConquistasElegiveis(transacoes, [], MES_ATUAL)).not.toContain('habito-formado');
});

test('tres-meses-no-azul: os 3 meses fechados antes do atual precisam ter taxa de poupança positiva', () => {
  const receita = (mes: string, valor: number) =>
    criarTransacao({ id: `r-${mes}`, tipo: 'receita', frequencia: 'unica', data: `${mes}-05`, valor });
  const despesa = (mes: string, valor: number) =>
    criarTransacao({ id: `d-${mes}`, tipo: 'despesa', frequencia: 'unica', data: `${mes}-10`, valor });

  const positivo = ['2026-06', '2026-07', '2026-08'].flatMap((mes) => [receita(mes, 1000), despesa(mes, 500)]);
  expect(avaliarConquistasElegiveis(positivo, [], MES_ATUAL)).toContain('tres-meses-no-azul');

  // Um dos 3 meses gastou mais do que ganhou.
  const umNegativo = ['2026-06', '2026-07', '2026-08'].flatMap((mes, i) => [
    receita(mes, 1000),
    despesa(mes, i === 1 ? 1500 : 500),
  ]);
  expect(avaliarConquistasElegiveis(umNegativo, [], MES_ATUAL)).not.toContain('tres-meses-no-azul');
});

test('tres-meses-no-azul: um mês sem NENHUM lançamento no meio da janela não conta como neutro — reprova', () => {
  // Julho fica vazio (sem receita nenhuma, taxa de poupança = 0, não positiva).
  const transacoes = [
    criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'unica', data: '2026-06-05', valor: 1000 }),
    criarTransacao({ id: 'd1', tipo: 'despesa', frequencia: 'unica', data: '2026-06-10', valor: 500 }),
    criarTransacao({ id: 'r2', tipo: 'receita', frequencia: 'unica', data: '2026-08-05', valor: 1000 }),
    criarTransacao({ id: 'd2', tipo: 'despesa', frequencia: 'unica', data: '2026-08-10', valor: 500 }),
  ];
  expect(avaliarConquistasElegiveis(transacoes, [], MES_ATUAL)).not.toContain('tres-meses-no-azul');
});

test('projecao-confiavel: precisa de despesa avulsa em pelo menos 3 dos últimos 4 meses (confiança "boa" do estimador)', () => {
  const doisMeses = [
    criarTransacao({ id: 'a', data: '2026-08-10' }),
    criarTransacao({ id: 'b', data: '2026-09-10' }),
  ];
  expect(avaliarConquistasElegiveis(doisMeses, [], MES_ATUAL)).not.toContain('projecao-confiavel');

  const tresMeses = [
    criarTransacao({ id: 'a', data: '2026-07-10' }),
    criarTransacao({ id: 'b', data: '2026-08-10' }),
    criarTransacao({ id: 'c', data: '2026-09-10' }),
  ];
  expect(avaliarConquistasElegiveis(tresMeses, [], MES_ATUAL)).toContain('projecao-confiavel');
});

test('projecao-confiavel: diferente de habito-formado — 3 meses antigos (fora da janela do estimador) não bastam', () => {
  // habito-formado olha a vida inteira; a confiança do estimador só olha o
  // mês atual + os 3 fechados anteriores (ver estimarGastosFuturos).
  const tresMesesAntigos = [
    criarTransacao({ id: 'a', data: '2026-01-10' }),
    criarTransacao({ id: 'b', data: '2026-02-10' }),
    criarTransacao({ id: 'c', data: '2026-03-10' }),
  ];
  const elegiveis = avaliarConquistasElegiveis(tresMesesAntigos, [], MES_ATUAL);
  expect(elegiveis).toContain('habito-formado');
  expect(elegiveis).not.toContain('projecao-confiavel');
});

test('cenário completo com dados reais do usuário: todas as conquistas "de dados" batem', () => {
  const transacoes: Transacao[] = [
    // Receita fixa desde junho: os 3 meses fechados checados por
    // "tres-meses-no-azul" são jun/jul/ago — precisam ter receita própria.
    criarTransacao({ id: 'r1', tipo: 'receita', frequencia: 'mensal', valor: 5760, data: '2026-06-05' }),
    criarTransacao({ id: 'f1', tipo: 'despesa', frequencia: 'mensal', valor: 2593.4, data: '2026-01-10' }),
    criarTransacao({ id: 'v1', tipo: 'despesa', frequencia: 'unica', valor: 500, data: '2026-07-10' }),
    criarTransacao({ id: 'v2', tipo: 'despesa', frequencia: 'unica', valor: 500, data: '2026-08-10' }),
    criarTransacao({ id: 'v3', tipo: 'despesa', frequencia: 'unica', valor: 2790, data: '2026-09-10' }),
  ];
  const elegiveis = avaliarConquistasElegiveis(transacoes, [criarSimulacao({})], MES_ATUAL);
  // Despesas avulsas em jul/ago/set (3 dos últimos 4 meses) também fecham a
  // confiança do estimador em 'boa' — ver 'projecao-confiavel'.
  expect(elegiveis.sort()).toEqual(
    [
      'primeiro-lancamento',
      'primeira-simulacao',
      'mes-completo',
      'habito-formado',
      'tres-meses-no-azul',
      'projecao-confiavel',
    ].sort(),
  );
});

test('CONQUISTAS: uma entrada no catálogo pra cada chave possível, sem duplicata', () => {
  const chaves = CONQUISTAS.map((c) => c.chave);
  expect(new Set(chaves).size).toBe(chaves.length);
  expect(chaves).toEqual(
    expect.arrayContaining([
      'primeiro-lancamento',
      'primeira-simulacao',
      'mes-completo',
      'habito-formado',
      'tres-meses-no-azul',
      'projecao-confiavel',
    ]),
  );
});
