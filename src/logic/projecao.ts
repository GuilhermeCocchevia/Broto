// O coração do "simulador do futuro": pega as transações e simulações que já
// existem e calcula o saldo projetado mês a mês. Não depende de React, Zustand
// nem SQLite — só recebe arrays e devolve números. Isso é de propósito: lógica
// pura é muito mais fácil de testar (ver projecao.test.ts) do que lógica
// misturada com tela.
import type { Transacao, Simulacao } from '../types/models';

export type MesProjetado = {
  // Formato 'AAAA-MM', ex: '2026-09'.
  mes: string;
  entradas: number;
  saidas: number;
  // Saldo acumulado até esse mês (inclusive), não só o resultado do mês isolado.
  saldo: number;
};

// Corta uma data 'AAAA-MM-DD' pra só 'AAAA-MM'. Como as duas são strings ISO,
// comparar com < / <= / === já dá a ordem cronológica certa sem precisar
// converter pra Date — mesma ideia já usada no comentário de Transacao.data.
function formatarMes(data: string): string {
  return data.slice(0, 7);
}

// Soma `quantidade` meses a um mês 'AAAA-MM', estourando o ano quando passa de
// dezembro. Ex: adicionarMeses('2026-11', 2) -> '2027-01'.
function adicionarMeses(mesBase: string, quantidade: number): string {
  const [ano, mes] = mesBase.split('-').map(Number);
  // Truque pra lidar com virada de ano: conta tudo em "meses desde o ano 0",
  // soma, e depois volta pra ano/mês separados com divisão inteira e resto.
  const totalMeses = ano * 12 + (mes - 1) + quantidade;
  const anoResultado = Math.floor(totalMeses / 12);
  const mesResultado = (totalMeses % 12) + 1;
  return `${anoResultado}-${String(mesResultado).padStart(2, '0')}`;
}

// Quantos meses existem entre dois meses 'AAAA-MM' (mesA - mesB).
// Ex: diferencaEmMeses('2026-12', '2026-10') -> 2.
function diferencaEmMeses(mesA: string, mesB: string): number {
  const [anoA, mA] = mesA.split('-').map(Number);
  const [anoB, mB] = mesB.split('-').map(Number);
  return (anoA * 12 + mA) - (anoB * 12 + mB);
}

// Quantos salários olhar pra trás pra calcular a renda fixa projetada.
const QUANTIDADE_SALARIOS_PARA_MEDIA = 3;

// Estima a "renda fixa mensal" a partir dos últimos salários já recebidos,
// pra usar como projeção nos meses futuros — a ideia é a mesma de fazer uma
// média das últimas entradas de dinheiro pra saber quanto esperar chegar por
// mês, mesmo sem ter certeza do valor exato (salário pode variar um pouco por
// causa de hora extra, comissão, etc).
//
// Só entram receitas com frequencia 'unica' (um recebimento que já aconteceu
// de verdade, ex: "salário de agosto"). Uma receita 'mensal' (ex: um auxílio
// do governo com valor fixo, cadastrado como recorrente) não entra aqui —
// ela já é somada à parte dentro de calcularSaldoProjetado, então somar de
// novo aqui contaria ela duas vezes.
export function calcularRendaFixaMedia(transacoes: Transacao[]): number {
  const receitasAvulsas = transacoes.filter(
    (transacao) => transacao.tipo === 'receita' && transacao.frequencia === 'unica',
  );

  // Ordena da mais recente pra mais antiga (comparação de string ISO de novo,
  // igual explicado em formatarMes) e pega só as N últimas.
  const maisRecentesPrimeiro = [...receitasAvulsas].sort((a, b) => (a.data < b.data ? 1 : -1));
  const ultimosSalarios = maisRecentesPrimeiro.slice(0, QUANTIDADE_SALARIOS_PARA_MEDIA);

  if (ultimosSalarios.length === 0) {
    return 0;
  }

  const soma = ultimosSalarios.reduce((total, transacao) => total + transacao.valor, 0);
  return soma / ultimosSalarios.length;
}

export function calcularSaldoProjetado(
  transacoes: Transacao[],
  simulacoes: Simulacao[],
  mesInicial: string,
  quantidadeMeses: number,
  saldoInicial: number = 0,
  // Valor fixo somado como entrada em TODO mês projetado (normalmente o
  // resultado de calcularRendaFixaMedia). Fica de fora do saldo dos meses
  // passados/atuais reais porque essa é só uma estimativa pro futuro.
  rendaFixaMensal: number = 0,
): MesProjetado[] {
  const resultado: MesProjetado[] = [];
  let saldoAcumulado = saldoInicial;

  for (let i = 0; i < quantidadeMeses; i++) {
    const mes = adicionarMeses(mesInicial, i);
    let entradas = 0;
    let saidas = 0;
    // Se esse mês já tem alguma receita de verdade lançada (ex: o próprio
    // salário que gerou a média), não faz sentido SOMAR a renda fixa em cima
    // — ela é só uma estimativa pra preencher meses sem nenhum dado real.
    let jaTemReceitaRegistradaNesseMes = false;

    for (const transacao of transacoes) {
      const mesDaTransacao = formatarMes(transacao.data);
      const seAplicaEsseMes =
        transacao.frequencia === 'unica'
          ? mesDaTransacao === mes
          : mes >= mesDaTransacao &&
            (transacao.dataFim === null || mes <= formatarMes(transacao.dataFim));

      if (!seAplicaEsseMes) continue;

      if (transacao.tipo === 'receita') {
        entradas += transacao.valor;
        jaTemReceitaRegistradaNesseMes = true;
      } else {
        saidas += transacao.valor;
      }
    }

    if (!jaTemReceitaRegistradaNesseMes) {
      entradas += rendaFixaMensal;
    }

    for (const simulacao of simulacoes) {
      const mesDaPrimeiraParcela = formatarMes(simulacao.dataInicio);
      const numeroDaParcelaNesseMes = diferencaEmMeses(mes, mesDaPrimeiraParcela);
      const aindaTemParcelaNesseMes =
        numeroDaParcelaNesseMes >= 0 && numeroDaParcelaNesseMes < simulacao.parcelas;

      if (aindaTemParcelaNesseMes) {
        // Simplificação: divide igual entre as parcelas. Num app financeiro
        // "de verdade" a última parcela costuma absorver a diferença de
        // arredondamento (ex: R$100 em 3x vira 33,34 + 33,33 + 33,33), mas
        // isso fica pra depois — não é o que estamos resolvendo agora.
        saidas += simulacao.valorTotal / simulacao.parcelas;
      }
    }

    saldoAcumulado += entradas - saidas;
    resultado.push({ mes, entradas, saidas, saldo: saldoAcumulado });
  }

  return resultado;
}
