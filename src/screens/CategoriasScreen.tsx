import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Lista de categorias com toque pra editar — antes essa lista vivia dentro
// do Dashboard, mas virou uma tela própria quando precisou também servir de
// ponto de entrada pra editar (Dashboard já tinha o extrato de transações
// ocupando aquele espaço).
export default function CategoriasScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregar = useCategoriasStore((state) => state.carregar);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <View style={styles.container}>
      <Pressable style={styles.botao} onPress={() => navigation.navigate('NovaCategoria')}>
        <Text style={styles.botaoTexto}>+ nova categoria</Text>
      </Pressable>

      <FlatList
        style={styles.lista}
        data={categorias}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhuma categoria cadastrada ainda.</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() => navigation.navigate('NovaCategoria', { id: item.id })}
          >
            <View style={[styles.cor, { backgroundColor: item.cor }]} />
            <View style={styles.info}>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.tipo}>{item.tipo === 'receita' ? 'Receita' : 'Despesa'}</Text>
            </View>
          </Pressable>
        )}
      />
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  cor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  info: {
    flex: 1,
  },
  nome: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  tipo: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
