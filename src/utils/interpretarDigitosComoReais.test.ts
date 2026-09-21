import { interpretarDigitosComoReais } from './interpretarDigitosComoReais';

test('campo vazio é R$0,00', () => {
  expect(interpretarDigitosComoReais('')).toBe(0);
});

test('cada dígito novo entra como centavo, empurrando os anteriores', () => {
  expect(interpretarDigitosComoReais('1')).toBe(0.01);
  expect(interpretarDigitosComoReais('12')).toBe(0.12);
  expect(interpretarDigitosComoReais('123')).toBe(1.23);
  expect(interpretarDigitosComoReais('1234')).toBe(12.34);
  expect(interpretarDigitosComoReais('1234567')).toBe(12345.67);
});

test('ignora tudo que a própria máscara desenhou (R$, ponto de milhar, vírgula)', () => {
  // Simula o texto que o TextInput devolve depois de já estar mostrando
  // "R$ 12,34" e a pessoa apertar mais um dígito "5" no fim.
  expect(interpretarDigitosComoReais('R$ 12,345')).toBe(123.45);
  expect(interpretarDigitosComoReais('R$ 1.234,565')).toBe(12345.65);
});

test('apagar o último dígito reduz o valor uma casa (mesmo padrão de app de banco)', () => {
  // "R$ 12,34" -> backspace remove o "4" final -> "R$ 12,3"
  expect(interpretarDigitosComoReais('R$ 12,3')).toBe(1.23);
});

test('zeros à esquerda não sobram no resultado', () => {
  expect(interpretarDigitosComoReais('00123')).toBe(1.23);
});
