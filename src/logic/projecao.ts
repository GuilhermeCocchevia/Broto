// O coração do "simulador do futuro": pega as transações e simulações que já
// existem e calcula o saldo projetado mês a mês. Não depende de React, Zustand
// nem SQLite — só recebe arrays e devolve números. Isso é de propósito: lógica
// pura é muito mais fácil de testar (ver projecao.test.ts) do que lógica
// misturada com tela.
import type { Transacao, Simulacao, SaldoInicial } from '../types/models';
import type { EstimativaDeGastos } from './estimativaDeGastos';
import { normalizarTexto } from '../utils/normalizarTexto';
import { dataLocalDeTimestamp, hojeLocal } from '../utils/dataLocal';

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

// Data mais recente dentro de um grupo de transações (assume grupo não
// vazio) — usada só pra desempatar categorias com a mesma quantidade de
// lançamentos, ver calcularRendaFixaMedia.
function dataMaisRecente(grupo: Transacao[]): string {
  return grupo.reduce((maisRecente, transacao) => (transacao.data > maisRecente ? transacao.data : maisRecente), grupo[0].data);
}

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
//
// Bug real encontrado testando com dados realistas: pegar simplesmente as 3
// receitas avulsas mais recentes (de QUALQUER categoria) deixa um freelance
// ou presente pontual "empurrar" o salário de verdade pra fora da média,
// distorcendo a projeção. A renda FIXA é a que se repete — por isso primeiro
// agrupamos por categoria e usamos só a categoria com mais lançamentos (a
// mais provável de ser a renda recorrente); empate é desfeito pela categoria
// com o lançamento mais recente.
export function calcularRendaFixaMedia(transacoes: Transacao[]): number {
  const receitasAvulsas = transacoes.filter(
    (transacao) => transacao.tipo === 'receita' && transacao.frequencia === 'unica',
  );

  if (receitasAvulsas.length === 0) {
    return 0;
  }

  const porCategoria = new Map<string, Transacao[]>();
  for (const transacao of receitasAvulsas) {
    const grupo = porCategoria.get(transacao.categoriaId) ?? [];
    grupo.push(transacao);
    porCategoria.set(transacao.categoriaId, grupo);
  }

  let categoriaEscolhida: Transacao[] = [];
  for (const grupo of porCategoria.values()) {
    const temMaisLancamentos = grupo.length > categoriaEscolhida.length;
    const empatouMasEhMaisRecente =
      grupo.length === categoriaEscolhida.length &&
      categoriaEscolhida.length > 0 &&
      dataMaisRecente(grupo) > dataMaisRecente(categoriaEscolhida);

    if (temMaisLancamentos || empatouMasEhMaisRecente) {
      categoriaEscolhida = grupo;
    }
  }

  // Ordena da mais recente pra mais antiga (comparação de string ISO de novo,
  // igual explicado em formatarMes) e pega só as N últimas dessa categoria.
  const maisRecentesPrimeiro = [...categoriaEscolhida].sort((a, b) => (a.data < b.data ? 1 : -1));
  const ultimosRecebimentos = maisRecentesPrimeiro.slice(0, QUANTIDADE_SALARIOS_PARA_MEDIA);

  const soma = ultimosRecebimentos.reduce((total, transacao) => total + transacao.valor, 0);
  return soma / ultimosRecebimentos.length;
}

