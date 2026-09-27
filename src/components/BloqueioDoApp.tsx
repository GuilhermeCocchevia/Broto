// Trava por cima de todo o resto do app quando o Face ID/Touch ID/PIN é
// exigido (ver useBloqueioDoApp.ts). De propósito um OVERLAY absoluto (não
// um `return` que troca `children` por outra coisa) — a navegação continua
// montada por baixo, do jeito que estava (ex: um formulário pela metade não
// se perde só porque o celular foi pro bolso e voltou); a trava só cobre a
// tela e bloqueia o toque, sem destruir nada.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { BotaoPrimario } from './BotaoPrimario';
import { Brotinho } from './Brotinho';
import { useBloqueioDoApp } from '../hooks/useBloqueioDoApp';

export function BloqueioDoApp({ children }: { children: React.ReactNode }) {
  const { precisaAutenticar, autenticando, autenticar } = useBloqueioDoApp();

  useEffect(() => {
    // Tenta sozinho assim que a trava aparece — a pessoa só precisa tocar
    // no botão se essa tentativa falhar ou for cancelada (ex: mudou de
    // ideia no meio, Face ID não bateu de primeira).
    if (precisaAutenticar) autenticar();
  }, [precisaAutenticar, autenticar]);

  return (
    <>
      {children}
      {precisaAutenticar && (
        <View style={styles.wrapper} accessibilityViewIsModal>
          <Brotinho pose="pensativo" size={96} />
          <Text accessibilityRole="header" style={styles.titulo}>
            Broto travado
          </Text>
          <Text style={styles.texto}>
            Confirme com Face ID, Touch ID ou o código do aparelho pra ver seus dados.
          </Text>
          <View style={styles.botao}>
            <BotaoPrimario
              label={autenticando ? 'Confirmando...' : 'Desbloquear'}
              onPress={autenticar}
              desabilitado={autenticando}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    // Garante que fica por CIMA da navegação em qualquer plataforma —
    // `elevation` é o equivalente Android de `zIndex` pra empilhamento de
    // Views nativas (sem isso, o Android às vezes desenha na ordem de
    // montagem, não na ordem do JSX).
    zIndex: 999,
    elevation: 999,
  },
  titulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 20,
    color: colors.primaryDark,
  },
  texto: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  botao: {
    width: '100%',
    marginTop: 8,
  },
});
