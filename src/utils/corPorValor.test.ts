import { interpolarCor, corDaDespesa, corDoSaldo, maiorValorDaSerie } from './corPorValor';

test('interpolarCor com t=0 devolve exatamente a cor inicial', () => {
  expect(interpolarCor('#FFEB3B', '#D50000', 0)).toBe('#ffeb3b');
});

test('interpolarCor com t=1 devolve exatamente a cor final', () => {
  expect(interpolarCor('#FFEB3B', '#D50000', 1)).toBe('#d50000');
});

test('interpolarCor com t=0.5 fica no meio do caminho entre as duas cores', () => {
  // Preto -> branco no meio deveria dar um cinza médio (~#808080).
  const meio = interpolarCor('#000000', '#FFFFFF', 0.5);
  expect(meio).toBe('#808080');
});

test('interpolarCor "gruda" nas pontas quando t sai de [0, 1]', () => {
  expect(interpolarCor('#FFEB3B', '#D50000', -5)).toBe(interpolarCor('#FFEB3B', '#D50000', 0));
  expect(interpolarCor('#FFEB3B', '#D50000', 5)).toBe(interpolarCor('#FFEB3B', '#D50000', 1));
});

test('corDaDespesa: valor no mínimo fica bem amarelo, no máximo bem vermelho', () => {
  expect(corDaDespesa(10, 10, 1000)).toBe(interpolarCor('#FFEB3B', '#D50000', 0));
  expect(corDaDespesa(1000, 10, 1000)).toBe(interpolarCor('#FFEB3B', '#D50000', 1));
});

test('corDaDespesa: valor no meio do intervalo fica no meio do espectro', () => {
  expect(corDaDespesa(505, 10, 1000)).toBe(corDaDespesa(505, 10, 1000)); // determinístico
  const meio = corDaDespesa((10 + 1000) / 2, 10, 1000);
  expect(meio).toBe(interpolarCor('#FFEB3B', '#D50000', 0.5));
});

test('corDaDespesa não quebra quando mínimo e máximo são iguais (só 1 despesa)', () => {
  expect(() => corDaDespesa(100, 100, 100)).not.toThrow();
});

test('corDoSaldo: 3 meses de reserva cobertos (ou mais) fica bem verde', () => {
  expect(corDoSaldo(3)).toBe(interpolarCor('#4CAF50', '#FFEB3B', 0));
  // Cobrir MAIS que 3 meses continua igualmente verde (clampado), não fica
  // "mais verde ainda" — 3 meses já é o teto de referência.
  expect(corDoSaldo(50)).toBe(corDoSaldo(3));
});

test('corDoSaldo: 1.5 mês (metade da referência) fica bem amarelo', () => {
  expect(corDoSaldo(1.5)).toBe(interpolarCor('#FFEB3B', '#FFEB3B', 0));
});

test('corDoSaldo: 0 meses cobertos (saldo zerado ou negativo) fica bem vermelho', () => {
  expect(corDoSaldo(0)).toBe(interpolarCor('#FFEB3B', '#D50000', 1));
  expect(corDoSaldo(-2)).toBe(interpolarCor('#FFEB3B', '#D50000', 1));
});

test('maiorValorDaSerie pega o maior valor, nunca abaixo de 0', () => {
  expect(maiorValorDaSerie([100, 500, -200])).toBe(500);
  expect(maiorValorDaSerie([-100, -500])).toBe(100);
});
