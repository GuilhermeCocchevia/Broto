import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export default function SimuladorScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simulador</Text>
      <Text style={styles.subtitle}>Aqui você vai simular compras e ver o impacto futuro.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
