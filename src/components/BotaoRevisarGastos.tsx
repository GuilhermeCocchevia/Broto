import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BotaoPrimario } from './BotaoPrimario';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Vai DENTRO do cartão de veredito (ver `acaoAposVeredito` em
// PainelViabilidade) quando uma meta de economia/investimento não cabe: a
// mensagem do veredito já diz quanto gastar a menos por mês, e este botão
// leva pra lista de despesas da mais cara pra mais barata
// (RevisarGastosScreen). Antes era um cartão separado, com título e texto
// repetidos — empurrava o gráfico do resultado pra uma tela abaixo.
export function BotaoRevisarGastos({ reducaoMensal }: { reducaoMensal: number }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.botao}>
      <BotaoPrimario
        label="Ver minhas despesas"
        onPress={() => navigation.navigate('RevisarGastos', { reducaoNecessaria: reducaoMensal })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // O cartão de veredito centraliza os filhos (alignItems: 'center'), o que
  // encolheria o botão ao tamanho do texto — largura total mantém o mesmo
  // botão do resto do app.
  botao: {
    width: '100%',
    marginTop: 8,
  },
});
