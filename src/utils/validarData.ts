// Confere se um texto está no formato 'AAAA-MM-DD' E representa uma data
// real de calendário — sem isso, algo como "2026-13-45" passava direto pro
// banco e quebrava silenciosamente a lógica de projeção (que faz comparação
// de string tipo '2026-13' >= '2026-09', o que "funciona" sem erro mas dá
// resultado sem sentido).
export function validarData(texto: string): boolean {
  const formatoCorreto = /^\d{4}-\d{2}-\d{2}$/.test(texto);
  if (!formatoCorreto) return false;

  const [ano, mes, dia] = texto.split('-').map(Number);
  // `Date.UTC` "conserta" datas inválidas em vez de dar erro — dia 32 de
  // janeiro vira 1º de fevereiro, por exemplo. Comparando os componentes de
  // volta com o que foi digitado, a gente descobre se isso aconteceu.
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  );
}
