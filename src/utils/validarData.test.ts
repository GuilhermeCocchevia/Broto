import { validarData } from './validarData';

test('aceita data real no formato certo', () => {
  expect(validarData('2026-09-14')).toBe(true);
  expect(validarData('2024-02-29')).toBe(true); // ano bissexto
});

test('rejeita formato errado', () => {
  expect(validarData('14/09/2026')).toBe(false);
  expect(validarData('2026-9-14')).toBe(false);
  expect(validarData('')).toBe(false);
});

test('rejeita mês ou dia que não existe', () => {
  expect(validarData('2026-13-01')).toBe(false);
  expect(validarData('2026-02-30')).toBe(false);
  expect(validarData('2026-04-31')).toBe(false);
});
