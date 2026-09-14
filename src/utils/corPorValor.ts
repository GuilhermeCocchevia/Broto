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
