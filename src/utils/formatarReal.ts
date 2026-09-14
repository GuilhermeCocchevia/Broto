// `toLocaleString` já sabe colocar "R$", separador de milhar e vírgula
// decimal do jeito que o Brasil usa, sem precisar montar a string na mão.
// Extraído pra cá porque já é usado em mais de uma tela (Simulador, Dashboard).
export function formatarReal(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
