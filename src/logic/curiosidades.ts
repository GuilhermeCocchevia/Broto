// Escolhe qual curiosidade mostrar no Dashboard a cada abertura do app — ver
// comentário em curiosidadesInvestimento.ts pro porquê da lista existir
// separada. Regra simples de propósito (o usuário pediu pra não perder
// muito tempo nisso, começando com uma lista curta): nunca repete a mesma
// curiosidade da vez anterior — com a lista crescendo com o tempo, a chance
// de repetir a mesma de novo cedo cai bastante sozinha, sem precisar guardar
// um histórico maior que "qual foi a última".
export function escolherProximaCuriosidade(total: number, indiceAnterior: number | null): number {
  if (total <= 1) return 0;

  let indiceEscolhido: number;
  do {
    indiceEscolhido = Math.floor(Math.random() * total);
  } while (indiceEscolhido === indiceAnterior);

  return indiceEscolhido;
}
