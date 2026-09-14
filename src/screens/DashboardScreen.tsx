import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { obterSaldoAtual } from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Categoria } from '../types/models';

export default function DashboardScreen() {
  // useNavigation<...> tipado com RootStackParamList: dá autocomplete e erro de
  // compilação se você tentar navigation.navigate('TelaQueNaoExiste').
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Selector: em vez de pegar a store inteira (`useCategoriasStore()`), pegamos só
  // o pedacinho que essa tela usa. Assim o componente só re-renderiza quando
  // `categorias` muda — não quando `carregando` muda, por exemplo.
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregar = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);

  // Array vazio de dependências = roda só uma vez, quando a tela monta na tela
  // (igual componentDidMount das classes antigas do React).
  useEffect(() => {
    carregar();
    carregarTransacoes();
    carregarSaldoInicial();
  }, [carregar, carregarTransacoes, carregarSaldoInicial]);

  const saldoAtual = useMemo(() => obterSaldoAtual(saldosIniciais), [saldosIniciais]);

  // Map pra achar a categoria de cada transação em O(1) na hora de renderizar,
  // em vez de fazer `categorias.find(...)` (O(n)) dentro de cada item da lista.
  const categoriaPorId = useMemo(() => {
    const mapa = new Map<string, Categoria>();
    for (const categoria of categorias) {
      mapa.set(categoria.id, categoria);
    }
    return mapa;
  }, [categorias]);

  // Extrato: mais recente primeiro. `[...transacoes]` copia o array antes de
  // ordenar — `.sort()` ordena "no lugar" (muta o array original), e mutar o
  // array que vive dentro da store por baixo dos panos do Zustand é o tipo de
  // bug sutil que só aparece bem mais tarde.
  const transacoesRecentesPrimeiro = useMemo(
    () => [...transacoes].sort((a, b) => (a.data < b.data ? 1 : -1)),
    [transacoes],
  );

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

      <Pressable style={styles.botaoSecundario} onPress={() => navigation.navigate('Categorias')}>
        <Text style={styles.botaoSecundarioTexto}>Categorias</Text>
      </Pressable>

      <Pressable style={styles.botaoSecundario} onPress={() => navigation.navigate('Simulador')}>
        <Text style={styles.botaoSecundarioTexto}>Ver simulador</Text>
      </Pressable>

      <FlatList
        style={styles.lista}
        data={transacoesRecentesPrimeiro}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.listaVazia}>Nenhuma transação lançada ainda.</Text>
        }
        renderItem={({ item }) => {
          const categoria = categoriaPorId.get(item.categoriaId);
          const sinal = item.tipo === 'receita' ? '+' : '-';
          return (
            <Pressable
              style={styles.transacaoItem}
              onPress={() => navigation.navigate('NovaTransacao', { id: item.id })}
            >
              <View
                style={[
                  styles.transacaoCor,
                  { backgroundColor: categoria?.cor ?? colors.textMuted },
                ]}
              />
              <View style={styles.transacaoInfo}>
                <Text style={styles.transacaoDescricao}>{item.descricao}</Text>
                <Text style={styles.transacaoDetalhe}>
                  {categoria?.nome ?? 'Sem categoria'} · {item.data}
                  {item.frequencia === 'mensal' ? ' · repete todo mês' : ''}
                </Text>
              </View>
              <Text style={item.tipo === 'receita' ? styles.transacaoReceita : styles.transacaoDespesa}>
                {sinal}
                {formatarReal(item.valor)}
              </Text>
            </Pressable>
          );
        }}
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
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
  transacaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  transacaoCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  transacaoInfo: {
    flex: 1,
  },
  transacaoDescricao: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  transacaoDetalhe: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  transacaoReceita: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.success,
  },
  transacaoDespesa: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.danger,
  },
});
