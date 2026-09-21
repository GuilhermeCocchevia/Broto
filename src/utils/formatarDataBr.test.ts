import { converterIsoParaDate, converterDateParaIso, formatarDataBr } from './formatarDataBr';

test('formatarDataBr troca AAAA-MM-DD por DD/MM/AAAA', () => {
  expect(formatarDataBr('2026-09-16')).toBe('16/09/2026');
  expect(formatarDataBr('2054-12-05')).toBe('05/12/2054');
});

test('converterDateParaIso volta pro formato ISO, com zero à esquerda', () => {
  expect(converterDateParaIso(new Date(2026, 8, 16))).toBe('2026-09-16');
  expect(converterDateParaIso(new Date(2026, 0, 5))).toBe('2026-01-05');
});

test('converterIsoParaDate e converterDateParaIso são inversas uma da outra', () => {
  const iso = '2026-09-16';
  expect(converterDateParaIso(converterIsoParaDate(iso))).toBe(iso);
});

test('converterIsoParaDate usa hora local, sem deslocar o dia (não usa UTC)', () => {
  const data = converterIsoParaDate('2026-01-01');
  expect(data.getFullYear()).toBe(2026);
  expect(data.getMonth()).toBe(0);
  expect(data.getDate()).toBe(1);
});
