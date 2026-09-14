import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

// Linha de lista padrão do app: bolinha colorida + título/subtítulo à
// esquerda, valor opcional à direita. Extraído porque o mesmo desenho
// (categoria, transação, simulação) estava repetido em 3 telas com estilos
// levemente diferentes — agora é um componente só.
export function ItemLista({
  cor,
  titulo,
  subtitulo,
  valorTexto,
  valorCor,
  onPress,
}: {
  cor: string;
  titulo: string;
  subtitulo: string;
  valorTexto?: string;
  valorCor?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={[styles.cor, { backgroundColor: cor }]} />
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
