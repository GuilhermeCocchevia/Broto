import { parsearValorMonetario } from './parsearValorMonetario';

test('aceita número simples sem separador', () => {
  expect(parsearValorMonetario('150')).toBe(150);
});

test('aceita vírgula como decimal (formato BR)', () => {
  expect(parsearValorMonetario('150,50')).toBe(150.5);
});

test('aceita ponto de milhar + vírgula decimal — o bug que corrigimos', () => {
  expect(parsearValorMonetario('1.500,00')).toBe(1500);
  expect(parsearValorMonetario('12.345,67')).toBe(12345.67);
});

test('aceita ponto como decimal quando não tem vírgula', () => {
  expect(parsearValorMonetario('150.50')).toBe(150.5);
});

test('devolve null pra texto vazio ou inválido', () => {
  expect(parsearValorMonetario('')).toBeNull();
  expect(parsearValorMonetario('   ')).toBeNull();
  expect(parsearValorMonetario('abc')).toBeNull();
});
