// Aparece uma vez, na hora em que uma conquista nova é desbloqueada (ver
// useDetectarConquistas.ts + useCelebracaoConquistaStore.ts) — em cima de
// QUALQUER tela, porque a conquista pode disparar enquanto o usuário está em
// qualquer lugar do app. Mesmo molde de modal do resto do app
// (AvisoAposentadoriaModal): UM cartão só (contorno + base 3D + brilho),
// com o Brotinho "comemorando" e o texto lado a lado dentro dele — sem
// aninhar o balão-com-rabicho de BrotinhoFala aqui dentro, que duplicaria a
// moldura (um cartão dentro de outro cartão) — esse balão fica reservado
// pro Tutorial, onde ele É o conteúdo principal da tela, não um elemento
// dentro de mais uma caixa.
import { Modal, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { colors } from '../theme/colors';
import { BotaoPrimario } from './BotaoPrimario';
import { Brotinho } from './Brotinho';
import { CONQUISTAS, type ChaveConquista } from '../logic/conquistas';

export function ConquistaDesbloqueadaModal({
  chave,
  aoFechar,
}: {
  // `null` = nenhuma conquista esperando (modal fechado).
  chave: ChaveConquista | null;
  aoFechar: () => void;
}) {
  const conquista = chave ? CONQUISTAS.find((c) => c.chave === chave) : undefined;

  // Uma vibração mais forte (sucesso) marca o momento — mesma ideia de
  // PainelViabilidade, que também vibra na entrada de um resultado
  // importante, só disparando quando a conquista muda de verdade.
  useEffect(() => {
    if (conquista) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conquista?.chave]);

  if (!conquista) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={styles.fundo}>
        <View style={styles.moldura}>
          <View style={styles.base}>
            <View style={styles.face}>
              <View style={styles.brilho} pointerEvents="none" />
              <Text style={styles.selo}>CONQUISTA DESBLOQUEADA</Text>

              <View style={styles.linha}>
                <Brotinho pose="comemorando" size={80} />
                <View style={styles.linhaTexto}>
                  <Text style={styles.titulo}>{conquista.titulo}</Text>
                  <Text style={styles.descricao}>{conquista.descricao}</Text>
                </View>
              </View>

              <View style={styles.botao}>
                <BotaoPrimario
                  label="Continuar"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    aoFechar();
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  // Mesmo molde de AvisoAposentadoriaModal.tsx (contorno grosso + base 3D +
  // brilho no topo) — um cartão só, sem nada flutuando solto por cima do
  // fundo escurecido.
  moldura: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
  },
  base: {
    backgroundColor: colors.textMuted,
    paddingBottom: 6,
  },
  face: {
    position: 'relative',
    backgroundColor: colors.surface,
    padding: 22,
    gap: 16,
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  selo: {
    alignSelf: 'center',
    fontFamily: 'Bungee_400Regular',
    fontSize: 13,
    letterSpacing: 0.5,
    color: colors.secondary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  linhaTexto: {
    flex: 1,
    gap: 4,
  },
  titulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 16,
    color: colors.primaryDark,
  },
  descricao: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
  botao: {
    marginTop: 2,
  },
});
