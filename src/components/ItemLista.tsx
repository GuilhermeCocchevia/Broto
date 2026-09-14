import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  titulo,
  subtitulo,
  valorTexto,
  valorCor,
  onPress,
}: {
  // Um dos dois é obrigatório: `cor` desenha a bolinha de sempre; `moeda`
  // desenha o marcador dourado no lugar dela. Se os dois vierem, `moeda`
  // ganha — só faz sentido usar um por vez.
  cor?: string;
  moeda?: boolean;
  titulo: string;
  subtitulo: string;
  valorTexto?: string;
  valorCor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      {moeda ? (
        <View style={styles.moeda}>
          <View style={styles.moedaBrilho} />
        </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
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
