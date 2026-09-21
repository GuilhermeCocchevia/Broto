// "Quanto ainda dá pra gastar esse mês, sem comprometer minhas metas e
// parcelas ativas?" — a barra de orçamento do Dashboard existe pra
// responder exatamente essa pergunta, em tempo real, conforme o usuário
// lança despesas (ver DashboardScreen.tsx).
//
// Diferente de calcularSobraMensal (sobraMensal.ts), que usa uma MÉDIA
// histórica de despesas pra estimar uma sobra "de regra geral" (útil pra
// decidir se vale começar uma simulação de Rendimento) — aqui a conta usa
// números REAIS do mês corrente. São duas perguntas diferentes ("no
// geral, quanto sobra?" vs. "esse mês específico, quanto já entrou e já
// saiu?"), por isso duas contas diferentes — não é duplicação.
//
// De propósito, os dois números mostrados (renda do mês, despesas do mês)
// são totais BRUTOS e diretos — dá pra conferir batendo o olho no extrato,
// sem precisar confiar numa fórmula com desconto escondido. Quem decide o
// "nível" de alerta é a comparação entre a sobra (renda - despesas) e o
// que já está comprometido esse mês com simulações ativas (ver
// calcularParcelasAtivasNoMes em sobraMensal.ts) — não uma redução prévia
// do teto.
//
// Importante (feedback do usuário testando): o "limite" a proteger não é
// só a meta de economia — uma compra parcelada ativa (ex: 12x de um
// celular) é igual de real, e também precisa caber na sobra do mês. A
// meta de economia continua sendo o GATILHO que decide se a barra aparece
// (ver temMetaDeEconomiaAtiva), mas o limite comparado, uma vez que a
// barra já apareceu, soma TODAS as simulações ativas — não só ela.
import type { Simulacao, Transacao } from '../types/models';
import { transacaoSeAplicaNoMes, simulacaoAtivaNoMes } from './projecao';
import { formatarReal } from '../utils/formatarReal';

// Todas as despesas (fixas OU avulsas) que se aplicam a um mês — o total
// bruto que realmente saiu (ou vai sair) da conta, sem separar por tipo.
export function calcularDespesasTotaisDoMes(transacoes: Transacao[], mes: string): number {
  return transacoes
    .filter((t) => t.tipo === 'despesa' && transacaoSeAplicaNoMes(t, mes))
    .reduce((total, t) => total + t.valor, 0);
}

// As despesas de um mês (fixas OU avulsas) da mais cara pra mais barata —
// a lista da tela "Rever gastos". Só as do mês de referência (não o
// histórico inteiro): é o que pesa no orçamento mensal, e uma compra avulsa
// de meses atrás no topo da lista seria ruído, não algo que dá pra cortar.
// `[...]` copia antes de ordenar (`.sort()` muta o array, e o filtro já
// devolve um novo, mas o custo é zero e deixa a intenção explícita).
export function listarDespesasDoMesPorValor(transacoes: Transacao[], mes: string): Transacao[] {
  return [...transacoes.filter((t) => t.tipo === 'despesa' && transacaoSeAplicaNoMes(t, mes))].sort(
    (a, b) => b.valor - a.valor,
  );
}

// A barra só existe pra reforçar uma meta que a pessoa já definiu no
// Simulador (tipo 'economia') — sem uma meta ativa esse mês, não tem o
// que ela deveria proteger. Pedido explícito: em vez de mostrar um número
// solto de qualquer jeito, a tela convida a criar uma meta primeiro (ver
// DashboardScreen.tsx) — o que também acaba dando um motivo a mais pra
// usar essa opção do Simulador.
export function temMetaDeEconomiaAtiva(simulacoes: Simulacao[], mes: string): boolean {
  return simulacoes.some((s) => s.tipo === 'economia' && simulacaoAtivaNoMes(s, mes));
}

// O "teto de gastos" do mês e o quanto dele já foi usado — é o que a barra do
// Dashboard desenha. Teto = renda menos o que metas e parcelas ativas pedem:
// gastar até aí ainda deixa a meta inteira de pé, então a barra COMPLETA
// significa "cheguei no teto", e passar disso continua completa (não estoura
// a trilha). Proporcional de verdade: gastar metade do teto enche metade da
// barra. Antes a barra media os gastos contra a renda inteira, então ela
// podia parecer folgada mesmo com a meta já fora de alcance.
//   - sem renda lançada: barra vazia (não há teto pra medir).
//   - teto <= 0 (a meta pede tudo, ou mais, do que entra): já está no teto,
//     barra cheia — qualquer gasto passa dele.
export function calcularPreenchimentoOrcamento(
  rendaDoMes: number,
  despesasDoMes: number,
  limiteDoMes: number,
): { teto: number; percentual: number } {
  if (rendaDoMes <= 0) return { teto: 0, percentual: 0 };
  const teto = Math.max(0, centavos(rendaDoMes - limiteDoMes));
  if (teto <= 0) return { teto: 0, percentual: 1 };
  return { teto, percentual: Math.min(1, Math.max(0, despesasDoMes / teto)) };
}

