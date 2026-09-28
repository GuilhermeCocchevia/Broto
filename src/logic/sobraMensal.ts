// "Quanto sobra por mês, depois de despesas reais e simulações já ativas?"
// — mesmo espírito de orcamentoMensal.ts: lógica pura derivada das
// transações/simulações, sem depender de tela/banco.
import type { Simulacao } from '../types/models';
import { calcularSaidaEfetivaNoMes, simulacaoAtivaNoMes } from './projecao';

// Soma o que toda simulação ativa tira do saldo no mês de referência —
// "quanto já está comprometido com simulações esse mês", não importa o tipo
// (compra, economia ou rendimento: pra essa conta, todas são dinheiro
// saindo do disponível). calcularSaidaEfetivaNoMes (não calcularParcelaEfetiva
// direto) porque um eventual aporte inicial de 'rendimento'/'aposentadoria'
// também sai do bolso nesse mês, se for o primeiro da simulação.
export function calcularParcelasAtivasNoMes(simulacoes: Simulacao[], mes: string): number {
  return simulacoes
    .filter((simulacao) => simulacaoAtivaNoMes(simulacao, mes))
    .reduce((total, simulacao) => total + calcularSaidaEfetivaNoMes(simulacao, mes), 0);
}

// Sobra mensal projetada: renda esperada menos despesas do mês menos o que
// já está comprometido com simulações ativas. Pode dar negativo (não sobra
// nada). Sem despesa nenhuma pra comparar ainda devolve 0 em vez de um
// número inflado e enganoso.
//
// `despesasDoMes` é responsabilidade de quem chama, mas precisa ser as
// despesas REAIS do mês de referência (ver calcularDespesasTotaisDoMes em
// orcamentoMensal.ts) — NÃO uma média histórica de meses anteriores. Bug
// real reportado testando com dados reais: a versão anterior usava uma
// média dos últimos meses FECHADOS, e pra quem acabou de começar a
// cadastrar despesas recorrentes (todas com início "esse mês"), os meses
// anteriores apareciam praticamente vazios — inflando a sobra pra um
// número que não existia de verdade (mesmo erro de raciocínio já corrigido
// na projeção do Simulador, ver calcularSaldoProjetado em projecao.ts).
//
// `rendaMensalEsperada` precisa ser a renda TOTAL esperada pro mês de
// referência, não só `calcularRendaFixaMedia` (que estima a partir de
// receitas AVULSAS passadas, pensada pra preencher meses sem nenhum dado
// real) — quem chama essa função também precisa somar qualquer receita
// RECORRENTE ('mensal') que já esteja ativa nesse mês, senão um salário
// cadastrado como recorrente (em vez de lançado avulso todo mês) some da
// conta e a sobra fica artificialmente baixa (ou nem aparece). Ver
// SimuladorScreen.tsx pra como isso é montado (reaproveita
// calcularSaldoProjetado com um array de simulações vazio, pra pegar as
// entradas de um mês futuro do jeito que o resto do app já calcula).
export function calcularSobraMensal(
  rendaMensalEsperada: number,
  despesasDoMes: number,
  simulacoes: Simulacao[],
  mesReferencia: string,
): number {
  if (despesasDoMes <= 0) return 0;
  return rendaMensalEsperada - despesasDoMes - calcularParcelasAtivasNoMes(simulacoes, mesReferencia);
}

// Sugestão de "investimento inicial" pro formulário de rendimento aberto a
// partir do aviso de sobra: o que já está no saldo ALÉM de um mês de
// despesas. A ideia é nunca sugerir tirar dinheiro das contas do mês — um
// mês inteiro de despesas fica como colchão, só o que passa disso é
// candidato a render. Saldo menor que um mês de despesas (ou sem despesa
// nenhuma registrada pra medir o colchão) sugere 0; o usuário edita à
// vontade. Arredonda pra baixo em centavos pra nunca sugerir mais do que
// existe.
export function sugerirInvestimentoInicial(saldoAtual: number, despesasDoMes: number): number {
  if (despesasDoMes <= 0) return 0;
  const excedente = saldoAtual - despesasDoMes;
  return excedente > 0 ? Math.floor(excedente * 100) / 100 : 0;
}
