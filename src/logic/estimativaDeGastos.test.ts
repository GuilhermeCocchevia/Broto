import { estimarGastosFuturos } from './estimativaDeGastos';
import type { Transacao } from '../types/models';

const MES_ATUAL = '2026-09';

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

test('sem nenhum lançamento: estimativa zero, sem dados', () => {
  const r = estimarGastosFuturos([], MES_ATUAL);
  expect(r.gastoVariavelMensal).toBe(0);
  expect(r.recorrentesNaPratica).toEqual([]);
  expect(r.mesesComDado).toBe(0);
  expect(r.confianca).toBe('sem-dados');
});

test('só o mês atual tem avulsas: o gasto variável é o total dele (piso), confiança baixa', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 1000, data: '2026-09-02', descricao: 'Mercado' }),
      criarTransacao({ id: 'b', valor: 500, data: '2026-09-12', descricao: 'Farmácia' }),
    ],
    MES_ATUAL,
  );
  expect(r.gastoVariavelMensal).toBe(1500);
  expect(r.mesesComDado).toBe(1);
  expect(r.confianca).toBe('baixa');
});

test('com meses fechados: usa a média deles, mas nunca abaixo do mês atual (parcial)', () => {
  const fechados = [
    criarTransacao({ id: 'a', valor: 3000, data: '2026-08-05', descricao: 'Mercado ago' }),
    criarTransacao({ id: 'b', valor: 2000, data: '2026-07-05', descricao: 'Mercado jul' }),
  ];
  // Média dos fechados = 2500. Mês atual parcial (1000) fica abaixo → vale a média.
  const parcial = estimarGastosFuturos(
    [...fechados, criarTransacao({ id: 'c', valor: 1000, data: '2026-09-03', descricao: 'Mercado set' })],
    MES_ATUAL,
  );
  expect(parcial.gastoVariavelMensal).toBe(2500);
  // Mês atual já passou da média → vale o que já foi gasto.
  const estourou = estimarGastosFuturos(
    [...fechados, criarTransacao({ id: 'c', valor: 2800, data: '2026-09-03', descricao: 'Mercado set' })],
    MES_ATUAL,
  );
  expect(estourou.gastoVariavelMensal).toBe(2800);
});

test('mês fechado SEM lançamento não puxa a média pra baixo (app novo, histórico vazio)', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 3000, data: '2026-08-05', descricao: 'Compra ago' }),
      criarTransacao({ id: 'b', valor: 1000, data: '2026-06-05', descricao: 'Compra jun' }),
    ],
    MES_ATUAL,
  );
  // jul está vazio e é ignorado: média(3000, 1000) = 2000, não 1333.
  expect(r.gastoVariavelMensal).toBe(2000);
});

test('ignora avulsas de mais de 3 meses atrás e as datadas depois do mês atual', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'antiga', valor: 9999, data: '2026-05-10', descricao: 'Antiga' }),
      criarTransacao({ id: 'futura', valor: 8888, data: '2026-10-10', descricao: 'Futura' }),
      criarTransacao({ id: 'atual', valor: 700, data: '2026-09-10', descricao: 'Atual' }),
    ],
    MES_ATUAL,
  );
  expect(r.gastoVariavelMensal).toBe(700);
});

test('receitas e despesas mensais não entram no gasto variável', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', tipo: 'receita', valor: 5000, data: '2026-09-05' }),
      criarTransacao({ id: 'b', frequencia: 'mensal', valor: 1800, data: '2026-01-05', descricao: 'Aluguel' }),
    ],
    MES_ATUAL,
  );
  expect(r.gastoVariavelMensal).toBe(0);
  expect(r.confianca).toBe('sem-dados');
});

