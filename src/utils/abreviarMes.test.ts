import { abreviarMes } from './abreviarMes';

test('abreviarMes devolve o nome curto do mês em português', () => {
  expect(abreviarMes('2026-01')).toBe('Jan');
  expect(abreviarMes('2026-09')).toBe('Set');
  expect(abreviarMes('2027-12')).toBe('Dez');
});
