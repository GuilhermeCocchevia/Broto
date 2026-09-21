import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { interpolarCor } from '../utils/corPorValor';

const PADDING_BOTTOM_BASE = 8;

// Um "chip" clicável que troca de cor quando selecionado. Usado em toda tela
// de formulário que precisa de "escolha uma entre poucas opções" (tipo,
// frequência, categoria) — extraído aqui porque já se repetia em mais de uma
// tela (Nova Transação, Nova Categoria, Nova Simulação).
//
// Mesmo visual "de botão de jogo pixel" do BotaoPrimario/BotaoMenu (contorno
// escuro + brilho no topo + uma "base" mais escura do mesmo tom sobrando
// embaixo, que some quando pressionado) — só numa versão mais compacta.
const ALTURA_BASE = 3;

export function OpcaoBotao({
  label,
  selecionado,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  // A cor "de base" (a faixa mais escura) é sempre derivada da cor atual do
  // chip — precisa recalcular quando `selecionado` muda de estado, não dá
  // pra ter uma constante fixa igual o BotaoPrimario (que é sempre verde).
  const corAtual = selecionado ? colors.primary : colors.primaryLight;
  const corBase = interpolarCor(corAtual, '#000000', 0.15);

  return (
    <Pressable
      style={[styles.moldura, { backgroundColor: corBase }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              backgroundColor: corAtual,
              paddingBottom: PADDING_BOTTOM_BASE + (pressed ? 0 : ALTURA_BASE),
            },
          ]}
        >
          <View style={styles.brilho} pointerEvents="none" />
          <Text style={[styles.chipTexto, selecionado && styles.chipTextoSelecionado]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  moldura: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  face: {
    position: 'relative',
    paddingTop: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  chipTexto: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipTextoSelecionado: {
    color: colors.surface,
  },
});
