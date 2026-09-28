import {
  converterIsoParaDate,
  converterDateParaIso,
  formatarDataBr,
  formatarMesBr,
  formatarDataPorExtenso,
  formatarMesPorExtenso,
  adicionarDias,
} from './formatarDataBr';

test('adicionarDias soma dias simples dentro do mesmo mês', () => {
  expect(adicionarDias('2026-09-10', 5)).toBe('2026-09-15');
});

test('adicionarDias atravessa virada de mês e de ano', () => {
  expect(adicionarDias('2026-09-27', 5)).toBe('2026-10-02');
  expect(adicionarDias('2026-12-28', 5)).toBe('2027-01-02');
});

test('adicionarDias com número negativo subtrai', () => {
  expect(adicionarDias('2026-10-02', -5)).toBe('2026-09-27');
});

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

test('formatarMesBr troca AAAA-MM por MM/AAAA', () => {
  expect(formatarMesBr('2027-09')).toBe('09/2027');
  expect(formatarMesBr('2026-12')).toBe('12/2026');
  expect(formatarMesBr('2027-01')).toBe('01/2027');
});

test('formatarDataPorExtenso fala a data por extenso, sem zero à esquerda no dia', () => {
  expect(formatarDataPorExtenso('2026-09-26')).toBe('26 de setembro de 2026');
  expect(formatarDataPorExtenso('2027-01-05')).toBe('5 de janeiro de 2027');
  expect(formatarDataPorExtenso('2026-03-01')).toBe('1 de março de 2026');
});

test('formatarMesPorExtenso fala o mês e o ano por extenso', () => {
  expect(formatarMesPorExtenso('2027-12')).toBe('dezembro de 2027');
  expect(formatarMesPorExtenso('2026-02')).toBe('fevereiro de 2026');
});
