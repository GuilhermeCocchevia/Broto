// "Como está minha situação financeira agora?" — o card "Situação atual"
// do Dashboard existe pra responder essa pergunta com números REAIS (não
// uma frase vaga), em tempo real, conforme o usuário lança transações (ver
// DashboardScreen.tsx).
//
// Histórico de bugs reais reportados testando com dados reais
// (2026-09-27), cada um corrigido em cima do anterior:
// 1. A primeira versão somava renda e despesa de cada mês SEPARADAMENTE
//    (mês atual + mês seguinte) — um salário do dia 30 (fim do mês) é, na
//    prática, o dinheiro que paga as contas do mês SEGUINTE, não uma
//    "sobra" livre; somar por mês tratava ele como sobra.
// 2. Corrigido projetando o saldo ACUMULADO (não mais somando por mês) e
//    julgando pelo PIOR PONTO — mas numa janela de só 2 meses, o que
//    "sobra" no ÚLTIMO mês da janela ainda parecia de graça, porque a
//    janela parava bem ali sem ver o mês seguinte consumindo essa sobra.
//    Esticado pra 12 meses.
// 3. Mesmo com saldo acumulado e 12 meses, o motor ainda somava tudo por
//    MÊS-CALENDÁRIO, não por data exata — um mês podia "fechar" positivo
//    escondendo que, no MEIO dele, uma despesa do dia 10 vencia antes do
//    salário do dia 30 chegar, ficando negativo por semanas sem o app
//    perceber. Único jeito de pegar isso de verdade: projetar dia a dia
//    (ver projetarFluxoDeCaixaDiario em projecao.ts), não mais por mês.
import type { Simulacao, Transacao } from '../types/models';
import {
  transacaoSeAplicaNoMes,
  projetarFluxoDeCaixaDiario,
  type PontoDeCaixa,
  type MesProjetado,
} from './projecao';
import type { EstimativaDeGastos } from './estimativaDeGastos';
import { formatarReal } from '../utils/formatarReal';
import { formatarDataPorExtenso } from '../utils/formatarDataBr';

// Todas as despesas (fixas OU avulsas) que se aplicam a um mês — o total
// bruto que realmente saiu (ou vai sair) da conta, sem separar por tipo.
export function calcularDespesasTotaisDoMes(transacoes: Transacao[], mes: string): number {
  return transacoes
    .filter((t) => t.tipo === 'despesa' && transacaoSeAplicaNoMes(t, mes))
    .reduce((total, t) => total + t.valor, 0);
}

// Só as despesas FIXAS (recorrentes, 'mensal') que valem num mês — o
// "compromisso" mensal, sem o gasto do dia a dia. Usada nas premissas da
// projeção ("suas despesas fixas somam R$X por mês").
export function calcularDespesasFixasDoMes(transacoes: Transacao[], mes: string): number {
  return transacoes
    .filter((t) => t.tipo === 'despesa' && t.frequencia === 'mensal' && transacaoSeAplicaNoMes(t, mes))
    .reduce((total, t) => total + t.valor, 0);
}

// As despesas de um mês (fixas OU avulsas) da mais cara pra mais barata —
// a lista da tela "Rever gastos". Só as do mês de referência (não o
// histórico inteiro): é o que pesa no orçamento, e uma compra avulsa de
// meses atrás no topo da lista seria ruído, não algo que dá pra cortar.
// `[...]` copia antes de ordenar (`.sort()` muta o array, e o filtro já
// devolve um novo, mas o custo é zero e deixa a intenção explícita).
export function listarDespesasDoMesPorValor(transacoes: Transacao[], mes: string): Transacao[] {
  return [...transacoes.filter((t) => t.tipo === 'despesa' && transacaoSeAplicaNoMes(t, mes))].sort(
    (a, b) => b.valor - a.valor,
  );
}

// Quantos dias à frente o card "Situação atual" olha — 365 (um ano),
// longo o bastante pra qualquer déficit recorrente (despesas mensais que
// já superam a renda mensal) ou despesa anual (IPVA, 13º) aparecer com
// folga, em vez de ficar escondido bem na borda da janela. Ver
// projetarFluxoDeCaixaDiario (projecao.ts) — o motor agora anda dia a
// dia, não mês a mês, então "quanto mais longe, mais impreciso" não se
// aplica aqui: cada lançamento real já tem sua data exata; só o "gasto do
// dia a dia estimado" é uma média (mesmo valor todo mês, não piora com a
// distância).
const QUANTIDADE_DIAS_SITUACAO_ATUAL = 365;

