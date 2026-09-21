// Calcula uma cor "por valor" pra despesas: quanto maior o gasto (relativo
// aos outros gastos que existem), mais perto do vermelho vivo; quanto
// menor, mais perto do amarelo. É a "gravidade" do gasto virando cor, sem
// precisar ler o número.

// Converte "#RRGGBB" em [r, g, b] (cada um de 0 a 255) — é o formato que dá
// pra somar/interpolar matematicamente; string de cor não dá pra "somar".
function hexParaRgb(hex: string): [number, number, number] {
  const limpo = hex.replace('#', '');
  const r = parseInt(limpo.slice(0, 2), 16);
  const g = parseInt(limpo.slice(2, 4), 16);
  const b = parseInt(limpo.slice(4, 6), 16);
  return [r, g, b];
}

// Caminho inverso: 3 números de volta pra "#RRGGBB". `padStart(2, '0')`
// garante que 5 (hex) vire "05", não "5" — sem isso "#5a3" seria uma cor
// inválida (precisa sempre 6 dígitos).
function rgbParaHex(r: number, g: number, b: number): string {
  const paraHex = (canal: number) => Math.round(canal).toString(16).padStart(2, '0');
  return `#${paraHex(r)}${paraHex(g)}${paraHex(b)}`;
}

// Mistura duas cores conforme `t`: 0 = só a cor inicial, 1 = só a final,
// 0.5 = bem no meio das duas. Valores fora de [0,1] são "grudados" nas
// pontas (clamp) — sem isso, um valor levemente fora da faixa esperada
// podia gerar uma cor totalmente sem sentido.
export function interpolarCor(corInicial: string, corFinal: string, t: number): string {
  const tClampado = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexParaRgb(corInicial);
  const [r2, g2, b2] = hexParaRgb(corFinal);

  return rgbParaHex(
    r1 + (r2 - r1) * tClampado,
    g1 + (g2 - g1) * tClampado,
    b1 + (b2 - b1) * tClampado,
  );
}

const AMARELO_DESPESA = '#FFEB3B';
const VERMELHO_DESPESA = '#D50000';

// `valor` é o gasto dessa transação específica; `minimo`/`maximo` são o
// menor e o maior gasto entre TODAS as despesas que existem — é em relação
// a esse intervalo que a cor é calculada (a mesma despesa de R$100 pode
// parecer "grande" numa conta com poucos gastos altos, ou "pequena" noutra).
export function corDaDespesa(valor: number, minimo: number, maximo: number): string {
  // Se todas as despesas têm o mesmo valor (ou só existe uma), não tem
  // intervalo nenhum pra desenhar um espectro — cai no meio do caminho
  // entre as duas cores em vez de tentar dividir por zero.
  if (maximo <= minimo) {
    return interpolarCor(AMARELO_DESPESA, VERMELHO_DESPESA, 0.5);
  }

  const t = (valor - minimo) / (maximo - minimo);
  return interpolarCor(AMARELO_DESPESA, VERMELHO_DESPESA, t);
}

const VERDE_SALDO = '#4CAF50';
const AMARELO_SALDO = '#FFEB3B';
const VERMELHO_SALDO = '#D50000';

// Quantos meses de despesa cobertos (ver calcularMesesDeGastoCobertos em
// saudeFinanceira.ts) já contam como "bem verde" — mesma régua clássica de
// reserva de emergência (3 meses de despesa), reaproveitada aqui pra dar
// uma referência ABSOLUTA e com significado financeiro real, em vez de
// relativa a outros números da mesma tela.
const MESES_DE_RESERVA_PARA_VERDE_TOTAL = 3;

// "Saúde" de um saldo, virando cor: verde a partir de `MESES_DE_RESERVA_...`
// meses de despesa cobertos, passando por amarelo conforme cobre menos, até
// vermelho quando não cobre nada (saldo zerado ou negativo) — usado no
// gráfico e na tabela de meses do Simulador.
//
// Importante: a referência é ABSOLUTA (meses de despesa cobertos), não
// relativa ao maior valor da série que está sendo desenhada. A versão
// anterior comparava cada saldo ao PICO da própria série — o que funcionava
// bem numa janela curta, mas ficava enganoso numa simulação longa (ex: 48
// meses de financiamento): um saldo de R$3.000, super saudável, aparecia
// quase vermelho só porque o mês 47 da mesma série chegava a R$180.000. Um
// R$3.000 que cobre vários meses de despesa é verde SEMPRE, não importa o
// que acontece 4 anos depois na mesma tela.
export function corDoSaldo(mesesCobertos: number): string {
  // Sem despesa nenhuma pra servir de referência (ou saldo zerado/negativo),
  // não tem "meses cobertos" que faça sentido — cai direto no vermelho.
  // Passa por `interpolarCor` mesmo aqui (em vez de devolver a constante
  // direto) só pra manter a mesma "forma" de saída (minúsculo) dos outros
  // casos.
  if (mesesCobertos <= 0) {
    return interpolarCor(AMARELO_SALDO, VERMELHO_SALDO, 1);
  }

  // 0 = cobre 3+ meses de despesa (bem verde), 1 = não cobre nada (bem
  // vermelho) — `interpolarCor` cuida de "grudar" nas pontas.
  const t = 1 - Math.min(mesesCobertos / MESES_DE_RESERVA_PARA_VERDE_TOTAL, 1);
  if (t <= 0.5) {
    return interpolarCor(VERDE_SALDO, AMARELO_SALDO, t / 0.5);
  }
  return interpolarCor(AMARELO_SALDO, VERMELHO_SALDO, (t - 0.5) / 0.5);
}

// Pico de referência de uma série de valores — usado só pra ESCALA do
// gráfico (ver GraficoSaldo.tsx: até onde o eixo precisa ir, e o quanto
// "achatar" uma queda profunda) — não tem mais relação com a COR (ver
// corDoSaldo acima, que agora usa uma referência absoluta). `|| 100` evita
// um pico "0" (proporção sem sentido) no caso raro de nenhum valor da série
// ser positivo.
export function maiorValorDaSerie(valores: number[]): number {
  return Math.max(0, ...valores) || 100;
}
