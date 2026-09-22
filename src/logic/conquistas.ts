// Conquistas: marcos que só sobem, nunca caem — mesmo modelo do Duolingo,
// decidido antes de qualquer código existir (ver Segundo Cérebro): "3 meses
// guardando dinheiro" continua conquistada mesmo se o mês seguinte for ruim.
// Nunca uma pontuação viva que sobe e desce com a saúde financeira do mês —
// isso seria punitivo (abrir o app depois de um mês ruim e ver que "caiu de
// nível" é o oposto de calmo).
//
// Cada conquista é derivada de dados que JÁ existem (transacoes/simulacoes)
// — nenhuma delas depende de um histórico guardado à parte. Isso é
// deliberado: reaproveita a mesma lógica pura já testada em saudeFinanceira.ts
// e projecao.ts, e significa que restaurar um backup antigo (que não traz o
// registro de conquistas já vistas, ver conquistasDesbloqueadas em schema.ts)
// não perde nada de verdade — o app recalcula e desbloqueia de novo sozinho.
import type { Simulacao, Transacao } from '../types/models';
import { adicionarMeses, transacaoSeAplicaNoMes } from './projecao';
import { calcularTaxaDePoupanca } from './saudeFinanceira';

export type ChaveConquista =
  | 'primeiro-lancamento'
  | 'primeira-simulacao'
  | 'mes-completo'
  | 'habito-formado'
  | 'tres-meses-no-azul';

export type Conquista = {
  chave: ChaveConquista;
  titulo: string;
  // Como aparece já CONQUISTADA (tela de Conquistas, celebração).
  descricao: string;
  // Como aparece ainda TRANCADA (tela de Conquistas) — a dica de como chegar lá.
  comoConseguir: string;
  // SF Symbol (com fallback Ionicons, ver ConquistasScreen.tsx).
  icone: string;
  iconeFallback: string;
};

// Ordem = ordem de progressão natural (a mais fácil primeiro) — é também a
// ordem em que aparecem na tela de Conquistas.
export const CONQUISTAS: Conquista[] = [
  {
    chave: 'primeiro-lancamento',
    titulo: 'Primeiro passo',
    descricao: 'Você lançou sua primeira transação.',
    comoConseguir: 'Lance uma receita ou despesa.',
    icone: 'pencil.circle.fill',
    iconeFallback: 'create',
  },
  {
    chave: 'primeira-simulacao',
    titulo: 'Rumo ao futuro',
    descricao: 'Você criou sua primeira simulação.',
    comoConseguir: 'Crie uma simulação de compra, meta ou investimento.',
    icone: 'binoculars.fill',
    iconeFallback: 'search',
  },
  {
    chave: 'mes-completo',
    titulo: 'Mês completo',
    descricao: 'Você registrou receitas e despesas num mesmo mês.',
    comoConseguir: 'Lance ao menos uma receita e uma despesa no mesmo mês.',
    icone: 'calendar',
    iconeFallback: 'calendar',
  },
  {
    chave: 'habito-formado',
    titulo: 'Hábito formado',
    descricao: 'Você já lançou gastos avulsos em 3 meses diferentes.',
    comoConseguir: 'Lance despesas avulsas em 3 meses diferentes — é o que deixa suas projeções mais precisas.',
    icone: 'flame.fill',
    iconeFallback: 'flame',
  },
  {
    chave: 'tres-meses-no-azul',
    titulo: 'No azul',
    descricao: 'Três meses seguidos guardando mais do que gastando.',
    comoConseguir: 'Feche 3 meses seguidos com taxa de poupança positiva (guardando mais do que gasta).',
    icone: 'leaf.fill',
    iconeFallback: 'leaf',
  },
];

// Meses ('AAAA-MM') em que existe pelo menos uma despesa AVULSA lançada —
// é o sinal de "hábito de lançar o dia a dia", diferente de despesa fixa
// (lançada uma vez e esquecida, não mostra uso contínuo do app).
function mesesComDespesaAvulsa(transacoes: Transacao[]): Set<string> {
  return new Set(
    transacoes.filter((t) => t.tipo === 'despesa' && t.frequencia === 'unica').map((t) => t.data.slice(0, 7)),
  );
}

// Meses ('AAAA-MM') em que aconteceu QUALQUER lançamento avulso (receita ou
// despesa) — o "vocabulário" de meses onde a pessoa efetivamente usou o
// app, candidato a ter os dois lados (entrada e saída) completos.
function mesesComLancamentoAvulso(transacoes: Transacao[]): Set<string> {
  return new Set(transacoes.filter((t) => t.frequencia === 'unica').map((t) => t.data.slice(0, 7)));
}

// Existe algum mês (fechado, aberto, passado ou o atual) com receita E
// despesa lançadas nele? Não importa qual mês — só precisa ter acontecido
// uma vez.
function existeMesCompleto(transacoes: Transacao[], mesAtual: string): boolean {
  const candidatos = new Set([mesAtual, ...mesesComLancamentoAvulso(transacoes)]);
  for (const mes of candidatos) {
    const temReceita = transacoes.some((t) => t.tipo === 'receita' && transacaoSeAplicaNoMes(t, mes));
    const temDespesa = transacoes.some((t) => t.tipo === 'despesa' && transacaoSeAplicaNoMes(t, mes));
    if (temReceita && temDespesa) return true;
  }
  return false;
}

// Os 3 meses FECHADOS imediatamente antes do atual tiveram taxa de poupança
// positiva, os 3 seguidos? `calcularTaxaDePoupanca` já devolve 0 (não
// positivo) num mês sem nenhuma receita lançada, então um mês "vazio" no
// meio da janela reprova a conquista em vez de contar como neutro — mesma
// cautela contra histórico vazio inflar um resultado já usada em outras
// contas do app (ver estimarGastosFuturos).
function tresMesesConsecutivosNoAzul(transacoes: Transacao[], mesAtual: string): boolean {
  for (let i = 1; i <= 3; i++) {
    const mes = adicionarMeses(mesAtual, -i);
    if (calcularTaxaDePoupanca(transacoes, mes) <= 0) return false;
  }
  return true;
}

// Quais conquistas o estado ATUAL dos dados já cumpre — não é "quais foram
// desbloqueadas" (isso é responsabilidade de useConquistasStore, que compara
// esse resultado com o que já foi salvo no banco e só celebra a diferença).
export function avaliarConquistasElegiveis(
  transacoes: Transacao[],
  simulacoes: Simulacao[],
  mesAtual: string,
): ChaveConquista[] {
  const elegiveis: ChaveConquista[] = [];
  if (transacoes.length > 0) elegiveis.push('primeiro-lancamento');
  if (simulacoes.length > 0) elegiveis.push('primeira-simulacao');
  if (existeMesCompleto(transacoes, mesAtual)) elegiveis.push('mes-completo');
  if (mesesComDespesaAvulsa(transacoes).size >= 3) elegiveis.push('habito-formado');
  if (tresMesesConsecutivosNoAzul(transacoes, mesAtual)) elegiveis.push('tres-meses-no-azul');
  return elegiveis;
}
