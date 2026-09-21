export const colors = {
  background: '#FDF6E3',
  surface: '#FFFFFF',

  primary: '#4CAF50',
  primaryDark: '#2E7D32',
  // Verde bem clarinho — fundo de chip/opção "disponível, mas não escolhida"
  // (ver OpcaoBotao.tsx). Preenchimento leve em vez de contorno.
  primaryLight: '#E3F2E4',
  secondary: '#FFC107',
  accent: '#FF7043',

  text: '#3E2723',
  textMuted: '#8D6E63',

  success: '#66BB6A',
  danger: '#EF5350',
  warning: '#FFA726',
  // Índigo — só usado no selo colorido de "Backup" no menu do Dashboard
  // (ver ItemMenu em DashboardScreen.tsx), mesma família de azul-roxo que
  // apps da Apple costumam usar pra nuvem/backup (ex: iCloud).
  indigo: '#5C6BC0',

  // Paleta só do "cenário" gameficado (ex: CenaInicial.tsx) — separada da
  // paleta de cima de propósito: aquela é usada nos números/telas de
  // verdade (precisa continuar calma e legível); essa é só decoração de
  // fundo, pode ser mais vibrante sem atrapalhar a leitura de dado nenhum.
  cenaCeuTopo: '#5EC8F2',
  cenaCeuBase: '#B3E5FC',
  cenaNuvem: '#FFFFFF',
  cenaGrama: '#7CC142',
  cenaGramaEscura: '#5A9C2E',
  cenaTerra: '#C87137',
  cenaTerraEscura: '#9C5527',
  cenaCano: '#4CAF50',
  cenaCanoEscuro: '#2E7D32',
};
