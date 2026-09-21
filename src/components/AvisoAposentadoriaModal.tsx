// Os avisos de risco da Aposentadoria (iliquidez, vencimento real, IR)
// viviam como um cartão de texto pequeno sempre visível no formulário —
// usuário reportou que ficava "feio, fora do padrão do app, difícil de
// ler". Virou um modal de verdade, no mesmo molde "de botão de jogo pixel"
// do resto do app (contorno grosso + base 3D + brilho no topo + fonte
// Bungee no título), que aparece uma vez ao escolher esse tipo de
// simulação — com texto grande o suficiente pra ler sem esforço, em vez de
// competir por espaço dentro do formulário.
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { BotaoPrimario } from './BotaoPrimario';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';

const ALTURA_BASE = 6;

export function AvisoAposentadoriaModal({ visivel, aoFechar }: { visivel: boolean; aoFechar: () => void }) {
  const atualizarNaoMostrarAvisoAposentadoria = useConfiguracoesStore(
    (state) => state.atualizarNaoMostrarAvisoAposentadoria,
  );

  function fechar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    aoFechar();
  }

  function naoMostrarNovamente() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    atualizarNaoMostrarAvisoAposentadoria(true);
    aoFechar();
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <View style={styles.fundo}>
        <View style={styles.moldura}>
          <View style={styles.base}>
            <View style={styles.face}>
              <View style={styles.brilho} pointerEvents="none" />
              <Text style={styles.titulo}>Antes de simular, alguns fatos importantes</Text>

              <Text style={styles.item}>
                • O dinheiro fica melhor aplicado se você não precisar dele antes do vencimento — vender
                antes tem preço de mercado do dia, que pode ser menor que o investido.
              </Text>
              <Text style={styles.item}>
                • Vencimento é uma data real e distante (décadas) — confira sempre antes de simular.
              </Text>
              <Text style={styles.item}>
                • Renda fixa do Tesouro Nacional tem a garantia do governo federal.
              </Text>
              <Text style={styles.item}>
                • Imposto de Renda segue a tabela regressiva (15% a 22,5% sobre o ganho, conforme o prazo)
                — já descontado no resultado da simulação.
              </Text>

              <Pressable style={styles.naoMostrar} onPress={naoMostrarNovamente}>
                <Text style={styles.naoMostrarTexto}>Não mostrar novamente</Text>
              </Pressable>

              <View style={styles.botaoFechar}>
                <BotaoPrimario label="Fechar" onPress={fechar} />
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
  // Mesmo molde de BotaoPrimario.tsx (contorno grosso + base 3D + brilho),
  // só que estático (sem estado de pressionado) — é um painel, não um
  // botão.
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
    paddingBottom: ALTURA_BASE,
  },
  face: {
    position: 'relative',
    backgroundColor: colors.surface,
    padding: 22,
    gap: 12,
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  titulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 17,
    color: colors.text,
    marginTop: 6,
    marginBottom: 2,
  },
  item: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  naoMostrar: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    marginTop: 4,
  },
  naoMostrarTexto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  botaoFechar: {
    marginTop: 4,
  },
});
