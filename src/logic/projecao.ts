// O coração do "simulador do futuro": pega as transações e simulações que já
// existem e calcula o saldo projetado mês a mês. Não depende de React, Zustand
// nem SQLite — só recebe arrays e devolve números. Isso é de propósito: lógica
// pura é muito mais fácil de testar (ver projecao.test.ts) do que lógica
// misturada com tela.
import type { Transacao, Simulacao, SaldoInicial } from '../types/models';

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
// Exportada porque a tela do Simulador também precisa dela, pra calcular
// "o mês que vem" a partir de hoje (ver obterSaldoAtual mais abaixo).
export function adicionarMeses(mesBase: string, quantidade: number): string {
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

// Uma transação "se aplica" a um mês se: for única e tiver acontecido nesse
// mês exato, ou for mensal e esse mês estiver dentro do intervalo dela
// (começou antes ou nesse mês, e ainda não passou de dataFim). Extraída
// porque tanto a projeção quanto as métricas de saúde financeira (gasto por
// categoria, taxa de poupança) precisam responder exatamente essa mesma
// pergunta — antes essa lógica só existia dentro do loop de
// calcularSaldoProjetado.
export function transacaoSeAplicaNoMes(transacao: Transacao, mes: string): boolean {
  const mesDaTransacao = formatarMes(transacao.data);
  return transacao.frequencia === 'unica'
    ? mesDaTransacao === mes
    : mes >= mesDaTransacao && (transacao.dataFim === null || mes <= formatarMes(transacao.dataFim));
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

// Devolve a data 'AAAA-MM-DD' do dia `diaDoMes` dentro do mês 'AAAA-MM' — mas
// "grudada" no último dia do mês quando ele não tem dias suficientes (ex: dia
// 31 num mês 'AAAA-02' vira o dia 28, ou 29 em ano bissexto). É o mesmo
// comportamento que cobranças recorrentes de cartão costumam ter na vida real.
function dataDoDiaNoMes(mes: string, diaDoMes: number): string {
  const [ano, mesNumero] = mes.split('-').map(Number);
  // new Date(ano, mesNumero, 0) devolve o dia 0 do mês seguinte — que em JS
  // significa "o último dia do mês anterior" (aqui, o próprio `mesNumero`,
  // já que ele é 1-indexado e o segundo argumento do Date é 0-indexado).
  const ultimoDiaDoMes = new Date(ano, mesNumero, 0).getDate();
  const diaClampado = Math.min(diaDoMes, ultimoDiaDoMes);
  return `${mes}-${String(diaClampado).padStart(2, '0')}`;
}

// Quantas vezes uma transação recorrente ('mensal') já ocorreu de VERDADE,
// contando só entre `dataReferencia` (exclusive) e `hoje` (inclusive). Difere
// de calcularSaldoProjetado: aqui a data importa (uma assinatura que cobra no
// dia 20 ainda não "aconteceu" se hoje é dia 14), porque isso alimenta o saldo
// real — já a projeção trabalha em blocos de mês inteiro porque o futuro é só
// estimativa mesmo, não teria sentido fingir precisão de dia lá.
function contarOcorrenciasMensais(
  transacao: Transacao,
  dataReferencia: string,
  hoje: string,
): number {
  const diaDoMes = Number(transacao.data.slice(8, 10));
  const mesDoFim = transacao.dataFim === null ? null : formatarMes(transacao.dataFim);
  const mesLimite = mesDoFim !== null && mesDoFim < formatarMes(hoje) ? mesDoFim : formatarMes(hoje);

  let contagem = 0;
  let mes = formatarMes(transacao.data);
  while (mes <= mesLimite) {
    const dataDaOcorrencia = dataDoDiaNoMes(mes, diaDoMes);
    if (dataDaOcorrencia > dataReferencia && dataDaOcorrencia <= hoje) {
      contagem++;
    }
    mes = adicionarMeses(mes, 1);
  }

  return contagem;
}

// Pega o saldo atual de VERDADE: parte do último saldo informado pelo usuário
// (como nunca fazemos UPDATE nessa tabela, é sempre a linha com criadoEm mais
// recente) e soma o impacto de tudo que já aconteceu DEPOIS daquele dia — sem
// isso, lançar uma transação hoje não mudaria o saldo mostrado até o usuário
// atualizar o saldo manualmente de novo, o que contradiz a própria ideia de
// "saldo atual". Sem nenhum saldo informado ainda, 0 é a única resposta
// razoável (não dá pra saber um valor absoluto só a partir de variações).
export function obterSaldoAtual(
  saldosIniciais: SaldoInicial[],
  transacoes: Transacao[] = [],
  // Injetado (em vez de calcular `new Date()` aqui dentro) pra função continuar
  // pura e fácil de testar — mesmo raciocínio de calcularSaldoProjetado receber
  // `mesInicial` de fora. Mesma convenção de fuso (ISO/UTC) já usada em
  // SimuladorScreen pro "mês atual".
  hoje: string = new Date().toISOString().slice(0, 10),
): number {
  if (saldosIniciais.length === 0) {
    return 0;
  }

  const maisRecente = saldosIniciais.reduce((atual, candidato) =>
    candidato.criadoEm > atual.criadoEm ? candidato : atual,
  );

  // O saldo informado já reflete tudo até o dia em que foi cadastrado — só
  // contamos o impacto do que aconteceu DEPOIS dessa data, pra não somar de
  // novo algo que o próprio valor informado já carrega embutido.
  const dataReferencia = maisRecente.criadoEm.slice(0, 10);

  const impacto = transacoes.reduce((total, transacao) => {
    const sinal = transacao.tipo === 'receita' ? 1 : -1;

    if (transacao.frequencia === 'unica') {
      const jaAconteceu = transacao.data > dataReferencia && transacao.data <= hoje;
      return jaAconteceu ? total + sinal * transacao.valor : total;
    }

    const ocorrencias = contarOcorrenciasMensais(transacao, dataReferencia, hoje);
    return total + sinal * transacao.valor * ocorrencias;
  }, 0);

  return maisRecente.valor + impacto;
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
      if (!transacaoSeAplicaNoMes(transacao, mes)) continue;

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
