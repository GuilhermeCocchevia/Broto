import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Tela mais simples do app: um campo só. "Atualizar" aqui nunca sobrescreve
// nada no banco — cria uma linha nova (ver useSaldoInicialStore), então dá
// pra chamar essa tela quantas vezes quiser sem medo de corromper histórico.
export default function AtualizarSaldoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const atualizar = useSaldoInicialStore((state) => state.atualizar);

  const [valorTexto, setValorTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    const valor = Number(valorTexto.replace(',', '.'));

    if (!valorTexto || Number.isNaN(valor)) {
      setErro('Informe um valor válido.');
      return;
    }

    setErro(null);
    try {
      await atualizar(valor);
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(`Não consegui salvar: ${String(erroAoSalvar)}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.rotulo}>Quanto você tem agora, no total?</Text>
      <TextInput
        style={styles.input}
        value={valorTexto}
        onChangeText={setValorTexto}
        placeholder="Ex: 1500"
        keyboardType="decimal-pad"
        autoFocus
      />

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <Pressable style={styles.botaoSalvar} onPress={salvar}>
        <Text style={styles.botaoSalvarTexto}>Salvar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  rotulo: {
    fontSize: 16,
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  erro: {
    color: colors.danger,
    marginTop: 16,
  },
  botaoSalvar: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoSalvarTexto: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});
