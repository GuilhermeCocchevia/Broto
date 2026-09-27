import { useId } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

// Linha de lista padrão do app: um marcador (bolinha colorida OU a
// "moeda" de receita, desenhada só com Views/estilos) + título/subtítulo
// à esquerda, valor opcional à direita. Extraído porque o mesmo desenho
// (categoria, transação, simulação) estava repetido em 3 telas com
// estilos levemente diferentes — agora é um componente só.
//
// A moeda não usa emoji: o 🪙 do sistema renderiza prateado no iOS (não
// dourado), então o "brilho de jogo" é desenhado à mão com duas Views —
// sem depender de fonte de emoji nem de nenhuma imagem com direitos
// autorais (tipo a moeda do Mario que inspirou a ideia).
export function ItemLista({
  cor,
  moeda,
  brilho,
  titulo,
  subtitulo,
  valorTexto,
  valorCor,
  onPress,
}: {
  // `cor` sozinho desenha a bolinha de sempre (cor de categoria — usado em
  // Categorias/Simulador, onde a cor só identifica, não tem "intensidade").
  // `moeda` desenha o marcador dourado no lugar dela.
  cor?: string;
  moeda?: boolean;
  // Só o extrato do Dashboard passa isso: em vez da bolinha, uma nuvenzinha
  // de luz embaixo da linha (cor = gravidade do gasto, ver `corDaDespesa`).
  // Motivo de ser um prop à parte, e não só "trocar o desenho de `cor`
  // sempre": em Categorias/Simulador, `cor` é a cor da CATEGORIA (uma
  // identidade fixa, tipo etiqueta) — usuários reais confundiram a
  // bolinha do extrato (que muda de cor pelo TAMANHO do gasto) com esse
  // mesmo tipo de bolinha "de categoria" que já existia em outro lugar do
  // app. O brilho só faz sentido onde a cor representa uma escala.
  brilho?: boolean;
  titulo: string;
  subtitulo: string;
  valorTexto?: string;
  valorCor?: string;
  onPress?: () => void;
}) {
  // Cada linha precisa do seu PRÓPRIO id de gradiente — um `<Svg>` só
  // encontra o degradê certo (`url(#id)`) dentro do `<Defs>` do MESMO
  // `<Svg>`, então dois brilhos com o mesmo id colidiriam se algum
  // aparelho/versão reaproveitasse a definição errada.
  const idGradiente = useId();
  // Uma linha = UM elemento pro leitor de tela, lida de uma vez ("Aluguel.
  // Despesa · 10/09/2026. -R$ 1.200,00"), em vez de ele parar em cada pedaço
  // (bolinha, título, subtítulo, valor). O marcador (bolinha/moeda/brilho) é
  // só enfeite, some da leitura por ficar dentro do elemento agrupado.
  const rotuloFalado = [titulo, subtitulo, valorTexto].filter(Boolean).join('. ');
  return (
    <Pressable
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={rotuloFalado}
      style={styles.item}
      onPress={onPress}
    >
      {moeda ? (
        <View style={styles.moeda}>
          <View style={styles.moedaBrilho} />
        </View>
      ) : brilho ? (
        // Espaço vazio do mesmo tamanho da moeda — mantém título/subtítulo
        // alinhados igual nas linhas de receita (que têm moeda) e despesa
        // (que agora não têm bolinha nenhuma à esquerda).
        <View style={styles.marcadorVazio} />
      ) : (
        <View style={[styles.cor, { backgroundColor: cor }]} />
      )}
      <View style={styles.info}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.subtitulo}>{subtitulo}</Text>
      </View>
      {valorTexto !== undefined && (
        <Text style={[styles.valor, valorCor ? { color: valorCor } : null]}>{valorTexto}</Text>
      )}
      {brilho && cor && (
        // Nuvenzinha de luz, não uma barra de LED: um degradê RADIAL (não
        // linear) — esmaece pra fora em todas as direções, como um borrão
        // macio, em vez de uma faixa reta com ponta cortada. `bottom`
        // negativo deixa ela "descansar" um pouco por baixo da linha,
        // vazando pro divisor — reforça a sensação de luz difusa, não de
        // elemento colado exatamente na borda. Centralizada (`brilhoNuvem`)
        // e mais fina/comprida (`rx` bem maior que `ry`) do que a versão
        // anterior, mais redonda.
        <Svg
          width={220}
          height={20}
          viewBox="0 0 220 20"
          style={styles.brilhoNuvem}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id={idGradiente} cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0" stopColor={cor} stopOpacity={0.45} />
              <Stop offset="0.55" stopColor={cor} stopOpacity={0.2} />
              <Stop offset="1" stopColor={cor} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="110" cy="10" rx="110" ry="10" fill={`url(#${idGradiente})`} />
        </Svg>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // `position: relative` é o que permite `brilhoNuvem` (position: absolute
  // lá embaixo) se ancorar no rodapé desta linha específica, não da lista
  // inteira.
  item: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  cor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  // Mesmo tamanho da moeda (14x14) — só existe pra ocupar o mesmo espaço
  // e manter o alinhamento, ver comentário em `brilho` acima.
  marcadorVazio: {
    width: 14,
    height: 14,
  },
  // A nuvenzinha de luz que substitui a bolinha nas despesas — ver o
  // degradê radial no JSX. Width/height bem maiores que a área realmente
  // "acesa" (a elipse do meio ocupa uma fração pequena do SVG) de
  // propósito: o degradê precisa de espaço de sobra pra esmaecer até o
  // zero suavemente, sem cortar seco na borda do `Svg`.
  // `left: '50%'` + `marginLeft` negativo (metade da largura do `Svg`) é o
  // jeito de centralizar um elemento `position: absolute` de largura fixa
  // dentro do pai — não dá pra usar `alignItems: 'center'` aqui porque
  // `item` já usa o eixo pra alinhar marcador/texto/valor em linha.
  brilhoNuvem: {
    position: 'absolute',
    left: '50%',
    marginLeft: -110,
    bottom: -6,
  },
  // Moeda dourada da receita: círculo dourado com borda mais escura (dá o
  // relevo de "borda de moeda") e um brilho — uma segunda bolinha branca
  // translúcida no canto — pra parecer uma moeda de jogo, não só mais uma
  // bolinha de categoria. Levemente maior que a bolinha (14 vs 12) de
  // propósito: é o marcador "especial", quer chamar mais atenção.
  moeda: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD54F',
    borderWidth: 1.5,
    borderColor: '#C8960A',
  },
  moedaBrilho: {
    position: 'absolute',
    top: 2,
    left: 2.5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  info: {
    flex: 1,
  },
  titulo: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  subtitulo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  valor: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
});
