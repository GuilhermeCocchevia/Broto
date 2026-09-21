// O "broto" da marca, em linha só (sem rosto, sem corpo) — o símbolo que
// sobrou no Dashboard depois da revisão de tom visual (ver comentário em
// DashboardScreen.tsx): reforça o nome do app sem depender de um mascote
// animado. Usado tanto ao lado do nome "Broto" no topo quanto, bem pequeno
// e discreto, como marca d'água no rodapé da tela.
import Svg, { Path } from 'react-native-svg';

export function IconeBroto({ size = 20, color = '#2F5C4E' }: { size?: number; color?: string }) {
  return (
    <Svg viewBox="0 0 40 40" width={size} height={size}>
      <Path d="M20 34 L20 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
      <Path d="M20 22 C12 22, 8 14, 8 8 C16 8, 20 14, 20 22 Z" fill={color} />
      <Path d="M20 18 C28 18, 32 10, 32 5 C24 5, 20 11, 20 18 Z" fill={color} />
    </Svg>
  );
}