test('mesma despesa avulsa em 2 meses seguidos é "recorrente na prática" (valor médio) e sai do variável', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 140, data: '2026-08-10', descricao: 'Cartão Nubank' }),
      criarTransacao({ id: 'b', valor: 160, data: '2026-09-10', descricao: 'Cartão Nubank' }),
      criarTransacao({ id: 'c', valor: 500, data: '2026-09-03', descricao: 'Mercado' }),
    ],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toHaveLength(1);
  expect(r.recorrentesNaPratica[0]).toMatchObject({ descricao: 'Cartão Nubank', valorMensal: 150 });
  // Só o mercado é "variável de verdade": 500. O cartão não conta 2x.
  expect(r.gastoVariavelMensal).toBe(500);
});

test('recorrência na prática ignora acento e caixa na descrição', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 300, data: '2026-08-10', descricao: 'Cartão Itaú' }),
      criarTransacao({ id: 'b', valor: 300, data: '2026-09-10', descricao: 'cartao itau' }),
    ],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toHaveLength(1);
  expect(r.recorrentesNaPratica[0].valorMensal).toBe(300);
});

test('a mesma despesa 2x no MESMO mês soma nesse mês (não vira "2 meses")', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 100, data: '2026-09-05', descricao: 'Cartão Caixa' }),
      criarTransacao({ id: 'b', valor: 100, data: '2026-09-15', descricao: 'Cartão Caixa' }),
    ],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toEqual([]);
  expect(r.gastoVariavelMensal).toBe(200);
});

test('avulsa que só aconteceu uma vez não é recorrente', () => {
  const r = estimarGastosFuturos(
    [criarTransacao({ id: 'a', valor: 900, data: '2026-08-10', descricao: 'Conserto do carro' })],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toEqual([]);
});

test('avulsa repetida que parou há 2+ meses não é mais considerada recorrente', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'a', valor: 200, data: '2026-06-10', descricao: 'Curso' }),
      criarTransacao({ id: 'b', valor: 200, data: '2026-07-10', descricao: 'Curso' }),
    ],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toEqual([]);
});

test('se já existe uma despesa MENSAL com o mesmo nome, não duplica como recorrente na prática', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: 'm', frequencia: 'mensal', valor: 119, data: '2026-01-15', descricao: 'Luz' }),
      criarTransacao({ id: 'a', valor: 119, data: '2026-08-15', descricao: 'Luz' }),
      criarTransacao({ id: 'b', valor: 119, data: '2026-09-15', descricao: 'Luz' }),
    ],
    MES_ATUAL,
  );
  expect(r.recorrentesNaPratica).toEqual([]);
});

test('confiança sobe com o número de meses com lançamento: baixa, média, boa', () => {
  const t = (id: string, data: string) => criarTransacao({ id, data, descricao: `Compra ${id}`, valor: 100 });
  expect(estimarGastosFuturos([t('a', '2026-09-01')], MES_ATUAL).confianca).toBe('baixa');
  expect(estimarGastosFuturos([t('a', '2026-09-01'), t('b', '2026-08-01')], MES_ATUAL).confianca).toBe('media');
  expect(
    estimarGastosFuturos([t('a', '2026-09-01'), t('b', '2026-08-01'), t('c', '2026-07-01')], MES_ATUAL)
      .confianca,
  ).toBe('boa');
});

test('caso real: 6 avulsas de setembro (4 cartões) e nada antes → variável = total de setembro', () => {
  const r = estimarGastosFuturos(
    [
      criarTransacao({ id: '1', valor: 1320, data: '2026-09-10', descricao: 'Cartao Mercado Pago' }),
      criarTransacao({ id: '2', valor: 922, data: '2026-09-10', descricao: 'Cartao Caixa' }),
      criarTransacao({ id: '3', valor: 300, data: '2026-09-10', descricao: 'Cartao Itau' }),
      criarTransacao({ id: '4', valor: 140, data: '2026-09-10', descricao: 'Cartao Nubank' }),
      criarTransacao({ id: '5', valor: 54, data: '2026-09-10', descricao: 'Aki Tem' }),
      criarTransacao({ id: '6', valor: 54, data: '2026-09-10', descricao: 'Maravilhas do Lar' }),
    ],
    MES_ATUAL,
  );
  expect(r.gastoVariavelMensal).toBe(2790);
  expect(r.confianca).toBe('baixa');
});
