// Abrevia 'AAAA-MM' pro nome curto do mês em português, só pro eixo do
// gráfico não ficar poluído com "2026-10" embaixo de cada ponto.
const MESES_ABREVIADOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function abreviarMes(mes: string): string {
  const numeroDoMes = Number(mes.slice(5, 7));
  return MESES_ABREVIADOS[numeroDoMes - 1];
}
