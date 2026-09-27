import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { CampoMoeda } from '../components/CampoMoeda';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { BrilhoCeu } from '../components/CenaGameficada';
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

  const [valorAbsoluto, setValorAbsoluto] = useState(0);
  // O teclado numérico do iOS não tem tecla de "-", então saldo negativo
  // (você deve dinheiro) é escolhido aqui, não digitado — o campo de valor
  // sempre guarda um número positivo, e a gente inverte o sinal na hora de
  // salvar se for o caso.
  const [sinal, setSinal] = useState<Sinal>('positivo');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    setSalvando(true);
    try {
      const valor = sinal === 'negativo' ? -valorAbsoluto : valorAbsoluto;
      await atualizar(valor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (erroAoSalvar) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErro(mensagemDeErro(erroAoSalvar, 'salvar'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        <Text style={styles.rotulo}>Quanto você tem agora, no total?</Text>
        <CampoMoeda
          valor={valorAbsoluto}
          onChangeValor={setValorAbsoluto}
          autoFocus
          acessibilidadeLabel="Quanto você tem agora, no total, em reais"
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

        <View style={styles.botaoSalvar}>
          <BotaoPrimario
            label={salvando ? 'Salvando...' : 'Salvar'}
            onPress={salvar}
            desabilitado={salvando}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
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
  },
});
