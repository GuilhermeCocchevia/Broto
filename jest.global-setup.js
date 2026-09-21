// Roda uma vez antes de todos os testes: fixa o fuso horário em Brasília
// (UTC-3). Sem isso, os testes que dependem da data LOCAL (ver
// src/utils/dataLocal.ts) passariam ou falhariam conforme o fuso de quem
// roda — e o bug que eles protegem (o app achar que já é o mês seguinte à
// noite) só existe em fusos atrás de UTC.
module.exports = async () => {
  process.env.TZ = 'America/Sao_Paulo';
};
