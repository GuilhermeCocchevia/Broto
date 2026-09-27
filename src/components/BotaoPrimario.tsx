// Botão primário (verde, "Salvar"/"+ nova categoria"/"Exportar backup" etc.)
// compartilhado por toda tela que precisar de uma ação principal — um lugar
// só pra estilizar, propaga pra tudo que usa esse componente de uma vez.
//
// Visual "de botão de jogo pixel" (referência que o usuário mandou: contorno
// escuro grosso, uma tira mais clara de brilho no topo, uma "base" mais
// escura do mesmo tom sobrando embaixo — como se o botão fosse um bloco 3D
// apoiado numa sombra da própria cor). Pressionar esconde a base (o bloco
// "afunda" até ficar rente ao contorno) em vez de só escurecer/encolher.
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';

// Altura (em px) da faixa mais escura visível embaixo do botão, "de pé" —
// é o que dá a sensação de bloco 3D. Some quando pressionado (ver
// `baseAfundada`), simulando o bloco encostando no contorno.
const ALTURA_BASE = 5;

export function BotaoPrimario({
  label,
  onPress,
  desabilitado = false,
  acessibilidadeHint,
}: {
  label: string;
  onPress: () => void;
  desabilitado?: boolean;
  // Frase curta dizendo O QUE acontece ao tocar, quando o rótulo sozinho não
  // deixa claro (ex: "Salva a transação e volta pra tela anterior").
  acessibilidadeHint?: string;
}) {
  return (
    <Pressable
      // Leitor de tela: sem o papel "button" o VoiceOver lê só o texto, sem
      // avisar que dá pra tocar; o estado "disabled" faz ele falar "esmaecido".
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={acessibilidadeHint}
      accessibilityState={{ disabled: desabilitado }}
      style={[styles.moldura, desabilitado && styles.desabilitado]}
      onPress={() => {
        if (desabilitado) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={desabilitado}
    >
      {({ pressed }) => (
        // `paddingBottom` aqui (não no `face`) é o que revela a cor mais
        // escura do próprio `moldura` como uma faixa embaixo — 0 quando
        // pressionado, o bloco "afunda" até sumir a faixa.
        <View style={[styles.base, { paddingBottom: pressed ? 0 : ALTURA_BASE }]}>
          <View style={styles.face}>
            <View style={styles.brilho} pointerEvents="none" />
            <Text style={styles.texto}>{label}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // O contorno escuro grosso + o corte arredondado (menos "pílula", mais
  // "bloco de jogo") ficam aqui — `overflow: hidden` é o que faz esse
  // `borderRadius` valer pros filhos quadrados de dentro também.
  moldura: {
    borderRadius: 10,
    borderWidth: 2.5,
    borderColor: 'rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
  },
  // A cor mais escura mora aqui (o "chão" 3D) — o `face` (mais claro) cobre
  // ela quase inteira, sobrando só `paddingBottom` (ver JSX) like uma
  // faixa embaixo.
  base: {
    backgroundColor: colors.primaryDark,
  },
  face: {
    position: 'relative',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
  },
  // Tira sólida (não degradê) de brilho no topo — mais "pixelada"/crua que
  // um gradiente suave, combina mais com o resto da referência.
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  desabilitado: {
    opacity: 0.6,
  },
  texto: {
    color: colors.surface,
    fontFamily: 'Bungee_400Regular',
    fontSize: 15,
  },
});
