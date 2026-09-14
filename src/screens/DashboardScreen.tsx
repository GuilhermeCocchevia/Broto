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
import { ItemLista } from '../components/ItemLista';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import type { RootStackParamList } from '../navigation/RootNavigator';

export default function DashboardScreen() {
  // useNavigation<...> tipado com RootStackParamList: dá autocomplete e erro de
  // compilação se você tentar navigation.navigate('TelaQueNaoExiste').
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregandoTransacoes = useTransacoesStore((state) => state.carregando);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);

  // Array vazio de dependências = roda só uma vez, quando a tela monta na tela
  // (igual componentDidMount das classes antigas do React).
  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
    carregarSaldoInicial();
  }, [carregarCategorias, carregarTransacoes, carregarSaldoInicial]);

  const saldoAtual = useMemo(() => obterSaldoAtual(saldosIniciais), [saldosIniciais]);
  const categoriaPorId = useCategoriaPorId();

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
      <Text style={[styles.saldoAtual, saldoAtual < 0 && styles.saldoNegativo]}>
        {formatarReal(saldoAtual)}
      </Text>
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

      {carregandoTransacoes && transacoes.length === 0 ? (
        <Text style={styles.listaVazia}>Carregando...</Text>
      ) : (
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
              <ItemLista
                cor={categoria?.cor ?? colors.textMuted}
                titulo={item.descricao}
                subtitulo={`${categoria?.nome ?? 'Sem categoria'} · ${item.data}${
                  item.frequencia === 'mensal' ? ' · repete todo mês' : ''
                }`}
                valorTexto={`${sinal}${formatarReal(item.valor)}`}
                valorCor={item.tipo === 'receita' ? colors.success : colors.danger}
                onPress={() => navigation.navigate('NovaTransacao', { id: item.id })}
              />
            );
          }}
        />
      )}
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
  saldoNegativo: {
    color: colors.danger,
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
});
