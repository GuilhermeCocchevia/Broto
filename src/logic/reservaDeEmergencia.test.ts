import {
  obterMetaAtual,
  calcularDespesaMediaMensal,
  calcularMesesDeReservaCobertos,
  taxaDePoupancaPositivaPorMesesSeguidos,
} from './reservaDeEmergencia';
import type { MetaReserva, Transacao } from '../types/models';

function criarMeta(sobrescrever: Partial<MetaReserva>): MetaReserva {
  return { id: 'meta-teste', ativa: false, valorAlvo: null, criadoEm: '2026-09-01T00:00:00.000Z', ...sobrescrever };
}

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

test('obterMetaAtual devolve null quando o usuário nunca foi perguntado', () => {
  expect(obterMetaAtual([])).toBeNull();
});

test('obterMetaAtual pega a decisão mais recente (nunca soma nem faz média)', () => {
  const metas = [
    criarMeta({ id: '1', ativa: true, valorAlvo: 3000, criadoEm: '2026-08-01T00:00:00.000Z' }),
    criarMeta({ id: '2', ativa: false, valorAlvo: null, criadoEm: '2026-09-01T00:00:00.000Z' }),
  ];

  const atual = obterMetaAtual(metas);

  expect(atual?.id).toBe('2');
  expect(atual?.ativa).toBe(false);
});

test('calcularDespesaMediaMensal soma os últimos N meses e divide pela quantidade', () => {
  const transacoes = [
    criarTransacao({ valor: 1000, data: '2026-09-10' }),
    criarTransacao({ valor: 500, data: '2026-08-05' }),
    criarTransacao({ valor: 1500, data: '2026-07-20' }),
    // Fora da janela de 3 meses (jun) — não deveria entrar.
    criarTransacao({ valor: 100000, data: '2026-06-01' }),
  ];

  const media = calcularDespesaMediaMensal(transacoes, '2026-09', 3);

  expect(media).toBe((1000 + 500 + 1500) / 3);
});

test('calcularMesesDeReservaCobertos divide o saldo pela despesa média', () => {
  expect(calcularMesesDeReservaCobertos(6000, 2000)).toBe(3);
});

test('calcularMesesDeReservaCobertos devolve 0 sem despesa média (evita Infinity)', () => {
  expect(calcularMesesDeReservaCobertos(6000, 0)).toBe(0);
});

test('taxaDePoupancaPositivaPorMesesSeguidos é true quando todos os meses sobraram dinheiro', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-07-01' }),
    criarTransacao({ tipo: 'despesa', valor: 500, data: '2026-07-15' }),
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-08-01' }),
    criarTransacao({ tipo: 'despesa', valor: 500, data: '2026-08-15' }),
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-09-01' }),
    criarTransacao({ tipo: 'despesa', valor: 500, data: '2026-09-15' }),
  ];

  expect(taxaDePoupancaPositivaPorMesesSeguidos(transacoes, '2026-09', 3)).toBe(true);
});

test('taxaDePoupancaPositivaPorMesesSeguidos é false se um único mês da sequência foi ruim', () => {
  const transacoes = [
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-07-01' }),
    criarTransacao({ tipo: 'despesa', valor: 500, data: '2026-07-15' }),
    // Agosto gastou mais do que ganhou — quebra a sequência.
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-08-01' }),
    criarTransacao({ tipo: 'despesa', valor: 1500, data: '2026-08-15' }),
    criarTransacao({ tipo: 'receita', valor: 1000, data: '2026-09-01' }),
    criarTransacao({ tipo: 'despesa', valor: 500, data: '2026-09-15' }),
  ];

  expect(taxaDePoupancaPositivaPorMesesSeguidos(transacoes, '2026-09', 3)).toBe(false);
});
