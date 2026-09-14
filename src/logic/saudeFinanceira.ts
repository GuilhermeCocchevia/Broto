// Métricas de "saúde financeira" derivadas das transações: pra onde o
// dinheiro foi, quanto sobrou proporcionalmente ao que entrou, quanto já
// está comprometido com contas fixas. Mesmo espírito de projecao.ts: lógica
// pura, sem depender de tela/banco, fácil de testar isolada.
import type { Transacao } from '../types/models';
import { transacaoSeAplicaNoMes } from './projecao';

export type GastoPorCategoria = {
  categoriaId: string;
  total: number;
};

// Soma o total de despesas por categoria dentro de um mês, da maior pra
// menor — é a pergunta mais natural de saúde financeira: "pra onde foi meu
// dinheiro". Uma transação mensal que se aplica ao mês entra pelo valor dela
// (não dividido), igual já acontece na projeção.
export function calcularGastoPorCategoria(transacoes: Transacao[], mes: string): GastoPorCategoria[] {
  const totalPorCategoria = new Map<string, number>();

  for (const transacao of transacoes) {
    if (transacao.tipo !== 'despesa') continue;
    if (!transacaoSeAplicaNoMes(transacao, mes)) continue;

    const totalAtual = totalPorCategoria.get(transacao.categoriaId) ?? 0;
    totalPorCategoria.set(transacao.categoriaId, totalAtual + transacao.valor);
  }

  return [...totalPorCategoria.entries()]
    .map(([categoriaId, total]) => ({ categoriaId, total }))
    .sort((a, b) => b.total - a.total);
}

// Soma entradas/saídas do mês de uma vez, reaproveitada pelas duas métricas
// abaixo — evita percorrer `transacoes` duas vezes pra a mesma pergunta.
function somarEntradasESaidas(transacoes: Transacao[], mes: string): { entradas: number; saidas: number } {
  let entradas = 0;
  let saidas = 0;

  for (const transacao of transacoes) {
    if (!transacaoSeAplicaNoMes(transacao, mes)) continue;
    if (transacao.tipo === 'receita') {
      entradas += transacao.valor;
    } else {
      saidas += transacao.valor;
    }
  }

  return { entradas, saidas };
}

// Taxa de poupança do mês: proporção do que entrou que sobrou no fim do mês.
// Ex: 0.2 = guardou 20% da renda. Pode dar negativo (gastou mais do que
// ganhou). Sem nenhuma entrada no mês não dá pra calcular uma proporção —
// devolve 0 em vez de NaN/Infinity, que quebraria qualquer tela em cima disso.
export function calcularTaxaDePoupanca(transacoes: Transacao[], mes: string): number {
  const { entradas, saidas } = somarEntradasESaidas(transacoes, mes);
  if (entradas === 0) return 0;
  return (entradas - saidas) / entradas;
}

// Comprometimento de renda fixa: quanto da renda do mês já está "preso" em
// despesas recorrentes (frequencia 'mensal' — aluguel, assinaturas, parcelas
// fixas) antes mesmo de gastar com o resto. Mesma proteção contra divisão
// por zero da taxa de poupança.
export function calcularComprometimentoDeRendaFixa(transacoes: Transacao[], mes: string): number {
  const { entradas } = somarEntradasESaidas(transacoes, mes);
  if (entradas === 0) return 0;

  const despesasFixas = transacoes
    .filter((transacao) => transacao.tipo === 'despesa' && transacao.frequencia === 'mensal')
    .filter((transacao) => transacaoSeAplicaNoMes(transacao, mes))
    .reduce((total, transacao) => total + transacao.valor, 0);

  return despesasFixas / entradas;
}
