// Busca taxas públicas de referência (Selic, CDI, Tesouro RendA+) pra
// informar as simulações de Rendimento e Aposentadoria — o app nunca
// recomenda nada, só mostra o número público e deixa o usuário decidir se
// (e onde) usa. Única parte do app que fala com a internet — sempre sob
// demanda (o usuário precisa tocar "Atualizar"), nunca em segundo plano, e
// só LÊ dado público (nenhum dado do usuário sai do aparelho nesse
// processo). Ver texto de Privacidade em ConfiguracoesScreen.tsx.

// Uma linha do CSV oficial do Tesouro Transparente (Tesouro Direto).
export type LinhaTesouroDireto = {
  tipoTitulo: string;
  dataVencimento: string; // 'AAAA-MM-DD'
  dataBase: string; // 'AAAA-MM-DD'
  taxaCompra: number; // fração de porcentagem, ex: 7.13 = 7,13% ao ano
};

export type VencimentoRendaMais = {
  vencimento: string; // 'AAAA-MM-DD'
  taxaAnual: number; // porcentagem, ex: 7.13
};

export type TaxasReferencia = {
  selicMetaAnual: number | null;
  cdiAnualizadoAnual: number | null;
  tesouroRendaMais: VencimentoRendaMais[];
};

const CABECALHO_ESPERADO =
  'Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;PU Compra Manha;PU Venda Manha;PU Base Manha';

const NOME_RENDA_MAIS = 'Tesouro Renda+ Aposentadoria Extra';

// 'DD/MM/AAAA' -> 'AAAA-MM-DD', mesmo formato ISO usado no resto do app
// (ver comentário de Transacao.data em models.ts).
function converterDataBrParaIso(dataBr: string): string {
  const [dia, mes, ano] = dataBr.split('/');
  return `${ano}-${mes}-${dia}`;
}

// 'texto brasileiro de número' -> number (vírgula decimal). Mesma ideia de
// parsearValorMonetario, mas sem lidar com "R$"/milhar — o CSV já vem
// limpo, só com vírgula no lugar do ponto.
function converterNumeroBr(numeroBr: string): number {
  return Number(numeroBr.replace(',', '.'));
}

// Transforma o texto cru do CSV (ou só um pedaço dele — ver
// buscarTaxasReferencia, que busca só os primeiros bytes) em linhas
// estruturadas. Valida o cabeçalho esperado ANTES de tentar interpretar
// qualquer linha — se o governo mudar o formato do arquivo um dia, isso
// precisa falhar de forma explícita (erro visível pro usuário), não
// interpretar as colunas erradas silenciosamente.
export function parsearLinhasDoCsvTesouro(texto: string): LinhaTesouroDireto[] {
  const linhas = texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length === 0 || linhas[0] !== CABECALHO_ESPERADO) {
    throw new Error('O formato do arquivo de taxas do Tesouro Direto mudou — não dá pra confiar nesses dados.');
  }

  // Fatia final pode ter vindo cortada no meio de uma linha (a busca real
  // usa um Range de bytes, não de linhas) — a última linha, se incompleta
  // (menos colunas que o esperado), é descartada em vez de gerar um valor
  // quebrado.
  const colunasEsperadas = CABECALHO_ESPERADO.split(';').length;
  return linhas
    .slice(1)
    .map((linha) => linha.split(';'))
    .filter((colunas) => colunas.length === colunasEsperadas)
    .map(([tipoTitulo, dataVencimento, dataBase, taxaCompra]) => ({
      tipoTitulo,
      dataVencimento: converterDataBrParaIso(dataVencimento),
      dataBase: converterDataBrParaIso(dataBase),
      taxaCompra: converterNumeroBr(taxaCompra),
    }));
}

