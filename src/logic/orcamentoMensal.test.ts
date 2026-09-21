import {
  calcularDespesasTotaisDoMes,
  calcularDespesasFixasDoMes,
  listarDespesasDoMesPorValor,
  temMetaDeEconomiaAtiva,
  avaliarOrcamento,
  calcularPreenchimentoOrcamento,
} from './orcamentoMensal';
import type { Transacao, Simulacao } from '../types/models';

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

test('temMetaDeEconomiaAtiva é true só com uma simulação tipo "economia" ativa nesse mês', () => {
  const metaAtiva = [criarSimulacao({ tipo: 'economia', dataInicio: '2026-01-01', parcelas: 12 })];
  expect(temMetaDeEconomiaAtiva(metaAtiva, '2026-09')).toBe(true);
});

test('temMetaDeEconomiaAtiva é false sem nenhuma simulação', () => {
  expect(temMetaDeEconomiaAtiva([], '2026-09')).toBe(false);
});

test('temMetaDeEconomiaAtiva é false com simulações de outros tipos (não conta compra/rendimento/aposentadoria)', () => {
  const outrosTipos = [
    criarSimulacao({ tipo: 'compra', dataInicio: '2026-01-01', parcelas: 12 }),
    criarSimulacao({ tipo: 'rendimento', dataInicio: '2026-01-01', parcelas: 12 }),
    criarSimulacao({ tipo: 'aposentadoria', dataInicio: '2026-01-01', parcelas: 360 }),
  ];
  expect(temMetaDeEconomiaAtiva(outrosTipos, '2026-09')).toBe(false);
});

test('temMetaDeEconomiaAtiva é false quando a meta de economia existe mas já terminou (fora da janela)', () => {
  const metaEncerrada = [criarSimulacao({ tipo: 'economia', dataInicio: '2026-01-01', parcelas: 3 })];
  expect(temMetaDeEconomiaAtiva(metaEncerrada, '2026-09')).toBe(false);
});

// Normaliza espaço não-separável que toLocaleString põe entre "R$" e o número.
function limpo(texto: string): string {
  return texto.replace(/\s/g, ' ');
}

test('avaliarOrcamento: sem receita lançada no mês não dá pra saber (não inventa valor)', () => {
  const r = avaliarOrcamento(0, 0, 500);
  expect(r.nivel).toBe('sem-dados');
  expect(r.falta).toBe(0);
  // Mesmo com despesa lançada, sem receita não dá pra julgar a meta.
  expect(avaliarOrcamento(0, 300, 500).nivel).toBe('sem-dados');
});

test('avaliarOrcamento: caso real — sobra R$376,60 e meta de R$500 NÃO cabe, faltam R$123,40', () => {
  const r = avaliarOrcamento(5760, 5383.4, 500);
  expect(r.nivel).toBe('nao-cabe');
  expect(r.falta).toBe(123.4);
  expect(limpo(r.mensagem)).toContain('R$ 376,60');
  expect(limpo(r.mensagem)).toContain('R$ 500,00');
  expect(limpo(r.mensagem)).toContain('R$ 123,40');
  expect(r.mensagem).not.toMatch(/chegando perto/);
});

test('avaliarOrcamento: despesas acima da renda também é "não cabe", com a falta contando o rombo', () => {
  const r = avaliarOrcamento(3000, 3200, 500);
  expect(r.nivel).toBe('nao-cabe');
  // Sobra -200: faltam os 500 da meta mais os 200 do rombo.
  expect(r.falta).toBe(700);
  expect(r.mensagem).toMatch(/já ocupam toda a renda/);
});

test('avaliarOrcamento: sobra exatamente igual ao pedido cabe (não é "falta 0,00")', () => {
  const r = avaliarOrcamento(5000, 4500, 500);
  expect(r.nivel).toBe('apertado');
  expect(r.falta).toBe(0);
});

test('avaliarOrcamento: cabe mas com folga menor que 10% da renda é "apertado"', () => {
  // Renda 5000: folga de 499,99 < 500 (10%) → apertado; 500 → tranquilo.
  expect(avaliarOrcamento(5000, 4000.01, 500).nivel).toBe('apertado');
  expect(avaliarOrcamento(5000, 4000, 500).nivel).toBe('tranquilo');
});

test('avaliarOrcamento: cabe com folga é "tranquilo" e cita a folga', () => {
  const r = avaliarOrcamento(5000, 2000, 500);
  expect(r.nivel).toBe('tranquilo');
  expect(limpo(r.mensagem)).toContain('R$ 2.500,00');
});

test('avaliarOrcamento: sem nenhuma meta/parcela (limite 0) e sobra positiva é tranquilo', () => {
  expect(avaliarOrcamento(5000, 2000, 0).nivel).toBe('tranquilo');
});

test('calcularPreenchimentoOrcamento: caso real — gastos R$5.383,40 acima do teto de R$5.260 enchem a barra inteira', () => {
  const r = calcularPreenchimentoOrcamento(5760, 5383.4, 500);
  expect(r.teto).toBe(5260);
  expect(r.percentual).toBe(1);
});

test('calcularPreenchimentoOrcamento: é proporcional ao teto (metade do teto = metade da barra)', () => {
  // Renda 5000, meta 1000 → teto 4000. Gastar 2000 = 50%; 3000 = 75%.
  expect(calcularPreenchimentoOrcamento(5000, 2000, 1000).percentual).toBe(0.5);
  expect(calcularPreenchimentoOrcamento(5000, 3000, 1000).percentual).toBe(0.75);
  expect(calcularPreenchimentoOrcamento(5000, 0, 1000).percentual).toBe(0);
});

test('calcularPreenchimentoOrcamento: mede contra o TETO, não contra a renda inteira', () => {
  // Gastando 4000 de uma renda de 5000 com meta de 1000: contra a renda
  // seriam 80%, contra o teto (4000) é a barra cheia — a meta está no limite.
  expect(calcularPreenchimentoOrcamento(5000, 4000, 1000).percentual).toBe(1);
});

test('calcularPreenchimentoOrcamento: sem receita a barra fica vazia', () => {
  expect(calcularPreenchimentoOrcamento(0, 0, 500)).toEqual({ teto: 0, percentual: 0 });
  expect(calcularPreenchimentoOrcamento(0, 300, 500)).toEqual({ teto: 0, percentual: 0 });
});

test('calcularPreenchimentoOrcamento: meta que pede toda a renda (ou mais) deixa a barra cheia', () => {
  expect(calcularPreenchimentoOrcamento(3000, 0, 3000)).toEqual({ teto: 0, percentual: 1 });
  expect(calcularPreenchimentoOrcamento(3000, 100, 4000)).toEqual({ teto: 0, percentual: 1 });
});

test('calcularPreenchimentoOrcamento: sem meta/parcela (limite 0) o teto é a renda inteira', () => {
  expect(calcularPreenchimentoOrcamento(4000, 1000, 0)).toEqual({ teto: 4000, percentual: 0.25 });
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
