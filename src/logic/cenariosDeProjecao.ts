// Cenários da projeção do futuro: em vez de UMA linha "certa", mostra o que
// acontece se o gasto do dia a dia for maior do que o esperado (faixa) e deixa
// o usuário experimentar cortar gasto ("e se") — sempre em texto calmo, sem
// alarme (ver premissas em premissasDeProjecao.ts).
import type { EstimativaDeGastos } from './estimativaDeGastos';
import { calcularReducaoMensalNecessaria, type ResultadoViabilidade } from './projecao';
import { formatarReal } from '../utils/formatarReal';
import { formatarMesBr } from '../utils/formatarDataBr';

// O cenário "mais pesado" assume 20% a mais de gasto no dia a dia — uma margem
// simples e explicável pra imprevistos (não pretende prever nada: com 1 a 3
// meses de dados, qualquer modelo mais fino seria falsa precisão).
export const FATOR_IMPREVISTOS = 1.2;

// Quem sabe avaliar uma simulação (ou várias) dada uma estimativa de gastos.
// As telas montam isso com avaliarViabilidadeSimulacao/Conjunta; a lógica de
// cenários só precisa deste contrato.
export type Avaliador = (estimativa: EstimativaDeGastos) => ResultadoViabilidade;

// "Gasto do dia a dia" = o variável E o que se repete na prática (faturas):
// os dois escalam juntos (ver PremissasDeProjecao.gastoDoDiaADia). Despesas
// fixas e renda não mudam. Devolve uma cópia.
export function ajustarGastoDoDiaADia(estimativa: EstimativaDeGastos, fator: number): EstimativaDeGastos {
  return {
    ...estimativa,
    gastoVariavelMensal: estimativa.gastoVariavelMensal * fator,
    recorrentesNaPratica: estimativa.recorrentesNaPratica.map((r) => ({
      ...r,
      valorMensal: r.valorMensal * fator,
    })),
  };
}

function totalDoDiaADia(estimativa: EstimativaDeGastos): number {
  return (
    estimativa.gastoVariavelMensal + estimativa.recorrentesNaPratica.reduce((soma, r) => soma + r.valorMensal, 0)
  );
}

// Menor corte (em % inteira, 1 a 100) no gasto do dia a dia que faz a
// avaliação ficar viável. 0 se já é viável; `null` se nem cortando tudo
// resolve (as despesas fixas sozinhas já não cabem) ou se não há gasto do dia
// a dia pra cortar. Menos gasto só pode ajudar o saldo, então dá pra buscar
// por bisseção; arredonda pra cima, então o corte sugerido sempre basta.
export function calcularCorteNecessarioEmPercentual(
  avaliar: Avaliador,
  estimativa: EstimativaDeGastos,
): number | null {
  if (avaliar(estimativa).viavel) return 0;
  if (totalDoDiaADia(estimativa) <= 0) return null;

  const cabeCortando = (percentual: number) =>
    avaliar(ajustarGastoDoDiaADia(estimativa, 1 - percentual / 100)).viavel;
  if (!cabeCortando(100)) return null;

  let baixo = 1;
  let alto = 100;
  while (baixo < alto) {
    const meio = Math.floor((baixo + alto) / 2);
    if (cabeCortando(meio)) alto = meio;
    else baixo = meio + 1;
  }
  return alto;
}

// Por que nem cortando o gasto do dia a dia a meta cabe:
//  - 'mes-atual': o pior mês é o ATUAL, cujo gasto real já foi lançado —
//    cortar o dia a dia dos próximos meses não muda o que já aconteceu (dá pra
//    tentar começar a meta no mês que vem);
//  - 'fixos': as despesas fixas e a própria meta já passam da renda.
export type MotivoSemSolucao = 'mes-atual' | 'fixos';

export function explicarSemSolucao(avaliar: Avaliador, estimativa: EstimativaDeGastos): MotivoSemSolucao {
  const semDiaADia = avaliar(ajustarGastoDoDiaADia(estimativa, 0));
  return semDiaADia.piorMes === estimativa.mesAtual ? 'mes-atual' : 'fixos';
}

// A faixa só faz sentido quando o cenário pesado é diferente do esperado
// (sem gasto do dia a dia, as duas linhas seriam idênticas).
export function temFaixaDeCenarios(esperado: ResultadoViabilidade, pesado: ResultadoViabilidade): boolean {
  return esperado.meses.some((mes, i) => Math.abs(mes.saldo - (pesado.meses[i]?.saldo ?? mes.saldo)) > 0.005);
}

