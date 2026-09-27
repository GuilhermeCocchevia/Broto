// Pequenas funções puras pro atalho "dividir uma conta anual em parcelas" no
// formulário de Nova Transação (ex: 13º salário em 2x, IPTU em 10x). Cada
// parcela vira uma transação 'anual' INDEPENDENTE — não existe nenhum
// vínculo entre elas depois de criadas; editar ou excluir uma não mexe nas
// outras, do mesmo jeito que qualquer transação anual já funciona. É só um
// atalho na hora de CRIAR, não um novo conceito no modelo de dados.
export type RascunhoDeParcela = { data: string; valor: number };

// Ajusta a lista de parcelas pra ter exatamente `quantidade` itens, sem
// perder o que a pessoa já preencheu: cresce copiando a DATA do último
// rascunho (mais perto do que a pessoa provavelmente quer do que "hoje" de
// novo) com valor zerado; encolhe cortando do fim.
export function redimensionarParcelas(atual: RascunhoDeParcela[], quantidade: number): RascunhoDeParcela[] {
  if (quantidade === atual.length) return atual;
  if (quantidade < atual.length) return atual.slice(0, quantidade);
  const dataBase = atual[atual.length - 1]?.data ?? '';
  const novas = Array.from({ length: quantidade - atual.length }, () => ({ data: dataBase, valor: 0 }));
  return [...atual, ...novas];
}

// "13º salário" + índice 0 de 2 → "13º salário (1/2)" — identifica cada
// transação gerada sem inventar um vínculo que não existe de verdade no
// banco (são linhas independentes desde o instante em que são criadas).
export function nomearParcela(descricaoBase: string, indice: number, total: number): string {
  return `${descricaoBase} (${indice + 1}/${total})`;
}
