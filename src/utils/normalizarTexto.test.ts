import { normalizarTexto } from './normalizarTexto';

test('deixa tudo minúsculo', () => {
  expect(normalizarTexto('Salário')).toBe('salario');
});

test('remove acentos', () => {
  expect(normalizarTexto('Pensão alimentícia')).toBe('pensao alimenticia');
});

test('remove espaços nas pontas', () => {
  expect(normalizarTexto('  Benefício  ')).toBe('benefício'.normalize('NFD').replace(/[̀-ͯ]/g, ''));
});

test('duas grafias diferentes da mesma palavra viram o mesmo texto normalizado', () => {
  expect(normalizarTexto('salário')).toBe(normalizarTexto('SALARIO'));
});
