import { interpolarCor, corDaDespesa } from './corPorValor';

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
