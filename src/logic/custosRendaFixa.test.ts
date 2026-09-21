import {
  calcularAliquotaIR,
  calcularValorFuturoLiquido,
  calcularAporteNecessario,
  TAXA_CUSTODIA_B3_ANUAL,
} from './custosRendaFixa';
import { calcularValorFuturoComAportes } from './projecao';

test('calcularAliquotaIR segue a tabela regressiva, inclusive nas bordas exatas', () => {
  expect(calcularAliquotaIR(180)).toBe(0.225);
  expect(calcularAliquotaIR(181)).toBe(0.2);
  expect(calcularAliquotaIR(360)).toBe(0.2);
  expect(calcularAliquotaIR(361)).toBe(0.175);
  expect(calcularAliquotaIR(720)).toBe(0.175);
  expect(calcularAliquotaIR(721)).toBe(0.15);
});

test('calcularValorFuturoLiquido sem custódia usa a taxa bruta direto', () => {
  const aporteMensal = 1000;
  const taxaMensal = 0.005;
  const meses = 24; // 720 dias exatos -> alíquota 17,5%

  const resultado = calcularValorFuturoLiquido(aporteMensal, taxaMensal, meses, false);

  const valorFuturoBrutoEsperado = calcularValorFuturoComAportes(aporteMensal, taxaMensal, meses);
  const ganhoBrutoEsperado = valorFuturoBrutoEsperado - aporteMensal * meses;
  const impostoEsperado = ganhoBrutoEsperado * 0.175;

  expect(resultado.valorFuturoBruto).toBeCloseTo(valorFuturoBrutoEsperado, 6);
  expect(resultado.aliquotaIR).toBe(0.175);
  expect(resultado.impostoPago).toBeCloseTo(impostoEsperado, 6);
  expect(resultado.valorFuturoLiquido).toBeCloseTo(valorFuturoBrutoEsperado - impostoEsperado, 6);
});

test('calcularValorFuturoLiquido com custódia rende menos que sem custódia', () => {
  const aporteMensal = 1000;
  const taxaMensal = 0.006;
  const meses = 360; // horizonte de aposentadoria, bem acima de 720 dias

  const comCustodia = calcularValorFuturoLiquido(aporteMensal, taxaMensal, meses, true);
  const semCustodia = calcularValorFuturoLiquido(aporteMensal, taxaMensal, meses, false);

  expect(comCustodia.valorFuturoBruto).toBeLessThan(semCustodia.valorFuturoBruto);
  expect(comCustodia.valorFuturoLiquido).toBeLessThan(semCustodia.valorFuturoLiquido);
  // Alíquota de IR é a mesma nos dois casos (mesmo prazo) — só a taxa de
  // rendimento em si muda, não a regra de IR.
  expect(comCustodia.aliquotaIR).toBe(semCustodia.aliquotaIR);
});

test('calcularValorFuturoLiquido reduz a taxa mensal exatamente pela custódia dividida por 12', () => {
  const aporteMensal = 500;
  const taxaMensalBruta = 0.006;
  const meses = 12;

  const resultado = calcularValorFuturoLiquido(aporteMensal, taxaMensalBruta, meses, true);
  const taxaLiquidaEsperada = taxaMensalBruta - TAXA_CUSTODIA_B3_ANUAL / 12;
  const valorFuturoEsperado = calcularValorFuturoComAportes(aporteMensal, taxaLiquidaEsperada, meses);

  expect(resultado.valorFuturoBruto).toBeCloseTo(valorFuturoEsperado, 6);
});

test('calcularValorFuturoLiquido sem juros não gera imposto nenhum (ganho zero)', () => {
  const resultado = calcularValorFuturoLiquido(1000, 0, 12, false);

  expect(resultado.ganhoBruto).toBeCloseTo(0, 6);
  expect(resultado.impostoPago).toBe(0);
  expect(resultado.valorFuturoLiquido).toBeCloseTo(resultado.totalAportado, 6);
});

test('calcularValorFuturoLiquido nunca deixa a custódia levar a taxa pra negativo (clamp em zero)', () => {
  // Taxa mensal bem pequena, menor que o próprio desconto de custódia.
  const resultado = calcularValorFuturoLiquido(1000, 0.0001, 12, true);
  const semJuros = calcularValorFuturoLiquido(1000, 0, 12, false);

  expect(resultado.valorFuturoBruto).toBeCloseTo(semJuros.valorFuturoBruto, 6);
});

