import {
  parsearLinhasDoCsvTesouro,
  filtrarRendaMaisMaisRecente,
  converterTaxaAnualParaMensal,
} from './taxasReferencia';

// Texto real capturado ao vivo do CSV oficial do Tesouro Transparente
// nesta sessão (via Range request) — mistura de dois "Data Base" diferentes
// de propósito, pra testar o filtro de "mais recente".
const CSV_REAL_AMOSTRA = `Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
Tesouro Selic;01/03/2029;15/09/2026;0,03;0,04;19870,92;19855,75;19855,75
Tesouro IPCA+ com Juros Semestrais;15/08/2060;15/09/2026;7,21;7,33;4067,81;4005,26;4005,26
Tesouro Renda+ Aposentadoria Extra;15/12/2064;15/09/2026;7,13;7,25;736,69;715,31;715,31
Tesouro Renda+ Aposentadoria Extra;15/12/2079;15/09/2026;7,02;7,14;275,11;262,68;262,68
Tesouro Renda+ Aposentadoria Extra;15/12/2084;15/09/2026;7,02;7,14;196,37;186,46;186,46
Tesouro Renda+ Aposentadoria Extra;15/12/2059;15/09/2026;7,19;7,31;715,31;700,12;700,12
Tesouro Renda+ Aposentadoria Extra;15/12/2054;15/04/2026;7,01;7,13;1429,12;1402,38;1402,38
Tesouro Renda+ Aposentadoria Extra;15/12/2049;15/04/2026;7,14;7,26;1973,67;1947,66;1947,66
`;

test('parsearLinhasDoCsvTesouro lê o texto real do CSV e converte datas/números', () => {
  const linhas = parsearLinhasDoCsvTesouro(CSV_REAL_AMOSTRA);

  expect(linhas).toHaveLength(8);
  expect(linhas[0]).toEqual({
    tipoTitulo: 'Tesouro Selic',
    dataVencimento: '2029-03-01',
    dataBase: '2026-09-15',
    taxaCompra: 0.03,
  });
  expect(linhas[2].tipoTitulo).toBe('Tesouro Renda+ Aposentadoria Extra');
  expect(linhas[2].taxaCompra).toBe(7.13);
});

test('parsearLinhasDoCsvTesouro descarta a última linha se veio cortada (Range parcial)', () => {
  const textoCortado = CSV_REAL_AMOSTRA + 'Tesouro Renda+ Aposentadoria Extra;15/12/2';
  const linhas = parsearLinhasDoCsvTesouro(textoCortado);

  expect(linhas).toHaveLength(8);
});

test('parsearLinhasDoCsvTesouro falha explicitamente se o cabeçalho mudou', () => {
  const textoComCabecalhoDiferente = 'Titulo;Vencimento\nTesouro Selic;01/03/2029';
  expect(() => parsearLinhasDoCsvTesouro(textoComCabecalhoDiferente)).toThrow();
});

test('filtrarRendaMaisMaisRecente pega só a Data Base mais recente, ordenado por vencimento', () => {
  const linhas = parsearLinhasDoCsvTesouro(CSV_REAL_AMOSTRA);
  const rendaMais = filtrarRendaMaisMaisRecente(linhas);

  // 4 linhas de Renda+ são de 15/09/2026 (mais recente) — as 2 de 15/04
  // ficam de fora.
  expect(rendaMais).toHaveLength(4);
  expect(rendaMais.map((item) => item.vencimento)).toEqual([
    '2059-12-15',
    '2064-12-15',
    '2079-12-15',
    '2084-12-15',
  ]);
  expect(rendaMais[0].taxaAnual).toBe(7.19);
});

test('filtrarRendaMaisMaisRecente devolve vazio sem nenhuma linha de Renda+', () => {
  const linhas = parsearLinhasDoCsvTesouro(
    `Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha
Tesouro Selic;01/03/2029;15/09/2026;0,03;0,04;19870,92;19855,75;19855,75`,
  );
  expect(filtrarRendaMaisMaisRecente(linhas)).toEqual([]);
});

test('converterTaxaAnualParaMensal bate com a conta manual de juros compostos', () => {
  const taxaMensal = converterTaxaAnualParaMensal(7.13);
  // (1.0713)^(1/12) - 1
  expect(taxaMensal).toBeCloseTo(Math.pow(1.0713, 1 / 12) - 1, 10);
  // Composto por 12 meses deveria voltar pra taxa anual original.
  expect(Math.pow(1 + taxaMensal, 12) - 1).toBeCloseTo(0.0713, 10);
});

test('converterTaxaAnualParaMensal de 0% é 0% ao mês', () => {
  expect(converterTaxaAnualParaMensal(0)).toBe(0);
});
