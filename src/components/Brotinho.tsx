// O mascote do app, parado e de rosto pra câmera — diferente do Brotinho que
// anda no Dashboard (CenaGameficada.tsx, só silhueta, sem expressão): este
// aqui "fala" nas conquistas e no tutorial (ver BrotinhoFala.tsx), então
// precisa de rosto e pose.
//
// PLACEHOLDER, desenhado com as mesmas formas/cores do Brotinho que anda
// (corpo em cápsula + 2 folhas + braços finos, tudo em Views/SVG, sem
// nenhuma imagem) — é o "personagem provisório" enquanto a ilustração de
// verdade (feita por fora do código, 3 poses combinadas: neutro,
// comemorando, pensativo) não chega. Pra TROCAR pela arte final quando ela
// chegar: adicione os arquivos em `assets/brotinho/` (ex:
// `neutro.png`/`.svg`) e troque só o `return` deste componente por um
// `<Image source={...} style={{ width: size, height: size * (170/120) }} />`
// (ou `<SvgXml>`, se a arte vier em SVG) escolhido por `pose` — a API
// externa (`<Brotinho pose="comemorando" size={96} />`) continua igual, então
// nada que já usa este componente precisa mudar.
import Svg, { G, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';
import { DECORATIVO } from '../utils/acessibilidade';

export type PoseBrotinho = 'neutro' | 'comemorando' | 'pensativo';

// Proporção do desenho (viewBox 120×170) — usada pra `size` (a largura)
// determinar a altura certa, mantendo as formas sem esticar.
export const PROPORCAO_BROTINHO = 170 / 120;

const CORPO_X = 35;
const CORPO_Y = 62;
const CORPO_LARGURA = 50;
const CORPO_ALTURA = 88;

// Uma folha (mesmo path do Brotinho que anda, ver `Folha` em
// CenaGameficada.tsx) — aqui reaproveitada em tamanho maior via `scale` no
// próprio `transform`, sem duplicar os pontos do desenho.
function Folha({ cx, cy, rotacao, espelhada = false }: { cx: number; cy: number; rotacao: number; espelhada?: boolean }) {
  const escala = 2.3;
  return (
    <G transform={`translate(${cx},${cy}) rotate(${rotacao}) scale(${espelhada ? -escala : escala},${escala}) translate(-6,-18)`}>
      <Path
        d="M6,18 C1.5,15 0,9 1.5,4.5 C2.8,1 4.8,0 6,0 C7.2,0 9.2,1 10.5,4.5 C12,9 10.5,15 6,18 Z"
        fill={colors.cenaGrama}
        stroke={colors.cenaGramaEscura}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <Path d="M6,15 L6,2.5" stroke={colors.cenaGramaEscura} strokeWidth={0.5} strokeLinecap="round" opacity={0.6} />
    </G>
  );
}

// Um braço fino, "pendurado" a partir do ombro (`cx`,`cy`) — a rotação decide
// pra onde ele aponta (pra baixo e um pouco pro lado = descansando; quase
// reto pra cima = comemorando).
function Braco({ cx, cy, rotacao, comprimento }: { cx: number; cy: number; rotacao: number; comprimento: number }) {
  return (
    <G transform={`translate(${cx},${cy}) rotate(${rotacao})`}>
      <Rect x={-6} y={0} width={12} height={comprimento} rx={6} fill={colors.cenaGrama} stroke={colors.cenaGramaEscura} strokeWidth={2.2} />
    </G>
  );
}

function Corpo() {
  return (
    <Rect
      x={CORPO_X}
      y={CORPO_Y}
      width={CORPO_LARGURA}
      height={CORPO_ALTURA}
      rx={25}
      fill={colors.cenaGrama}
      stroke={colors.cenaGramaEscura}
      strokeWidth={3}
    />
  );
}

// Olho "aberto" (tracinho vertical) — mesmo desenho do Brotinho que anda,
// só maior.
function OlhoAberto({ cx, cy }: { cx: number; cy: number }) {
  return <Rect x={cx - 2.6} y={cy - 8} width={5.2} height={16} rx={2.6} fill={colors.text} />;
}

// Olho "feliz" (arco fechado, sorrindo) — só na pose comemorando.
function OlhoFeliz({ cx, cy }: { cx: number; cy: number }) {
  return (
    <Path d={`M ${cx - 8} ${cy + 4} Q ${cx} ${cy - 10} ${cx + 8} ${cy + 4}`} stroke={colors.text} strokeWidth={3.2} fill="none" strokeLinecap="round" />
  );
}

// Uma pequena estrela de 4 pontas — o "brilho" ao redor da pose comemorando.
function Estrela({ cx, cy, tamanho, rotacao = 0 }: { cx: number; cy: number; tamanho: number; rotacao?: number }) {
  const p = tamanho * 0.28;
  return (
    <G transform={`translate(${cx},${cy}) rotate(${rotacao})`}>
      <Path
        d={`M0,-${tamanho} L${p},-${p} L${tamanho},0 L${p},${p} L0,${tamanho} L${-p},${p} L${-tamanho},0 L${-p},-${p} Z`}
        fill={colors.secondary}
        opacity={0.9}
      />
    </G>
  );
}

export function Brotinho({ pose, size = 96 }: { pose: PoseBrotinho; size?: number }) {
  return (
    <Svg {...DECORATIVO} width={size} height={size * PROPORCAO_BROTINHO} viewBox="0 0 120 170">
      {pose === 'neutro' && (
        <>
          <Corpo />
          <Braco cx={36} cy={100} rotacao={35} comprimento={30} />
          <Braco cx={84} cy={100} rotacao={-35} comprimento={30} />
          <Folha cx={46} cy={66} rotacao={-34} />
          <Folha cx={74} cy={66} rotacao={34} espelhada />
          <OlhoAberto cx={49} cy={98} />
          <OlhoAberto cx={71} cy={98} />
          <Path d="M 51 112 Q 60 119 69 112" stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      )}

      {pose === 'comemorando' && (
        <>
          <Corpo />
          <Folha cx={46} cy={66} rotacao={-34} />
          <Folha cx={74} cy={66} rotacao={34} espelhada />
          <Braco cx={35} cy={99} rotacao={138} comprimento={42} />
          <Braco cx={85} cy={99} rotacao={-138} comprimento={42} />
          <OlhoFeliz cx={49} cy={98} />
          <OlhoFeliz cx={71} cy={98} />
          <Path
            d="M 47 104 Q 60 120 73 104 Q 60 114 47 104 Z"
            fill={colors.text}
          />
          <Estrela cx={12} cy={40} tamanho={7} rotacao={15} />
          <Estrela cx={106} cy={38} tamanho={5} rotacao={-10} />
          <Estrela cx={8} cy={78} tamanho={4} />
        </>
      )}

      {pose === 'pensativo' && (
        <>
          <Corpo />
          <Braco cx={36} cy={100} rotacao={35} comprimento={30} />
          <Braco cx={84} cy={100} rotacao={-35} comprimento={30} />
          {/* Folhas levemente assimétricas (uma mais fechada, outra mais
              aberta) — sugere a cabeça "inclinada", pensando, sem precisar
              inclinar o corpo inteiro. */}
          <Folha cx={44} cy={66} rotacao={-26} />
          <Folha cx={76} cy={66} rotacao={42} espelhada />
          {/* Sobrancelha levantada só de um lado — o sinal clássico de
              "pensando"/"curioso". */}
          <Rect x={38 - 7} y={87 - 2} width={14} height={3} rx={1.5} fill={colors.text} transform="rotate(-14 38 87)" />
          <OlhoAberto cx={49} cy={99} />
          <OlhoAberto cx={71} cy={96} />
          <Path d="M 56 115 Q 66 111 69 114" stroke={colors.text} strokeWidth={3} fill="none" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}
