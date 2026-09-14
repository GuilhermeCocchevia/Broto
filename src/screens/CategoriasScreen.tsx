import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { ItemLista } from '../components/ItemLista';
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
      <Pressable style={styles.botao} onPress={() => navigation.navigate('NovaCategoria')}>
        <Text style={styles.botaoTexto}>+ nova categoria</Text>
      </Pressable>

      {carregando && categorias.length === 0 ? (
        <Text style={styles.listaVazia}>Carregando...</Text>
      ) : (
        <FlatList
          style={styles.lista}
          data={categorias}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.listaVazia}>Nenhuma categoria cadastrada ainda.</Text>
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
  },
  botao: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoTexto: {
    color: colors.surface,
    fontWeight: '700',
  },
  lista: {
    marginTop: 16,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
});
