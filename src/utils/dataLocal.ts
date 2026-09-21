import { converterDateParaIso } from './formatarDataBr';

// "Que dia/mês é hoje PRA PESSOA" — sempre em hora LOCAL do aparelho.
//
// Bug real que motivou este arquivo: o app usava `new Date().toISOString()`
// pra saber a data de hoje, mas `toISOString()` devolve UTC. No Brasil (UTC-3),
// depois das 21h já é "amanhã" em UTC — então, no último dia do mês, a partir
// das 21h o app achava que já era o mês seguinte (orçamento, sobra, projeção
// e saldo atual viravam de mês três horas antes da hora). Aqui a data sai dos
// campos locais do Date (mesma técnica de converterDateParaIso, ver
// formatarDataBr.ts).
//
// `agora` é injetável só pra testar sem depender do relógio.

// 'AAAA-MM-DD' de hoje, em hora local.
export function hojeLocal(agora: Date = new Date()): string {
  return converterDateParaIso(agora);
}

// 'AAAA-MM' do mês atual, em hora local.
export function mesAtualLocal(agora: Date = new Date()): string {
  return hojeLocal(agora).slice(0, 7);
}

// Converte um TIMESTAMP gravado em UTC (ex: `criadoEm` de um saldo,
// '2026-09-21T01:30:00.000Z') na data 'AAAA-MM-DD' em que aquilo aconteceu
// pra pessoa — o mesmo instante, visto no fuso do aparelho.
export function dataLocalDeTimestamp(timestampIso: string): string {
  return converterDateParaIso(new Date(timestampIso));
}
