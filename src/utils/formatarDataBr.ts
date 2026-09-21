// Conversões entre o formato ISO 'AAAA-MM-DD' (o que fica gravado no banco
// — ver comentário em models.ts sobre por que string ISO, não Date) e o
// formato brasileiro DD/MM/AAAA (o que a pessoa vê na tela) + objeto Date
// (o que o seletor nativo entende). Tudo em hora LOCAL (não UTC) de
// propósito: `new Date(ano, mes, dia)` e `getFullYear/getMonth/getDate`
// sempre andam juntos, então nunca tem o bug clássico de "data volta um dia"
// que UTC vs. local costuma causar quando só um lado usa UTC.
export function converterIsoParaDate(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function converterDateParaIso(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Mês no formato brasileiro: 'AAAA-MM' -> 'MM/AAAA' (ex: '2027-09' -> '09/2027').
// É o que aparece nos textos pra pessoa (o formato ISO 'AAAA-MM' é só de
// armazenamento e de cálculo).
export function formatarMesBr(mes: string): string {
  const [ano, numero] = mes.split('-');
  return `${numero}/${ano}`;
}