export type ProjecaoDeSituacao = {
  pontos: PontoDeCaixa[];
  saldoInicial: number;
  // Índice (dentro de `pontos`) do menor saldo — guardado em vez de só a
  // data, porque duas datas iguais teoricamente poderiam ter o mesmo
  // saldo (empate); o índice aponta pro ponto exato sem ambiguidade.
  indicePior: number;
  // A data EXATA, dentro da janela, com o menor saldo — não o mês com a
  // maior despesa isolada, nem o "fim de mês" mais baixo. Um lançamento no
  // meio do mês pode deixar o saldo negativo por semanas mesmo o mês
  // fechando no positivo; é esse ponto mais baixo de verdade que importa.
  piorData: string;
  piorSaldo: number;
};

// Projeta o saldo dia a dia a partir de hoje (mesma `estimativa` de gasto
// do dia a dia que o Simulador usa, pros números baterem) e acha o ponto
// mais baixo da janela inteira.
export function projetarSituacaoAtual(
  transacoes: Transacao[],
  simulacoes: Simulacao[],
  saldoAtual: number,
  hoje: string,
  estimativa: EstimativaDeGastos,
  rendaFixaMensal: number = 0,
): ProjecaoDeSituacao {
  const pontos = projetarFluxoDeCaixaDiario(
    transacoes,
    simulacoes,
    saldoAtual,
    hoje,
    QUANTIDADE_DIAS_SITUACAO_ATUAL,
    estimativa,
    rendaFixaMensal,
  );
  let indicePior = 0;
  for (let i = 1; i < pontos.length; i++) {
    if (pontos[i].saldo < pontos[indicePior].saldo) indicePior = i;
  }
  return {
    pontos,
    saldoInicial: saldoAtual,
    indicePior,
    piorData: pontos[indicePior].data,
    piorSaldo: pontos[indicePior].saldo,
  };
}

// Folga mínima (fração da renda que já entrou até o pior momento) pra
// considerar a situação "tranquila". Cabendo, mas com menos folga que
// isso no pior momento, o aviso fica em "apertado" — um imprevisto
// pequeno já bastaria pra virar negativo.
const FOLGA_MINIMA_TRANQUILA = 0.1;

export type NivelSituacao = 'sem-dados' | 'negativo' | 'apertado' | 'tranquilo';

export type SituacaoAtual = {
  nivel: NivelSituacao;
  // 'negativo': a PRIMEIRA data em que o saldo cruza pra negativo — não a
  // mais funda. Avisar só a mais funda (versão anterior deste conserto)
  // escondia que o problema começa bem antes: dizer "fica negativo em
  // março" quando na verdade já fica negativo em outubro dá a falsa
  // impressão de que ainda há meses de folga antes de precisar agir.
  // 'apertado'/'tranquilo' (nunca fica negativo): a data do MENOR saldo
  // da janela, como antes.
  piorData: string;
  piorSaldo: number;
  // Só preenchido em 'negativo', e só quando existe um ponto AINDA MAIS
  // fundo depois da primeira data negativa (o saldo se recupera um
  // pouco e piora de novo mais tarde, ex: um IPVA caindo alguns meses
  // depois) — pra avisar isso também, sem esconder que fica pior ainda.
  pioraDepois: { data: string; saldo: number } | null;
  // Quanto falta (na primeira data negativa) pro saldo não ficar
  // negativo — só > 0 em 'negativo'. É o número que a tela "Rever
  // gastos" usa como meta de corte, e ela mostra as despesas do MESMO
  // mês dessa data — os dois precisam estar amarrados ao mesmo ponto.
  falta: number;
  // O que já entrou (saldo de hoje + renda) até esse ponto — é o "teto"
  // que a barra do Dashboard desenha.
  teto: number;
  // O que já saiu até esse ponto — é o preenchimento da barra.
  despesasAteOPior: number;
  // Fração (0 a 1) de quanto do teto já foi gasto até esse ponto. 1 = o
  // saldo encosta em zero (ou menos) — bate exatamente com
  // nivel === 'negativo'.
  percentual: number;
  mensagem: string;
};

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

