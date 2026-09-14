import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { parsearValorMonetario } from '../utils/parsearValorMonetario';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Sinal = 'positivo' | 'negativo';

// Tela mais simples do app: um campo de valor + o sinal. "Atualizar" aqui
// nunca sobrescreve nada no banco — cria uma linha nova (ver
// useSaldoInicialStore), então dá pra chamar essa tela quantas vezes quiser
// sem medo de corromper histórico.
export default function AtualizarSaldoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const atualizar = useSaldoInicialStore((state) => state.atualizar);

  const [valorTexto, setValorTexto] = useState('');
  // O teclado numérico do iOS não tem tecla de "-", então saldo negativo
  // (você deve dinheiro) é escolhido aqui, não digitado — o campo de valor
  // sempre guarda um número positivo, e a gente inverte o sinal na hora de
  // salvar se for o caso.
  const [sinal, setSinal] = useState<Sinal>('positivo');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const valorAbsoluto = parsearValorMonetario(valorTexto);

    if (valorAbsoluto === null || valorAbsoluto < 0) {
      setErro('Informe um valor válido.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const valor = sinal === 'negativo' ? -valorAbsoluto : valorAbsoluto;
      await atualizar(valor);
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(mensagemDeErro(erroAoSalvar, 'salvar'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.rotulo}>Quanto você tem agora, no total?</Text>
      <TextInput
        style={styles.input}
        value={valorTexto}
        onChangeText={setValorTexto}
        placeholder="Ex: 1500"
        keyboardType="decimal-pad"
        autoFocus
      />

      <View style={styles.opcoes}>
        <OpcaoBotao
          label="Tenho esse valor"
          selecionado={sinal === 'positivo'}
          onPress={() => setSinal('positivo')}
        />
        <OpcaoBotao
          label="Estou devendo"
          selecionado={sinal === 'negativo'}
          onPress={() => setSinal('negativo')}
        />
      </View>

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <Pressable
        style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
        onPress={salvar}
        disabled={salvando}
      >
        <Text style={styles.botaoSalvarTexto}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
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
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
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
  botaoDesabilitado: {
    opacity: 0.6,
  },
});
