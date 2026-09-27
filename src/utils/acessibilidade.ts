// Props de acessibilidade repetidas em vários lugares.

// Enfeite puro (mascote, cenário, ícone que só repete o texto ao lado): o
// leitor de tela (VoiceOver/TalkBack) deve PULAR isso, senão a pessoa ouve
// "imagem, imagem, imagem" no meio da informação de verdade. `accessibility
// ElementsHidden` vale no iOS; `importantForAccessibility` no Android. Use
// espalhando na View/Svg: `<Svg {...DECORATIVO} />`.
export const DECORATIVO = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;
