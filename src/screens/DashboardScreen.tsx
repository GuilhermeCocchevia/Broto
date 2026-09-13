import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Nomes/cores de exemplo só pra termos algo diferente a cada toque do botão,
// enquanto não existe uma tela de verdade de "criar categoria". Isso é só um
// teste visual temporário — vai sumir quando entrar o formulário real.
const EXEMPLOS = [
  { nome: 'Alimentação', cor: colors.accent },
  { nome: 'Transporte', cor: colors.secondary },
  { nome: 'Salário', cor: colors.success },
];

export default function DashboardScreen() {
  // useNavigation<...> tipado com RootStackParamList: dá autocomplete e erro de
  // compilação se você tentar navigation.navigate('TelaQueNaoExiste').
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Selector: em vez de pegar a store inteira (`useCategoriasStore()`), pegamos só
  // o pedacinho que essa tela usa. Assim o componente só re-renderiza quando
  // `categorias` muda — não quando `carregando` muda, por exemplo.
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregar = useCategoriasStore((state) => state.carregar);
  const adicionar = useCategoriasStore((state) => state.adicionar);

  // Array vazio de dependências = roda só uma vez, quando a tela monta na tela
  // (igual componentDidMount das classes antigas do React).
  useEffect(() => {
    carregar();
  }, [carregar]);

  function adicionarExemplo() {
    const exemplo = EXEMPLOS[categorias.length % EXEMPLOS.length];
    adicionar({ nome: exemplo.nome, tipo: 'despesa', cor: exemplo.cor });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Seu resumo financeiro vai aparecer aqui.</Text>

      <Pressable style={styles.botao} onPress={adicionarExemplo}>
        <Text style={styles.botaoTexto}>+ categoria de teste</Text>
      </Pressable>

      <Pressable style={styles.botaoSecundario} onPress={() => navigation.navigate('Simulador')}>
        <Text style={styles.botaoSecundarioTexto}>Ver simulador</Text>
      </Pressable>

      <FlatList
        style={styles.lista}
        data={categorias}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.categoriaItem}>
            <View style={[styles.categoriaCor, { backgroundColor: item.cor }]} />
            <Text style={styles.categoriaNome}>{item.nome}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    paddingTop: 80,
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
  },
  botao: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  botaoTexto: {
    color: colors.surface,
    fontWeight: '600',
  },
  botaoSecundario: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  botaoSecundarioTexto: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  lista: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  categoriaCor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoriaNome: {
    fontSize: 16,
    color: colors.text,
  },
});