// Cabe no cenário esperado mas não no pesado: avisa da pouca folga, em tom
// calmo (o veredito continua sendo o do cenário esperado).
export function montarAvisoDeFolga(esperado: ResultadoViabilidade, pesado: ResultadoViabilidade): string | null {
  if (!esperado.viavel || pesado.viavel) return null;
  const pct = Math.round((FATOR_IMPREVISTOS - 1) * 100);
  return `Mas com pouca folga: se seus gastos do dia a dia subirem ${pct}%, o saldo ficaria negativo em ${formatarMesBr(pesado.piorMes)} (linha tracejada).`;
}

// O texto do cartão "E se eu gastar menos?" — sempre descritivo e com números.
export function descreverEseSe({
  reducaoPct,
  corteNecessario,
  motivoSemSolucao = 'fixos',
  gastoDoDiaADia,
  esperado,
}: {
  reducaoPct: number;
  // Corte mínimo pra caber, no estado sem ajuste (ver calcularCorteNecessarioEmPercentual).
  corteNecessario: number | null;
  // Só usado quando `corteNecessario` é null.
  motivoSemSolucao?: MotivoSemSolucao;
  gastoDoDiaADia: number;
  // Resultado JÁ com o corte escolhido aplicado.
  esperado: ResultadoViabilidade;
}): string {
  if (reducaoPct === 0) {
    if (corteNecessario === 0) return 'Do jeito que está, a meta já cabe.';
    if (corteNecessario === null) {
      return motivoSemSolucao === 'mes-atual'
        ? 'O mês atual já fechou no negativo com o que foi lançado, e cortar gastos dos próximos meses não muda isso. Que tal começar a meta no mês que vem?'
        : 'Só reduzir o gasto do dia a dia não basta: as despesas fixas já pesam demais nessa meta.';
    }
    return `Reduzindo cerca de ${corteNecessario}% do gasto do dia a dia, a meta passa a caber.`;
  }

  const economia = (gastoDoDiaADia * reducaoPct) / 100;
  if (esperado.viavel) {
    return `Com ${reducaoPct}% a menos no dia a dia (${formatarReal(economia)} por mês), a meta cabe.`;
  }
  return `Com ${reducaoPct}% a menos no dia a dia (${formatarReal(economia)} por mês), o saldo ainda fica negativo em ${formatarMesBr(esperado.piorMes)}.`;
}

// O que dizer, e o que oferecer, quando uma meta de GUARDAR dinheiro (economia,
// rendimento, aposentadoria) não cabe: o valor guardado é o objetivo, então a
// sugestão nunca é "guarde menos" — é gastar menos, quando isso resolve. Três
// situações honestas:
//  - cortar o dia a dia resolve → diz o valor exato por mês (o mesmo do
//    Dashboard) e a tela oferece o botão pra rever os gastos;
//  - o mês atual já fechou no negativo → cortar depois não muda, sugere
//    começar no mês que vem;
//  - nem cortando tudo resolve → as despesas fixas pesam demais.
export function sugestaoParaMetaDeGuardar({
  base,
  corteNecessario,
  motivoSemSolucao,
  plural = false,
}: {
  // Resultado SEM ajuste do "e se" (o que o app assume de verdade).
  base: ResultadoViabilidade;
  corteNecessario: number | null;
  motivoSemSolucao: MotivoSemSolucao;
  plural?: boolean;
}): { texto: string; reducaoMensal: number } {
  const ela = plural ? 'elas' : 'ela';
  const meta = plural ? 'essas metas' : 'essa meta';

  if (corteNecessario !== null && corteNecessario > 0) {
    const reducaoMensal = calcularReducaoMensalNecessaria(base.meses);
    return {
      texto: `Pra manter ${meta}, o caminho é gastar menos: cerca de ${formatarReal(reducaoMensal)} a menos por mês resolve.`,
      reducaoMensal,
    };
  }
  if (corteNecessario === null && motivoSemSolucao === 'mes-atual') {
    return {
      texto: `Esse mês já está com os gastos lançados, então cortar depois não muda isso — que tal começar ${plural ? 'as metas' : 'a meta'} no mês que vem?`,
      reducaoMensal: 0,
    };
  }
  if (corteNecessario === null) {
    return {
      texto: `Nem cortando todo o gasto do dia a dia ${ela} cabe: as despesas fixas já pesam demais. Talvez valha guardar um valor menor por um tempo.`,
      reducaoMensal: 0,
    };
  }
  return { texto: '', reducaoMensal: 0 };
}
