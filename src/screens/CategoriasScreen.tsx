import { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { ItemLista } from '../components/ItemLista';
import { BotaoPrimario } from '../components/BotaoPrimario';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Lista de categorias com toque pra editar — antes essa lista vivia dentro
// do Dashboard, mas virou uma tela própria quando precisou também servir de
// ponto de entrada pra editar (Dashboard já tinha o extrato de transações
// ocupando aquele espaço).
export default function CategoriasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregando = useCategoriasStore((state) => state.carregando);
  const carregar = useCategoriasStore((state) => state.carregar);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <View style={styles.container}>
      <BrilhoCeu />
      {/* O botão agora vive DENTRO da FlatList (via ListHeaderComponent), não
          mais fora dela num View separado — precisa ser a MESMA scrollview
          que recebe `contentInsetAdjustmentBehavior`, ver comentário abaixo. */}
      <FlatList
        // Sem isso, o conteúdo começa colado embaixo da barrinha pequena do
        // cabeçalho, e o "Large Title" nativo (ver RootNavigator.tsx) fica
        // flutuando por CIMA da lista em vez de empurrá-la pra baixo — bug
        // real que só aparece testando de verdade (via push, não como tela
        // raiz). 'automatic' é o que diz pro iOS reservar o espaço certo,
        // inclusive ajustando sozinho conforme o título grande encolhe
        // durante o scroll.
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.conteudo}
        data={categorias}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.botao}>
            <BotaoPrimario
              label="+ nova categoria"
              onPress={() => navigation.navigate('NovaCategoria')}
            />
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.listaVazia}>
            {carregando ? 'Carregando...' : 'Nenhuma categoria cadastrada ainda.'}
          </Text>
        }
        renderItem={({ item }) => (
          <ItemLista
            cor={item.cor}
            titulo={item.nome}
            subtitulo={item.tipo === 'receita' ? 'Receita' : 'Despesa'}
            onPress={() => navigation.navigate('NovaCategoria', { id: item.id })}
          />
        )}
      />
    </View>
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
  botao: {
    marginBottom: 16,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
});
