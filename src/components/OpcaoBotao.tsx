import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

// Um "chip" clicável que troca de cor quando selecionado. Usado em toda tela
// de formulário que precisa de "escolha uma entre poucas opções" (tipo,
// frequência, categoria) — extraído aqui porque já se repetia em mais de uma
// tela (Nova Transação, Nova Categoria, Nova Simulação).
export function OpcaoBotao({
  label,
  selecionado,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.chip, selecionado && styles.chipSelecionado]} onPress={onPress}>
      <Text style={[styles.chipTexto, selecionado && styles.chipTextoSelecionado]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.surface,
  },
  chipSelecionado: {
    backgroundColor: colors.primary,
  },
  chipTexto: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipTextoSelecionado: {
    color: colors.surface,
  },
});