// Folga mínima (fração da renda do mês) pra considerar que uma meta cabe
// "com tranquilidade". Cabendo, mas sobrando menos que isso depois das metas
// e parcelas, o aviso fica em "cabe, mas apertado" — um imprevisto pequeno já
// empurraria a meta pra fora.
const FOLGA_MINIMA_TRANQUILA = 0.1;

export type NivelOrcamento = 'sem-dados' | 'nao-cabe' | 'apertado' | 'tranquilo';

export type SituacaoOrcamento = {
  nivel: NivelOrcamento;
  // Quanto falta (por mês) pra meta/parcelas ativas caberem — só > 0 em
  // 'nao-cabe'. É o mesmo número que a tela "Rever gastos" mostra como meta
  // de corte.
  falta: number;
  mensagem: string;
};

// Arredonda em centavos: renda - despesas - limite em ponto flutuante pode dar
// 123.39999999 (ou 0.0000001 quando deveria ser 0) e bagunçar as comparações.
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// "A meta cabe no mês?" — compara a SOBRA real (renda - despesas) com o que
// as metas e parcelas ativas pedem (`limiteDoMes`, ver
// calcularParcelasAtivasNoMes), e diz o resultado com os números, não com
// uma frase vaga. Bug real reportado: com sobra de R$376 e uma meta de
// R$500/mês, o cartão dizia só "chegando perto do limite", enquanto o
// Simulador já avisava que a meta não dava pra seguir — a mensagem antiga
// tratava "sobra menos que o limite" como "quase lá", quando na verdade a
// meta JÁ não cabe. Agora são quatro situações distintas:
//   sem-dados : sem receita lançada no mês, não dá pra saber (antes mostrava
//               "R$0 de R$0" com a barra cheia — um valor que não existe).
//   nao-cabe  : a sobra é menor que o pedido — diz quanto falta.
//   apertado  : cabe, mas com folga menor que FOLGA_MINIMA_TRANQUILA da renda.
//   tranquilo : cabe com folga.
// Tom sempre descritivo, nunca de alarme (mesma cautela do resto do app).
export function avaliarOrcamento(
  rendaDoMes: number,
  despesasDoMes: number,
  limiteDoMes: number,
): SituacaoOrcamento {
  if (rendaDoMes <= 0) {
    return {
      nivel: 'sem-dados',
      falta: 0,
      mensagem:
        'Ainda não há receita lançada nesse mês, então não dá pra saber se a meta cabe. Lance seu salário pra ver.',
    };
  }

  const sobra = centavos(rendaDoMes - despesasDoMes);
  const falta = centavos(limiteDoMes - sobra);

  if (falta > 0) {
    const mensagem =
      sobra <= 0
        ? `Nesse mês suas despesas já ocupam toda a renda, e suas metas e parcelas ativas pedem ${formatarReal(limiteDoMes)}. Vale rever os gastos.`
        : `Nesse mês sobram ${formatarReal(sobra)}, mas suas metas e parcelas ativas pedem ${formatarReal(limiteDoMes)} — faltam ${formatarReal(falta)}. Vale rever os gastos pra elas caberem.`;
    return { nivel: 'nao-cabe', falta, mensagem };
  }

  const folga = centavos(sobra - limiteDoMes);
  if (folga < rendaDoMes * FOLGA_MINIMA_TRANQUILA) {
    return {
      nivel: 'apertado',
      falta: 0,
      mensagem: `Suas metas e parcelas ativas (${formatarReal(limiteDoMes)}) cabem nesse mês, mas com pouca folga: sobram só ${formatarReal(folga)}.`,
    };
  }

  return {
    nivel: 'tranquilo',
    falta: 0,
    mensagem: `Suas metas e parcelas ativas (${formatarReal(limiteDoMes)}) cabem tranquilamente nesse mês — ainda sobram ${formatarReal(folga)}.`,
  };
}
