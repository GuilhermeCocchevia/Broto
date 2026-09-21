import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { colors } from '../theme/colors';

// Aviso de "preenchi isso pra você" — mesmo molde "de painel estático" dos
// cartões do Dashboard (contorno escuro + base 3D fixa + tira de brilho no
// topo, ver painelMoldura/painelBase/painelFace lá), com um selo verde
// (ícone de faíscas) e o rótulo em fonte de jogo, igual o da Curiosidade —
// só que verde, a cor de "sugestão/ação positiva" do app. O texto em si usa
// fonte normal e legível (gameficado no toque de marca, sério no conteúdo).
export function AvisoPreenchimento({ children }: { children: ReactNode }) {
  return (
    <View style={styles.moldura}>
      <View style={styles.base}>
        <View style={styles.face}>
          <View style={styles.brilho} pointerEvents="none" />
          <View style={styles.cabecalho}>
            <View style={styles.selo}>
              <SymbolView
                name="sparkles"
                size={12}
                tintColor="#FFFFFF"
                fallback={<Ionicons name="sparkles" size={12} color="#FFFFFF" />}
              />
            </View>
            <Text style={styles.rotulo}>PREENCHIDO PRA VOCÊ</Text>
          </View>
          <Text style={styles.texto}>{children}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  moldura: {
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  base: {
    backgroundColor: colors.textMuted,
    paddingBottom: 4,
  },
  face: {
    position: 'relative',
    backgroundColor: colors.surface,
    padding: 14,
    gap: 8,
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    color: colors.primaryDark,
  },
  texto: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
});