// Filtra só o Tesouro RendA+ Aposentadoria Extra (o título que o próprio
// Tesouro Nacional desenhou pra aposentadoria) na Data Base mais recente
// presente no texto — como o arquivo vem ordenado do mais recente pro mais
// antigo (ver plano de implementação), isso é sempre "o dia de hoje" na
// prática. Ordenado por vencimento (do mais próximo pro mais distante).
export function filtrarRendaMaisMaisRecente(linhas: LinhaTesouroDireto[]): VencimentoRendaMais[] {
  const doTitulo = linhas.filter((linha) => linha.tipoTitulo === NOME_RENDA_MAIS);
  if (doTitulo.length === 0) return [];

  const dataBaseMaisRecente = doTitulo.reduce(
    (maisRecente, linha) => (linha.dataBase > maisRecente ? linha.dataBase : maisRecente),
    doTitulo[0].dataBase,
  );

  return doTitulo
    .filter((linha) => linha.dataBase === dataBaseMaisRecente)
    .map((linha) => ({ vencimento: linha.dataVencimento, taxaAnual: linha.taxaCompra }))
    .sort((a, b) => (a.vencimento < b.vencimento ? -1 : 1));
}

// Converte uma taxa ANUAL (em porcentagem, ex: 7.13) pra taxa MENSAL
// equivalente (em fração, ex: 0.00575) — mesma família de juros compostos
// já usada em calcularValorDaParcela/calcularValorFuturoComAportes, só que
// "desconvertendo" ano pra mês em vez de compor mês a mês.
export function converterTaxaAnualParaMensal(taxaAnualPorcentagem: number): number {
  return Math.pow(1 + taxaAnualPorcentagem / 100, 1 / 12) - 1;
}

// Código das séries do SGS (Sistema Gerenciador de Séries Temporais) do
// Banco Central — as duas já vêm ANUALIZADAS, sem precisar converter nada:
// 432 = Meta Selic definida pelo Copom; 4389 = CDI anualizado (base 252).
const URL_SELIC = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json';
const URL_CDI = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
const URL_CSV_TESOURO =
  'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv';

// Generosa o suficiente pra cobrir um dia inteiro de linhas (confirmado
// nesta sessão: ~10-15KB reais por dia) sem nunca precisar baixar os
// 14,5MB do arquivo inteiro.
const BYTES_RANGE_CSV = 100_000;

async function buscarTaxaBcb(url: string): Promise<number | null> {
  const resposta = await fetch(url);
  if (!resposta.ok) return null;
  const dados = (await resposta.json()) as { valor: string }[];
  if (dados.length === 0) return null;
  return Number(dados[0].valor);
}

async function buscarRendaMais(): Promise<VencimentoRendaMais[]> {
  const resposta = await fetch(URL_CSV_TESOURO, {
    headers: { Range: `bytes=0-${BYTES_RANGE_CSV}` },
  });
  if (!resposta.ok && resposta.status !== 206) return [];
  const texto = await resposta.text();
  // Blindagem extra: se o servidor não respeitar o Range e devolver o
  // arquivo inteiro (ou algo bem maior que o esperado), corta ANTES de
  // parsear — não faz sentido processar 14,5MB numa ação de toque único.
  const linhas = parsearLinhasDoCsvTesouro(texto.slice(0, BYTES_RANGE_CSV * 2));
  return filtrarRendaMaisMaisRecente(linhas);
}

// Busca as três fontes em paralelo — uma falhando não derruba as outras
// (uma taxa faltando não deveria impedir mostrar as que funcionaram).
// Nunca lança: cada fonte que falhar simplesmente devolve null/[] no
// resultado, e quem chama decide como mostrar isso (ver
// useTaxasReferenciaStore.ts).
export async function buscarTaxasReferencia(): Promise<TaxasReferencia> {
  const [selic, cdi, rendaMais] = await Promise.all([
    buscarTaxaBcb(URL_SELIC).catch(() => null),
    buscarTaxaBcb(URL_CDI).catch(() => null),
    buscarRendaMais().catch(() => [] as VencimentoRendaMais[]),
  ]);

  return { selicMetaAnual: selic, cdiAnualizadoAnual: cdi, tesouroRendaMais: rendaMais };
}
