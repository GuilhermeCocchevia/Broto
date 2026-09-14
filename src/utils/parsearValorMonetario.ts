// Converte o texto de um campo de valor em R$ pra number. Aceita tanto
// "1500" ou "1500.50" quanto o formato brasileiro "1.500,00" (ponto separa
// milhar, vírgula separa decimal) — que é exatamente o que `formatarReal`
// mostra de volta pro usuário, então o formulário precisa aceitar digitar
// o mesmo jeito que é exibido.
//
// Bug que isso corrige: antes o código fazia só `texto.replace(',', '.')`,
// que troca só a PRIMEIRA vírgula — em "1.500,00" isso vira "1.500.00", que
// não é um número válido (`Number(...)` dá NaN). Qualquer valor de R$1.000
// pra cima quebrava o formulário.
export function parsearValorMonetario(texto: string): number | null {
  const limpo = texto.trim();
  if (!limpo) return null;

  // Se tem vírgula, é formato brasileiro: remove os pontos (separador de
  // milhar) e troca a vírgula decimal por ponto, que é o que `Number()` entende.
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;

  const valor = Number(normalizado);
  return Number.isNaN(valor) ? null : valor;
}
