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

export function calcularSaldoProjetado(
  transacoes: Transacao[],
  simulacoes: Simulacao[],
  mesInicial: string,
  quantidadeMeses: number,
  saldoInicial: number = 0,
): MesProjetado[] {
  const resultado: MesProjetado[] = [];
  let saldoAcumulado = saldoInicial;

  for (let i = 0; i < quantidadeMeses; i++) {
    const mes = adicionarMeses(mesInicial, i);
    let entradas = 0;
    let saidas = 0;

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
      } else {
        saidas += transacao.valor;
      }
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
