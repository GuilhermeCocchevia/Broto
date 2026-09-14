import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { obterSaldoAtual } from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function DashboardScreen() {
  // useNavigation<...> tipado com RootStackParamList: dá autocomplete e erro de
  // compilação se você tentar navigation.navigate('TelaQueNaoExiste').
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Selector: em vez de pegar a store inteira (`useCategoriasStore()`), pegamos só
  // o pedacinho que essa tela usa. Assim o componente só re-renderiza quando
  // `categorias` muda — não quando `carregando` muda, por exemplo.
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregar = useCategoriasStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);

  // Array vazio de dependências = roda só uma vez, quando a tela monta na tela
  // (igual componentDidMount das classes antigas do React).
  useEffect(() => {
    carregar();
    carregarSaldoInicial();
  }, [carregar, carregarSaldoInicial]);

  const saldoAtual = useMemo(() => obterSaldoAtual(saldosIniciais), [saldosIniciais]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.saldoAtual}>{formatarReal(saldoAtual)}</Text>
      <Text style={styles.subtitle}>é o que você tem agora.</Text>

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => navigation.navigate('AtualizarSaldo')}
      >
        <Text style={styles.botaoSecundarioTexto}>Atualizar saldo</Text>
      </Pressable>

      <Pressable style={styles.botao} onPress={() => navigation.navigate('NovaTransacao')}>
        <Text style={styles.botaoTexto}>+ nova transação</Text>
      </Pressable>

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => navigation.navigate('NovaCategoria')}
      >
        <Text style={styles.botaoSecundarioTexto}>+ nova categoria</Text>
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
  saldoAtual: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 8,
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