test('calcularAporteNecessario é o inverso exato de calcularValorFuturoComAportes', () => {
  const taxaMensal = 0.006;
  const meses = 240;
  const aporteOriginal = 500;

  const valorFuturo = calcularValorFuturoComAportes(aporteOriginal, taxaMensal, meses);
  const aporteRecalculado = calcularAporteNecessario(valorFuturo, taxaMensal, meses, false);

  expect(aporteRecalculado).toBeCloseTo(aporteOriginal, 6);
});

test('calcularAporteNecessario sem juros é só o valor desejado dividido pelos meses', () => {
  expect(calcularAporteNecessario(12000, 0, 12, false)).toBeCloseTo(1000, 6);
});

test('calcularAporteNecessario pede menos aporte quando a taxa é maior (o rendimento ajuda mais)', () => {
  const aporteTaxaBaixa = calcularAporteNecessario(1_000_000, 0.003, 336, false);
  const aporteTaxaAlta = calcularAporteNecessario(1_000_000, 0.01, 336, false);

  expect(aporteTaxaAlta).toBeLessThan(aporteTaxaBaixa);
});

test('calcularAporteNecessario com custódia pede um aporte maior que sem custódia (pro mesmo alvo)', () => {
  const semCustodia = calcularAporteNecessario(1_000_000, 0.006, 336, false);
  const comCustodia = calcularAporteNecessario(1_000_000, 0.006, 336, true);

  expect(comCustodia).toBeGreaterThan(semCustodia);
});

test('calcularAporteNecessario alimentado de volta em calcularValorFuturoLiquido bate no bruto desejado', () => {
  const taxaMensal = 0.0058;
  const meses = 336; // 28 anos, horizonte real de aposentadoria
  const valorDesejado = 1_000_000;

  const aporte = calcularAporteNecessario(valorDesejado, taxaMensal, meses, true);
  const resultado = calcularValorFuturoLiquido(aporte, taxaMensal, meses, true);

  expect(resultado.valorFuturoBruto).toBeCloseTo(valorDesejado, 4);
  // Líquido tem que ficar abaixo do bruto (IR sempre desconta algo quando
  // há ganho) — nunca igual, nunca maior.
  expect(resultado.valorFuturoLiquido).toBeLessThan(resultado.valorFuturoBruto);
});

test('calcularValorFuturoLiquido com aporteInicial soma o total aportado certo (pro ganho sair certo)', () => {
  const aporteMensal = 200;
  const aporteInicial = 5000;
  const taxaMensal = 0.005;
  const meses = 60;

  const resultado = calcularValorFuturoLiquido(aporteMensal, taxaMensal, meses, false, aporteInicial);

  expect(resultado.totalAportado).toBe(aporteInicial + aporteMensal * meses);
  expect(resultado.ganhoBruto).toBeCloseTo(resultado.valorFuturoBruto - resultado.totalAportado, 6);
});

test('calcularAporteNecessario com aporteInicial pede um aporte mensal menor que sem ele', () => {
  const semInicial = calcularAporteNecessario(100_000, 0.006, 120, false);
  const comInicial = calcularAporteNecessario(100_000, 0.006, 120, false, 20_000);

  expect(comInicial).toBeLessThan(semInicial);
  expect(comInicial).toBeGreaterThanOrEqual(0);
});

test('calcularAporteNecessario com aporteInicial que sozinho já bate a meta devolve 0 (nunca negativo)', () => {
  // Um aporte inicial grande, rendendo por bastante tempo, ultrapassa
  // sozinho um alvo modesto — não faz sentido pedir um aporte mensal
  // negativo nesse caso.
  const aporte = calcularAporteNecessario(10_000, 0.01, 120, false, 50_000);

  expect(aporte).toBe(0);
});

test('calcularAporteNecessario com aporteInicial alimentado de volta em calcularValorFuturoLiquido bate no bruto desejado', () => {
  const taxaMensal = 0.0058;
  const meses = 336;
  const valorDesejado = 1_000_000;
  const aporteInicial = 50_000;

  const aporteMensal = calcularAporteNecessario(valorDesejado, taxaMensal, meses, true, aporteInicial);
  const resultado = calcularValorFuturoLiquido(aporteMensal, taxaMensal, meses, true, aporteInicial);

  expect(resultado.valorFuturoBruto).toBeCloseTo(valorDesejado, 4);
});