// O "teto" (tudo que estava disponível: saldo de hoje + renda) e o que
// saiu, contando só até um ponto específico da trajetória — usado tanto
// pro pior ponto GLOBAL (apertado/tranquilo) quanto pra PRIMEIRA data
// negativa (negativo, ver avaliarSituacaoAtual).
function calcularTetoEDespesasAte(
  pontos: PontoDeCaixa[],
  saldoInicial: number,
  ateIndice: number,
): { teto: number; despesas: number; renda: number } {
  const fatia = pontos.slice(0, ateIndice + 1);
  const renda = fatia.reduce((soma, p) => soma + Math.max(0, p.valor), 0);
  const despesas = fatia.reduce((soma, p) => soma + Math.max(0, -p.valor), 0);
  // Nunca negativo aqui — um saldo hoje negativo não "ajuda" a pagar nada.
  const teto = Math.max(0, saldoInicial) + renda;
  return { teto, despesas, renda };
}

// "Como está a situação, olhando pra frente?" — em vez de comparar um
// total de renda com um total de despesa, ou até um saldo por MÊS (as
// duas versões anteriores, ver comentário no topo do arquivo), julga pelo
// PIOR PONTO da trajetória real, dia a dia. Quatro situações, tom sempre
// calmo e descritivo, nunca de alarme (mesma cautela do resto do app):
//   sem-dados : sem nenhuma receita esperada na janela — não dá pra saber.
//   negativo  : o saldo chega a ficar negativo em algum dia — diz em qual
//               dia (a PRIMEIRA vez, ver SituacaoAtual.piorData) e
//               quanto faltaria pra não ficar; avisa também se piora
//               ainda mais depois.
//   apertado  : nunca fica negativo, mas o pior momento sobra pouco.
//   tranquilo : o pior momento ainda sobra folga confortável.
export function avaliarSituacaoAtual(projecao: ProjecaoDeSituacao): SituacaoAtual {
  const { pontos, saldoInicial, indicePior, piorData, piorSaldo } = projecao;
  const rendaNaJanela = pontos.reduce((soma, p) => soma + Math.max(0, p.valor), 0);

  if (rendaNaJanela <= 0) {
    return {
      nivel: 'sem-dados',
      piorData,
      piorSaldo,
      pioraDepois: null,
      falta: 0,
      teto: 0,
      despesasAteOPior: 0,
      percentual: 0,
      mensagem:
        'Ainda não há receita esperada pros próximos meses, então não dá pra saber como está sua situação. Lance seu salário pra ver.',
    };
  }

  if (piorSaldo < 0) {
    // A PRIMEIRA vez que o saldo cruza pra negativo — pontos já vêm em
    // ordem cronológica, então é só achar o primeiro.
    const indicePrimeiraNegativa = pontos.findIndex((p) => p.saldo < 0);
    const primeiraNegativa = pontos[indicePrimeiraNegativa];
    const { teto, despesas } = calcularTetoEDespesasAte(pontos, saldoInicial, indicePrimeiraNegativa);
    const falta = centavos(-primeiraNegativa.saldo);
    const dataPrimeiraNegativa = formatarDataPorExtenso(primeiraNegativa.data);

    // O pior ponto GLOBAL só é notícia à parte se for uma data DIFERENTE
    // da primeira negativa — ou seja, o saldo se recupera um pouco e
    // piora de novo depois (ex: IPVA caindo alguns meses mais tarde).
    const pioraDepois = indicePrimeiraNegativa !== indicePior ? { data: piorData, saldo: piorSaldo } : null;

    const mensagem = pioraDepois
      ? `Pelo ritmo atual, seu saldo já fica negativo em ${dataPrimeiraNegativa}: faltariam ${formatarReal(falta)} pra não ficar no vermelho. Sem ajustar nada, piora ainda mais depois, chegando a ${formatarReal(pioraDepois.saldo)} em ${formatarDataPorExtenso(pioraDepois.data)}. Vale rever os gastos.`
      : `Pelo ritmo atual, seu saldo fica negativo em ${dataPrimeiraNegativa}: faltariam ${formatarReal(falta)} pra não ficar no vermelho. Vale rever os gastos.`;

    return {
      nivel: 'negativo',
      piorData: primeiraNegativa.data,
      piorSaldo: primeiraNegativa.saldo,
      pioraDepois,
      falta,
      teto,
      despesasAteOPior: despesas,
      percentual: 1,
      mensagem,
    };
  }

  const { teto, despesas, renda: rendaAteOPior } = calcularTetoEDespesasAte(pontos, saldoInicial, indicePior);
  const percentual = teto > 0 ? Math.min(1, Math.max(0, despesas / teto)) : despesas > 0 ? 1 : 0;
  const dataPorExtenso = formatarDataPorExtenso(piorData);

  if (piorSaldo < rendaAteOPior * FOLGA_MINIMA_TRANQUILA) {
    return {
      nivel: 'apertado',
      piorData,
      piorSaldo,
      pioraDepois: null,
      falta: 0,
      teto,
      despesasAteOPior: despesas,
      percentual,
      mensagem: `Sua situação fica apertada em ${dataPorExtenso}: o saldo chega a só ${formatarReal(piorSaldo)} nesse dia.`,
    };
  }

  return {
    nivel: 'tranquilo',
    piorData,
    piorSaldo,
    pioraDepois: null,
    falta: 0,
    teto,
    despesasAteOPior: despesas,
    percentual,
    mensagem: `Sua situação está tranquila — mesmo no pior momento (${dataPorExtenso}), o saldo fica em ${formatarReal(piorSaldo)}.`,
  };
}

