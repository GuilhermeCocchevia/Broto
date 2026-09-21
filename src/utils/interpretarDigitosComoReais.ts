// Lógica pura da máscara de moeda "de caixa eletrônico" (ver CampoMoeda.tsx):
// pega o texto cru que sobrou depois de qualquer edição no campo (a própria
// máscara formatada + o dígito novo, ou um dígito a menos se foi backspace)
// e reinterpreta TUDO como uma sequência de centavos, ignorando qualquer
// caractere que não seja número (R$, ponto, vírgula). Extraída do
// componente pra dar pra testar sem precisar renderizar nada.
export function interpretarDigitosComoReais(textoDigitado: string): number {
  const somenteDigitos = textoDigitado.replace(/\D/g, '');
  const centavos = somenteDigitos === '' ? 0 : parseInt(somenteDigitos, 10);
  return centavos / 100;
}
