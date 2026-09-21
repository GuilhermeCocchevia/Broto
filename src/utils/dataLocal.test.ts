// O fuso do Brasil (UTC-3) é fixado em jest.global-setup.js — é nele que
// `toISOString()` erra a data à noite, então é nele que estes testes provam o
// bug de verdade.
import { dataLocalDeTimestamp, hojeLocal, mesAtualLocal } from './dataLocal';

test('o fuso do teste é mesmo o do Brasil (senão os testes abaixo não provam nada)', () => {
  expect(new Date('2026-09-21T01:30:00.000Z').getHours()).toBe(22);
});

test('30/09 às 22h em Brasília ainda é setembro (toISOString diria outubro)', () => {
  const agora = new Date(2026, 8, 30, 22, 30); // hora LOCAL: 30/09/2026 22:30
  expect(agora.toISOString().slice(0, 7)).toBe('2026-10'); // o bug antigo
  expect(mesAtualLocal(agora)).toBe('2026-09');
  expect(hojeLocal(agora)).toBe('2026-09-30');
});

test('virada de ano: 31/12 às 23h ainda é dezembro', () => {
  const agora = new Date(2026, 11, 31, 23, 0);
  expect(mesAtualLocal(agora)).toBe('2026-12');
  expect(hojeLocal(agora)).toBe('2026-12-31');
});

test('meia-noite e um minuto já é o dia seguinte (local)', () => {
  const agora = new Date(2026, 9, 1, 0, 1);
  expect(hojeLocal(agora)).toBe('2026-10-01');
  expect(mesAtualLocal(agora)).toBe('2026-10');
});

test('dataLocalDeTimestamp: saldo informado às 22h locais tem a data DAQUELE dia, não a de UTC', () => {
  // 20/09 22:00 em Brasília = 21/09 01:00 UTC.
  expect(dataLocalDeTimestamp('2026-09-21T01:00:00.000Z')).toBe('2026-09-20');
  // Meio-dia UTC é 09h locais, mesmo dia nos dois.
  expect(dataLocalDeTimestamp('2026-09-21T12:00:00.000Z')).toBe('2026-09-21');
});
