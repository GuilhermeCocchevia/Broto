// "Quanto o usuário costuma gastar, além das despesas fixas, nos próximos
// meses?" — a parte ESTIMADA da projeção do futuro. O resto (despesas
// recorrentes com data de fim, parcelas, simulações) é conhecido e
// determinístico; aqui mora só o palpite, feito com o cuidado de nunca
// parecer mais certo do que é (ver `confianca`).
//
// Substitui a regra antiga "replicar as despesas avulsas do mês em que a
// simulação COMEÇA" (calcularDespesaVariavelMedia ancorada em mesInicial), que
// dava R$0 pra qualquer simulação começando num mês futuro — o mês ainda não
// tem lançamento nenhum — e assim marcava como viável uma meta que não cabia.
// Agora a referência é sempre o mês ATUAL e o histórico recente, não
// importa quando a simulação começa.
import type { Transacao } from '../types/models';
import { adicionarMeses } from './projecao';
import { normalizarTexto } from '../utils/normalizarTexto';

// Quantos meses FECHADOS (antes do atual) entram no histórico.
const MESES_DE_HISTORICO = 3;

export type NivelDeConfianca = 'sem-dados' | 'baixa' | 'media' | 'boa';

// Uma despesa que o usuário lança como avulsa ('unica') mas que se repete
// todo mês na prática — ex: a fatura de um cartão de crédito. Projetada como
// recorrente, no valor médio.
export type DespesaRecorrenteNaPratica = {
  // Descrição normalizada (sem acento/caixa) — é o que identifica "a mesma
  // despesa" de um mês pro outro.
  chave: string;
  // Como o usuário escreveu, na ocorrência mais recente (pra mostrar na tela).
  descricao: string;
  valorMensal: number;
};

export type EstimativaDeGastos = {
  // Mês de referência ('AAAA-MM') — a estimativa vale a partir dele.
  mesAtual: string;
  // Gasto avulso "de verdade" esperado por mês, JÁ sem as recorrentes na
  // prática (que são somadas à parte, pra não contar duas vezes).
  gastoVariavelMensal: number;
  recorrentesNaPratica: DespesaRecorrenteNaPratica[];
  // Em quantos dos meses da janela (atual + fechados) havia alguma avulsa
  // lançada — base da `confianca`.
  mesesComDado: number;
  confianca: NivelDeConfianca;
};

function confiancaPorMeses(mesesComDado: number): NivelDeConfianca {
  if (mesesComDado <= 0) return 'sem-dados';
  if (mesesComDado === 1) return 'baixa';
  if (mesesComDado === 2) return 'media';
  return 'boa';
}

function media(valores: number[]): number {
  return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;
}

// Estima o gasto avulso dos meses seguintes ao `mesAtual`.
//
// 1. Só olha despesas 'unica' do mês atual e dos MESES_DE_HISTORICO meses
//    fechados anteriores (avulsas datadas depois do mês atual são compras
//    planejadas, não padrão de gasto).
// 2. "Recorrente na prática": a mesma descrição (sem acento/caixa) aparece
//    em 2 ou mais meses da janela, incluindo o atual ou o anterior (senão
//    parou) → projetada como despesa mensal no valor médio. Se já existe uma
//    despesa MENSAL com esse nome, não duplica.
// 3. O que sobra é o gasto variável: a MÉDIA dos meses fechados que têm
//    lançamento (mês vazio não puxa a média pra baixo — app novo tem histórico
//    vazio, não gasto zero), com o mês atual como PISO — ele ainda está
//    incompleto, então o que já foi gasto nele é o mínimo, nunca extrapolado
//    (o usuário lança fatura pela data de vencimento, então "ritmo do mês"
//    inflaria a conta).
export function estimarGastosFuturos(transacoes: Transacao[], mesAtual: string): EstimativaDeGastos {
  const mesesFechados = Array.from({ length: MESES_DE_HISTORICO }, (_, i) =>
    adicionarMeses(mesAtual, -(i + 1)),
  );
  const janela = new Set([mesAtual, ...mesesFechados]);

  const nomesDeDespesaMensal = new Set(
    transacoes
      .filter((t) => t.tipo === 'despesa' && t.frequencia === 'mensal')
      .map((t) => normalizarTexto(t.descricao)),
  );

  const avulsas = transacoes.filter(
    (t) => t.tipo === 'despesa' && t.frequencia === 'unica' && janela.has(t.data.slice(0, 7)),
  );

  // chave -> (mês -> soma daquele mês) + ocorrência mais recente.
  const grupos = new Map<string, { porMes: Map<string, number>; recente: Transacao }>();
  for (const avulsa of avulsas) {
    const chave = normalizarTexto(avulsa.descricao);
    const mes = avulsa.data.slice(0, 7);
    const grupo = grupos.get(chave) ?? { porMes: new Map<string, number>(), recente: avulsa };
    grupo.porMes.set(mes, (grupo.porMes.get(mes) ?? 0) + avulsa.valor);
    if (avulsa.data > grupo.recente.data) grupo.recente = avulsa;
    grupos.set(chave, grupo);
  }

  const mesAnterior = adicionarMeses(mesAtual, -1);
  const recorrentesNaPratica: DespesaRecorrenteNaPratica[] = [];
  const chavesRecorrentes = new Set<string>();
  for (const [chave, grupo] of grupos) {
    const aindaAcontece = grupo.porMes.has(mesAtual) || grupo.porMes.has(mesAnterior);
    if (grupo.porMes.size >= 2 && aindaAcontece && !nomesDeDespesaMensal.has(chave)) {
      recorrentesNaPratica.push({
        chave,
        descricao: grupo.recente.descricao,
        valorMensal: media([...grupo.porMes.values()]),
      });
      chavesRecorrentes.add(chave);
    }
  }

  const totalPorMes = new Map<string, number>();
  for (const avulsa of avulsas) {
    if (chavesRecorrentes.has(normalizarTexto(avulsa.descricao))) continue;
    const mes = avulsa.data.slice(0, 7);
    totalPorMes.set(mes, (totalPorMes.get(mes) ?? 0) + avulsa.valor);
  }
  const totaisFechadosComDado = mesesFechados
    .map((mes) => totalPorMes.get(mes) ?? 0)
    .filter((total) => total > 0);
  const mediaDosFechados = totaisFechadosComDado.length > 0 ? media(totaisFechadosComDado) : 0;
  const gastoVariavelMensal = Math.max(totalPorMes.get(mesAtual) ?? 0, mediaDosFechados);

  const mesesComDado = [...janela].filter((mes) => avulsas.some((a) => a.data.slice(0, 7) === mes)).length;

  return {
    mesAtual,
    gastoVariavelMensal,
    recorrentesNaPratica,
    mesesComDado,
    confianca: confiancaPorMeses(mesesComDado),
  };
}