// Média de despesas AVULSAS (frequencia 'unica' — não fixas) nos últimos
// `quantidadeMeses` meses FECHADOS, terminando em `mesFinal` (inclusive).
// Papel simétrico a calcularRendaFixaMedia, do lado das despesas: estima
// um "gasto variável típico" pra preencher meses futuros que ainda não
// têm despesa avulsa nenhuma registrada (ver calcularSaldoProjetado).
//
// Bug real que motivou essa função existir: sem ela, toda projeção de
// meses futuros assumia SILENCIOSAMENTE que a pessoa só teria despesas
// FIXAS dali em diante — nenhuma compra de mercado, lazer, imprevisto,
// nada. Isso inflava artificialmente a viabilidade de qualquer simulação
// de prazo longo (parecia sempre sobrar dinheiro nos meses seguintes,
// mesmo pra quem historicamente gasta bastante em despesas avulsas).
//
// Só avulsas: despesas recorrentes (frequencia 'mensal') já entram na
// conta à parte dentro do loop de calcularSaldoProjetado — somar aqui de
// novo duplicaria o valor (mesmo cuidado do comentário em
// calcularRendaFixaMedia).
export function calcularDespesaVariavelMedia(
  transacoes: Transacao[],
  mesFinal: string,
  quantidadeMeses: number,
): number {
  if (quantidadeMeses <= 0) return 0;

  let soma = 0;
  let mes = mesFinal;
  for (let i = 0; i < quantidadeMeses; i++) {
    soma += transacoes
      .filter((t) => t.tipo === 'despesa' && t.frequencia === 'unica' && transacaoSeAplicaNoMes(t, mes))
      .reduce((total, t) => total + t.valor, 0);
    mes = adicionarMeses(mes, -1);
  }

  return soma / quantidadeMeses;
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

// A partir de "repete por quantos meses" (o jeito que o usuário pensa numa
// transação recorrente — ex: um financiamento de 12x, uma assinatura anual
// de 12 meses), calcula a `dataFim` de verdade que o banco guarda (ver
// schema.ts) — o app só entende "até que mês", não "quantos meses". O dia
// escolhido é o mesmo dia da transação original (ou o último dia do mês,
// se esse mês não tiver esse dia — ver dataDoDiaNoMes), pra continuar
// parecendo uma cobrança recorrente de verdade, não um corte arbitrário.
export function calcularDataFimPorQuantidadeDeMeses(
  dataInicio: string,
  quantidadeDeMeses: number,
): string {
  // -1 porque o próprio mês de início já conta como "mês 1" do intervalo —
  // "repete por 1 mês" significa "só esse mês mesmo", sem somar mais nenhum.
  const mesFinal = adicionarMeses(formatarMes(dataInicio), quantidadeDeMeses - 1);
  const dia = Number(dataInicio.slice(8, 10));
  return dataDoDiaNoMes(mesFinal, dia);
}

// Caminho inverso de calcularDataFimPorQuantidadeDeMeses — usado só pra
// pré-preencher o formulário de edição com o número que a pessoa realmente
// tinha em mente (o banco só guarda a data calculada, não a quantidade).
export function calcularQuantidadeDeMesesPorDataFim(dataInicio: string, dataFim: string): number {
  return diferencaEmMeses(formatarMes(dataFim), formatarMes(dataInicio)) + 1;
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
  hoje: string = hojeLocal(),
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
  // `criadoEm` é um timestamp em UTC; a data que interessa é a do dia em que a
  // pessoa informou o saldo, no fuso dela — senão um saldo informado à noite
  // "empurrava" o checkpoint pro dia seguinte e escondia os lançamentos dele.
  const dataReferencia = dataLocalDeTimestamp(maisRecente.criadoEm);

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

// Valor de cada parcela de uma compra simulada, com ou sem juros. Sem juros
// (taxa 0) é só dividir igual — mesma conta de sempre. Com juros, usa a
// fórmula de amortização por parcelas fixas (Tabela Price, o método padrão
// de parcelamento de cartão de crédito no Brasil): a parcela é sempre o
// mesmo valor todo mês, mas o total pago acaba sendo maior que valorTotal —
// a diferença é o juros. `taxaJurosMensal` é uma fração (0.02 = 2% ao mês),
// não porcentagem inteira.
export function calcularValorDaParcela(
  valorTotal: number,
  parcelas: number,
  taxaJurosMensal: number,
): number {
  if (taxaJurosMensal === 0) {
    return valorTotal / parcelas;
  }

  // Fórmula de amortização: parcela = valorTotal * (i * (1+i)^n) / ((1+i)^n - 1).
  const fatorDeJuros = Math.pow(1 + taxaJurosMensal, parcelas);
  return (valorTotal * taxaJurosMensal * fatorDeJuros) / (fatorDeJuros - 1);
}

// Quanto de juros a mais o parcelamento custa no total, comparado a pagar
// valorTotal à vista — o número que mais importa pro usuário DECIDIR se vale
// a pena parcelar com juros ou não.
export function calcularJurosTotal(valorTotal: number, parcelas: number, taxaJurosMensal: number): number {
  const totalPago = calcularValorDaParcela(valorTotal, parcelas, taxaJurosMensal) * parcelas;
  return totalPago - valorTotal;
}

// Valor futuro de uma série de aportes mensais iguais, rendendo juros
// compostos mês a mês (fórmula clássica de "valor futuro de uma anuidade")
// — o oposto de calcularValorDaParcela: aquela reparte um total JÁ EXISTENTE
// em parcelas; esta acumula aportes MENSAIS que crescem com o tempo. Usada
// pela simulação de tipo 'rendimento' — nunca recomenda uma taxa, só faz a
// conta com a taxa que o próprio usuário informou.
//
// `aporteInicial` (opcional, default 0) é um valor que já entra rendendo
// desde o mês 1 — ao contrário dos aportes mensais (cada um rende só a
// partir do mês em que entra), ele compõe juros pelos `meses` inteiros,
// igual um valor investido de uma vez só (fórmula clássica de "valor
// presente -> valor futuro").
export function calcularValorFuturoComAportes(
  aporteMensal: number,
  taxaMensal: number,
  meses: number,
  aporteInicial: number = 0,
): number {
  if (taxaMensal === 0) return aporteInicial + aporteMensal * meses;
  const fatorDosAportes = (Math.pow(1 + taxaMensal, meses) - 1) / taxaMensal;
  const fatorDoInicial = Math.pow(1 + taxaMensal, meses);
  return aporteInicial * fatorDoInicial + aporteMensal * fatorDosAportes;
}

// Quanto uma simulação desconta do saldo disponível por mês. Só 'compra'
// tem juros de verdade afetando esse valor (amortização de parcelamento);
// 'economia' e 'rendimento' sempre saem como divisão simples
// (valorTotal/parcelas), mesmo quando 'rendimento' tem uma taxa guardada em
// `taxaJurosMensal` — pra esse tipo, o campo significa "taxa de rendimento
// esperada" (usada só em calcularValorFuturoComAportes), não custo de
// parcelamento, e não pode entrar na fórmula de amortização ou infla o
// valor que sai do saldo sem motivo.
export function calcularParcelaEfetiva(simulacao: Simulacao): number {
  const taxaDeCustoDoParcelamento = simulacao.tipo === 'compra' ? simulacao.taxaJurosMensal : 0;
  return calcularValorDaParcela(simulacao.valorTotal, simulacao.parcelas, taxaDeCustoDoParcelamento);
}

// Quanto uma simulação tira do saldo disponível NUM MÊS ESPECÍFICO — quase
// sempre é só a parcela normal (calcularParcelaEfetiva), mas no primeiro
// mês da simulação soma também o `aporteInicial` (ver comentário no tipo
// Simulacao, em models.ts): esse valor sai do bolso uma vez só, junto da
// primeira parcela, não é dividido entre todos os meses como o aporte
// recorrente. Pra 'compra'/'economia', `aporteInicial` é sempre 0, então
// isso não muda nada de comportamento pra esses dois tipos.
export function calcularSaidaEfetivaNoMes(simulacao: Simulacao, mes: string): number {
  const parcela = calcularParcelaEfetiva(simulacao);
  const ehPrimeiroMes = formatarMes(simulacao.dataInicio) === mes;
  return ehPrimeiroMes ? parcela + simulacao.aporteInicial : parcela;
}

// Uma simulação "está ativa" num mês se esse mês cai dentro da janela de
// parcelas dela (da primeira até a última) — mesma ideia de
// transacaoSeAplicaNoMes, só que pra Simulacao. Extraída do loop de
// calcularSaldoProjetado porque src/logic/sobraMensal.ts precisa responder
// exatamente essa mesma pergunta pra saber quanto já está comprometido com
// simulações num mês, sem duplicar a conta.
export function simulacaoAtivaNoMes(simulacao: Simulacao, mes: string): boolean {
  const mesDaPrimeiraParcela = formatarMes(simulacao.dataInicio);
  const numeroDaParcelaNesseMes = diferencaEmMeses(mes, mesDaPrimeiraParcela);
  return numeroDaParcelaNesseMes >= 0 && numeroDaParcelaNesseMes < simulacao.parcelas;
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
  // Estimativa de gastos avulsos (ver estimarGastosFuturos). Com ela, a
  // referência é o mês ATUAL e o histórico recente, não importa quando a
  // simulação começa — corrige o caso em que uma simulação começando num
  // mês futuro herdava R$0 de gasto variável (o mês ainda não tem lançamento
  // nenhum) e ficava viável no papel. Sem ela (padrão), vale a regra antiga
  // ancorada em `mesInicial`, descrita logo abaixo.
  estimativa?: EstimativaDeGastos,
): MesProjetado[] {
  const resultado: MesProjetado[] = [];
  let saldoAcumulado = saldoInicial;
  // Estimativa de despesa VARIÁVEL (avulsa) pros meses futuros que ainda
  // não têm despesa avulsa própria registrada — baseada no PRÓPRIO mês
  // base da projeção (`mesInicial`, o primeiro mês da janela), não numa
  // média histórica de meses passados. Pedido explícito do usuário: se a
  // pessoa gasta R$X em despesas avulsas no mês em que a simulação
  // começa, o jeito mais realista de projetar os meses seguintes é
  // assumir que ela vai manter esse mesmo padrão — não que vai parar de
  // gastar em mercado/lazer/imprevisto do nada a partir do mês 2.
  // `calcularDespesaVariavelMedia(transacoes, mesInicial, 1)` é só o
  // total de despesas avulsas do próprio `mesInicial` (janela de 1 mês
  // só) — reaproveita a mesma função, sem duplicar lógica.
  //
  // Sem isso, todo mês futuro sem despesa avulsa própria assumia
  // silenciosamente "só despesa fixa daqui pra frente", inflando a
  // viabilidade de qualquer simulação de prazo mais longo.
  const despesaVariavelMediaMensal = estimativa ? 0 : calcularDespesaVariavelMedia(transacoes, mesInicial, 1);
  const chavesRecorrentes = new Set(estimativa?.recorrentesNaPratica.map((r) => r.chave) ?? []);

  for (let i = 0; i < quantidadeMeses; i++) {
    const mes = adicionarMeses(mesInicial, i);
    let entradas = 0;
    let saidas = 0;
    // Se esse mês já tem uma receita AVULSA de verdade lançada (ex: o
    // próprio salário que gerou a média), não faz sentido SOMAR a renda
    // fixa em cima — ela é só uma estimativa pra preencher meses sem
    // nenhum dado real. Bug real encontrado testando com dados robustos:
    // isso estava marcado como "já tem receita" pra QUALQUER receita,
    // inclusive 'mensal' (ex: um benefício fixo de R$300) — um benefício
    // recorrente pequeno estava silenciando a renda fixa projetada inteira
    // (às vezes R$3.000+) em todo mês futuro, fazendo o saldo despencar na
    // projeção sem motivo real. Receita 'mensal' é um valor certo à parte,
    // não uma substituta da estimativa de salário — só receita 'unica'
    // conta como "já registrado esse mês" pra esse propósito.
    let jaTemReceitaRegistradaNesseMes = false;
    // Mesmo raciocínio, espelhado pro lado da despesa avulsa (ver
    // despesaVariavelMediaMensal acima).
    let jaTemDespesaAvulsaRegistradaNesseMes = false;
    // Só usados com `estimativa`: quanto do gasto avulso REAL do mês é
    // "variável de verdade" (não recorrente na prática), e quais
    // recorrentes na prática já têm lançamento real nesse mês.
    let avulsasVariaveisReaisNoMes = 0;
    const chavesAvulsasDoMes = new Set<string>();

    for (const transacao of transacoes) {
      if (!transacaoSeAplicaNoMes(transacao, mes)) continue;

      if (transacao.tipo === 'receita') {
        entradas += transacao.valor;
        if (transacao.frequencia === 'unica') {
          jaTemReceitaRegistradaNesseMes = true;
        }
      } else {
        saidas += transacao.valor;
        if (transacao.frequencia === 'unica') {
          jaTemDespesaAvulsaRegistradaNesseMes = true;
          if (estimativa) {
            const chave = normalizarTexto(transacao.descricao);
            chavesAvulsasDoMes.add(chave);
            if (!chavesRecorrentes.has(chave)) avulsasVariaveisReaisNoMes += transacao.valor;
          }
        }
      }
    }

    if (!jaTemReceitaRegistradaNesseMes) {
      entradas += rendaFixaMensal;
    }
    if (estimativa) {
      // Meses ANTERIORES ao atual são histórico: só o que foi lançado.
      if (mes === estimativa.mesAtual) {
        // Mês atual: a estimativa já tem como piso o que foi gasto até
        // agora, então completa só a diferença — o mês inteiro vale a
        // estimativa, sem contar o já lançado duas vezes.
        saidas += Math.max(0, estimativa.gastoVariavelMensal - avulsasVariaveisReaisNoMes);
      } else if (mes > estimativa.mesAtual) {
        // Mês futuro: o gasto do dia a dia ACONTECE além de qualquer compra
        // planejada já lançada pra ele, então soma por cima (a regra antiga
        // zerava a estimativa se houvesse uma avulsa qualquer no mês).
        saidas += estimativa.gastoVariavelMensal;
      }
      // Recorrentes na prática (ex: fatura de cartão lançada como avulsa
      // todo mês): valem de agora em diante, exceto no mês em que o lançamento
      // real já existe (o dado real vence a estimativa).
      if (mes >= estimativa.mesAtual) {
        for (const recorrente of estimativa.recorrentesNaPratica) {
          if (!chavesAvulsasDoMes.has(recorrente.chave)) saidas += recorrente.valorMensal;
        }
      }
    } else if (!jaTemDespesaAvulsaRegistradaNesseMes) {
      saidas += despesaVariavelMediaMensal;
    }

    for (const simulacao of simulacoes) {
      if (simulacaoAtivaNoMes(simulacao, mes)) {
        // Simplificação que ainda fica de fora: a última parcela costuma
        // absorver a diferença de arredondamento num parcelamento de
        // verdade (ex: R$100 em 3x vira 33,34 + 33,33 + 33,33) — aqui todas
        // as parcelas têm exatamente o mesmo valor. Diferença de centavos,
        // não afeta a decisão que a projeção existe pra ajudar a tomar.
        saidas += calcularSaidaEfetivaNoMes(simulacao, mes);
      }
    }

    saldoAcumulado += entradas - saidas;
    resultado.push({ mes, entradas, saidas, saldo: saldoAcumulado });
  }

  return resultado;
}

// A renda esperada num mês: receitas recorrentes ativas + receitas avulsas
// lançadas nele, ou, se o mês não tem nenhuma avulsa, a estimativa
// `rendaFixaMensal` (ver calcularRendaFixaMedia). Reaproveita
// calcularSaldoProjetado (sem simulação nenhuma) só pelas `entradas` de um mês
// — a regra "só soma a média se ainda não tem receita avulsa" fica num lugar
// só. Antes essa mesma conta estava copiada no Dashboard e no Simulador.
export function calcularRendaEsperadaDoMes(
  transacoes: Transacao[],
  mes: string,
  rendaFixaMensal: number,
): number {
  return calcularSaldoProjetado(transacoes, [], mes, 1, 0, rendaFixaMensal)[0].entradas;
}

// Resultado de avaliar UMA simulação (compra ou meta de economia) contra a
// vida financeira real do usuário — ver avaliarViabilidadeSimulacao logo
// abaixo.
export type ResultadoViabilidade = {
  viavel: boolean;
  meses: MesProjetado[];
  piorMes: string;
  piorSaldo: number;
};

// "Quanto eu precisaria gastar A MENOS por mês pra essa simulação caber?" —
// a resposta que faz mais sentido pra uma meta de economia ou investimento,
// onde o valor guardado é o objetivo (não faz sentido sugerir guardar
// menos), então o que sobra pra ajustar são as despesas.
//
// Cortar R$r por mês em TODOS os meses da janela melhora o saldo do mês de
// índice i em r*(i+1) (o corte de cada mês anterior se acumula). Pra
// nenhum mês ficar negativo, o corte precisa ser, no mínimo, o maior
// `-saldo / (i+1)` entre os meses negativos — não basta olhar só o pior
// saldo, porque um mês mais cedo com saldo um pouco menos negativo pode
// exigir um corte MAIOR (há menos meses pra acumular a economia).
// Arredonda pra CIMA em centavos pra o corte sugerido nunca ficar
// milimetricamente curto.
export function calcularReducaoMensalNecessaria(meses: MesProjetado[]): number {
  let reducao = 0;
  meses.forEach((mes, indice) => {
    if (mes.saldo >= 0) return;
    reducao = Math.max(reducao, -mes.saldo / (indice + 1));
  });
  return Math.ceil(reducao * 100) / 100;
}

// A pergunta que o Simulador existe pra responder: "dá pra fazer essa
// compra (ou bater essa meta) de verdade, considerando o que eu realmente
// ganho e gasto?" — não só "cabe numa projeção hipotética qualquer". Um
// caso particular de avaliarViabilidadeConjunta (logo abaixo) pra quando é
// só UMA simulação — ver lá o raciocínio completo da janela avaliada.
export function avaliarViabilidadeSimulacao(
  simulacao: Simulacao,
  transacoes: Transacao[],
  saldoAtual: number,
  rendaFixaMensal: number,
  estimativa?: EstimativaDeGastos,
): ResultadoViabilidade {
  return avaliarViabilidadeConjunta([simulacao], transacoes, saldoAtual, rendaFixaMensal, estimativa);
}

// Mesma pergunta de avaliarViabilidadeSimulacao, só que pra VÁRIAS
// simulações ao mesmo tempo — "dá pra fazer essa compra E bater essa meta
// de economia juntas, com o que eu realmente ganho e gasto?". Não precisou
// de nenhuma mudança em calcularSaldoProjetado pra isso: ela já aceita um
// array de simulações desde sempre, só faltava decidir a janela certa de
// meses a avaliar.
//
// A janela vai do INÍCIO da simulação que começa mais cedo até o FIM da que
// termina mais tarde — cobrindo o período inteiro em que pelo menos uma
// delas ainda está consumindo dinheiro. Fora dessa janela (antes de todas
// começarem, ou depois de todas terminarem) não tem nada rodando, não tem o
// que avaliar.
//
// Mesmo raciocínio de "pular o mês atual" NÃO se aplica aqui (igual no caso
// de uma simulação só): a regra de pular o mês atual existe só pra
// TRANSAÇÕES REAIS, que já estão embutidas em `saldoAtual` — uma simulação
// (hipotética) nunca esteve.
//
// Limitação assumida (mesma do caso de uma simulação só): se alguma
// `dataInicio` for uma data passada, a conta usa `saldoAtual` (o saldo de
// HOJE) como base pra um mês que já passou — caso raro, não vale a
// complexidade de buscar saldo histórico agora.
export function avaliarViabilidadeConjunta(
  simulacoes: Simulacao[],
  transacoes: Transacao[],
  saldoAtual: number,
  rendaFixaMensal: number,
  estimativa?: EstimativaDeGastos,
): ResultadoViabilidade {
  // Sem nenhuma simulação, não tem janela nenhuma pra avaliar — devolve um
  // resultado trivialmente viável (não há função de `.reduce` que funcione
  // num array vazio logo abaixo, então esse caso precisa sair cedo).
  if (simulacoes.length === 0) {
    return { viavel: true, meses: [], piorMes: '', piorSaldo: saldoAtual };
  }

  const mesesDeInicio = simulacoes.map((s) => formatarMes(s.dataInicio));
  const mesesDeFim = simulacoes.map((s) => adicionarMeses(formatarMes(s.dataInicio), s.parcelas - 1));
  const mesInicial = mesesDeInicio.reduce((menor, atual) => (atual < menor ? atual : menor));
  const mesFinal = mesesDeFim.reduce((maior, atual) => (atual > maior ? atual : maior));
  const quantidadeMeses = diferencaEmMeses(mesFinal, mesInicial) + 1;

  const meses = calcularSaldoProjetado(
    transacoes,
    simulacoes,
    mesInicial,
    quantidadeMeses,
    saldoAtual,
    rendaFixaMensal,
    estimativa,
  );

  // Sempre existe um "pior mês" (mesmo que a janela seja de 1 mês só) — o
  // menor saldo acumulado durante toda a janela combinada.
  const piorMesProjetado = meses.reduce(
    (pior, atual) => (atual.saldo < pior.saldo ? atual : pior),
    meses[0],
  );

  return {
    viavel: piorMesProjetado.saldo >= 0,
    meses,
    piorMes: piorMesProjetado.mes,
    piorSaldo: piorMesProjetado.saldo,
  };
}