// Quanto cortar, TODO mês (não só uma vez), pra sair do vermelho E ainda
// sobrar uma folga de segurança — não só zerar o problema. Pedido
// explícito do usuário: um corte que só zera o problema deixa a pessoa
// "sem correr risco de chegar perto do vermelho de novo" no papel, mas na
// prática qualquer imprevisto pequeno já estoura de novo.
//
// Mesmo raciocínio de calcularReducaoMensalNecessaria (projecao.ts):
// cortar R$r TODO mês melhora o saldo de um mês em r vezes quantos meses
// já se passaram (o corte acumula, já que é recorrente) — só que aqui o
// alvo de cada mês não é R$0, é uma folga proporcional à PRÓPRIA renda
// daquele mês (mesma fração, FOLGA_MINIMA_TRANQUILA, que já decide se
// avaliarSituacaoAtual classifica a situação como "tranquila").
export function calcularReducaoParaFicarTranquilo(meses: MesProjetado[]): number {
  let reducao = 0;
  meses.forEach((mes, indice) => {
    const folgaAlvo = mes.entradas * FOLGA_MINIMA_TRANQUILA;
    if (mes.saldo >= folgaAlvo) return;
    reducao = Math.max(reducao, (folgaAlvo - mes.saldo) / (indice + 1));
  });
  // Mesmo cuidado de calcularReducaoMensalNecessaria: mata ruído de ponto
  // flutuante bem abaixo do centavo antes do `Math.ceil` pra cima.
  const semRuido = Math.round(reducao * 1e6) / 1e6;
  return Math.ceil(semRuido * 100) / 100;
}

export type SugestaoDeCorte = {
  // A despesa com maior valor no mês revisado — onde um corte tem mais
  // efeito (cortar 10% de uma conta grande resolve mais rápido que 10%
  // de uma pequena).
  item: Transacao;
  // Quanto sugerir cortar DESSE item especificamente — nunca mais que o
  // valor dele mesmo (ver `excedeOItem`).
  reducaoSugerida: number;
  // 0 a 100, relativo ao valor do PRÓPRIO item (não da renda nem do total
  // de despesas) — "corte X% do Cartão de crédito", não "X% da sua renda".
  percentualSugerido: number;
  // true quando cortar o item INTEIRO ainda não bastaria pra atingir a
  // folga de segurança — a tela usa isso pra trocar a mensagem (sugerir
  // olhar mais de um gasto, não só esse).
  excedeOItem: boolean;
};

// Aponta ONDE cortar primeiro: pega o corte total necessário (ver
// calcularReducaoParaFicarTranquilo) e concentra na despesa de maior
// valor do mês — "reduza X% do Cartão de crédito" em vez de só "corte
// R$X, sem dizer onde". `despesasDoMes` já precisa vir ordenada da maior
// pra menor (ver listarDespesasDoMesPorValor); pega só a primeira.
export function sugerirCorteNoMaiorGasto(
  despesasDoMes: Transacao[],
  reducaoNecessaria: number,
): SugestaoDeCorte | null {
  const maiorGasto = despesasDoMes[0];
  if (!maiorGasto || reducaoNecessaria <= 0) return null;

  const excedeOItem = reducaoNecessaria > maiorGasto.valor;
  const reducaoSugerida = centavos(excedeOItem ? maiorGasto.valor : reducaoNecessaria);
  const percentualSugerido = Math.min(100, (reducaoSugerida / maiorGasto.valor) * 100);

  return { item: maiorGasto, reducaoSugerida, percentualSugerido, excedeOItem };
}
