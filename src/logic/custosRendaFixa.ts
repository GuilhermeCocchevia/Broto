// Custos reais que incidem sobre renda fixa no Brasil — sem eles, uma
// simulação de décadas (Aposentadoria) superestima bastante o resultado
// final, mesmo os percentuais parecendo pequenos de cara. Números
// pesquisados nesta sessão (tarifário público da B3, tabela pública da
// Receita Federal), não estimativas — ver o plano de implementação pra
// as fontes.
import { calcularValorFuturoComAportes } from './projecao';

// Tabela regressiva de IR pra renda fixa: incide só sobre o GANHO (nunca
// sobre o total investido), retida uma vez só no resgate/vencimento — não
// mensalmente. Quanto mais tempo o dinheiro fica investido, menor a
// alíquota; acima de 720 dias (2 anos) já é sempre a mínima.
export function calcularAliquotaIR(diasCorridos: number): number {
  if (diasCorridos <= 180) return 0.225;
  if (diasCorridos <= 360) return 0.2;
  if (diasCorridos <= 720) return 0.175;
  return 0.15;
}

// Tarifário público da B3: 0,20% ao ano sobre o valor do título — isento
// só pra Tesouro Selic até R$10.000 por CPF (não se aplica ao Tesouro
// RendA+, usado na Aposentadoria, que nunca é isento).
export const TAXA_CUSTODIA_B3_ANUAL = 0.002;

export type ResultadoLiquido = {
  totalAportado: number;
  valorFuturoBruto: number;
  ganhoBruto: number;
  aliquotaIR: number;
  impostoPago: number;
  valorFuturoLiquido: number;
};

// Projeta o valor futuro já líquido de custos: desconta a custódia B3 da
// taxa ANTES de compor os juros (reduz o rendimento ano a ano, do jeito que
// realmente acontece), e desconta o IR regressivo do GANHO uma vez só no
// final — mesma mecânica de como a tributação de renda fixa funciona de
// verdade, não um desconto genérico solto.
//
// `aporteInicial` (opcional, default 0) é um valor que a pessoa já tem
// guardado e quer incluir na simulação (ver comentário no tipo Simulacao) —
// entra na mesma conta de juros compostos que os aportes mensais, e no
// mesmo total aportado (pra `ganhoBruto` sair certo).
export function calcularValorFuturoLiquido(
  aporteMensal: number,
  taxaMensalBruta: number,
  meses: number,
  descontarCustodiaB3: boolean,
  aporteInicial: number = 0,
): ResultadoLiquido {
  const taxaMensalLiquidaDeCustodia = descontarCustodiaB3
    ? Math.max(0, taxaMensalBruta - TAXA_CUSTODIA_B3_ANUAL / 12)
    : taxaMensalBruta;
  const valorFuturoBruto = calcularValorFuturoComAportes(
    aporteMensal,
    taxaMensalLiquidaDeCustodia,
    meses,
    aporteInicial,
  );
  const totalAportado = aporteInicial + aporteMensal * meses;
  const ganhoBruto = valorFuturoBruto - totalAportado;
  const aliquotaIR = calcularAliquotaIR(meses * 30);
  const impostoPago = Math.max(0, ganhoBruto) * aliquotaIR;
  return {
    totalAportado,
    valorFuturoBruto,
    ganhoBruto,
    aliquotaIR,
    impostoPago,
    valorFuturoLiquido: valorFuturoBruto - impostoPago,
  };
}

// O inverso de calcularValorFuturoLiquido: "quanto eu quero TER" (valor
// futuro BRUTO desejado) -> "quanto preciso guardar por mês pra chegar
// lá". É essa pergunta que Rendimento/Aposentadoria realmente respondem —
// pedir "quanto guardar" e só dividir pelos meses (sem juros nenhum)
// ignorava o próprio rendimento que a simulação existe pra calcular.
// Mesma transformação de taxa (custódia B3 embutida antes de compor) que
// calcularValorFuturoLiquido usa, só que resolvendo a fórmula de anuidade
// pro aporte em vez do valor futuro:
// valorFuturo = aporte * fator  =>  aporte = valorFuturo / fator.
//
// `aporteInicial` (opcional, default 0) reduz o aporte mensal necessário:
// primeiro desconta do alvo o quanto ELE SOZINHO já vai render até lá
// (`aporteInicial` composto pelos mesmos `meses`), e só resolve a conta do
// aporte mensal pro que sobrar. Se o aporte inicial sozinho já alcança (ou
// passa) o alvo, o aporte mensal necessário é 0 — `Math.max` evita devolver
// um número negativo, que não faz sentido nesse contexto.
export function calcularAporteNecessario(
  valorFuturoDesejado: number,
  taxaMensalBruta: number,
  meses: number,
  descontarCustodiaB3: boolean,
  aporteInicial: number = 0,
): number {
  const taxaMensalLiquidaDeCustodia = descontarCustodiaB3
    ? Math.max(0, taxaMensalBruta - TAXA_CUSTODIA_B3_ANUAL / 12)
    : taxaMensalBruta;
  const fatorDoInicial =
    taxaMensalLiquidaDeCustodia === 0 ? 1 : Math.pow(1 + taxaMensalLiquidaDeCustodia, meses);
  const fatorDosAportes =
    taxaMensalLiquidaDeCustodia === 0
      ? meses
      : (Math.pow(1 + taxaMensalLiquidaDeCustodia, meses) - 1) / taxaMensalLiquidaDeCustodia;
  const restanteAposInicial = valorFuturoDesejado - aporteInicial * fatorDoInicial;
  return Math.max(0, restanteAposInicial) / fatorDosAportes;
}
