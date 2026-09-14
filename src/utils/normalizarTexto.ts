// Deixa o texto minúsculo e sem acento, pra comparar duas strings "no
// sentido" e não caractere por caractere — assim "salario" (sem acento)
// encontra "Salário" na busca de sugestões de categoria.
//
// `.normalize('NFD')` separa cada letra acentuada em duas partes: a letra
// base + o acento como um caractere "combinante" à parte (ex: 'á' vira 'a'
// + '´'). O regex depois remove só esses acentos soltos (intervalo Unicode
// U+0300–U+036F), sobrando só as letras base.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
