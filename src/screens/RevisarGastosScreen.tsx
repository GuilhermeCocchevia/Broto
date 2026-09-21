import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { ItemLista } from '../components/ItemLista';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import { listarDespesasDoMesPorValor } from '../logic/orcamentoMensal';
import { formatarReal } from '../utils/formatarReal';
import { corDaDespesa } from '../utils/corPorValor';
import type { RootStackParamList } from '../navigation/RootNavigator';

// "Rever gastos": um extrato só com as despesas do mês, da mais cara pra
// mais barata — o ponto de partida natural pra quem precisa cortar gasto
// pra fazer uma meta de economia/investimento caber (ver
// BotaoRevisarGastos, que leva pra cá). Mesma linha de ItemLista e mesma
// escala de cor (amarelo → vermelho) do Extrato normal, pra o usuário
// reconhecer de cara; tocar numa despesa abre a edição, onde dá pra baixar
// o valor ou parar uma recorrência (dataFim).
export default function RevisarGastosScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'RevisarGastos'>>();
  // `?.` porque a rota aceita `undefined` (abrir sem meta de corte, só pra
  // olhar as despesas).
  const reducaoNecessaria = route.params?.reducaoNecessaria ?? 0;

  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregandoTransacoes = useTransacoesStore((state) => state.carregando);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
  }, [carregarCategorias, carregarTransacoes]);

  const mesAtual = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const despesas = useMemo(() => listarDespesasDoMesPorValor(transacoes, mesAtual), [transacoes, mesAtual]);
  const totalDoMes = useMemo(() => despesas.reduce((soma, t) => soma + t.valor, 0), [despesas]);

  // A lista já vem ordenada, então o maior é o primeiro e o menor o último —
  // é o intervalo que corDaDespesa usa pra decidir onde cada uma cai entre
  // amarelo e vermelho.
  const despesaMaxima = despesas.length > 0 ? despesas[0].valor : 0;
  const despesaMinima = despesas.length > 0 ? despesas[despesas.length - 1].valor : 0;

  const carregandoEVazio = carregandoTransacoes && transacoes.length === 0;
  const semDespesa = !carregandoTransacoes && despesas.length === 0;

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        {reducaoNecessaria > 0 && (
          <View style={styles.cartaoMeta}>
            <Text style={styles.cartaoMetaTitulo}>Sua meta</Text>
            <Text style={styles.cartaoMetaTexto}>
              Reduzir cerca de {formatarReal(reducaoNecessaria)} por mês nas despesas pra essa
              simulação caber. Toque numa despesa pra baixar o valor ou encerrar ela.
            </Text>
          </View>
        )}

        {despesas.length > 0 && (
          <Text style={styles.total}>
            Despesas de {mesAtual}: {formatarReal(totalDoMes)}
          </Text>
        )}

        {carregandoEVazio && <Text style={styles.listaVazia}>Carregando...</Text>}
        {semDespesa && <Text style={styles.listaVazia}>Nenhuma despesa nesse mês.</Text>}

        <View style={styles.lista}>
          {despesas.map((item) => (
            <ItemLista
              key={item.id}
              cor={corDaDespesa(item.valor, despesaMinima, despesaMaxima)}
              brilho
              titulo={item.descricao}
              subtitulo={`${categoriaPorId.get(item.categoriaId)?.nome ?? 'Sem categoria'} · ${
                item.frequencia === 'mensal' ? 'fixa mensal' : item.data
              }`}
              valorTexto={`-${formatarReal(item.valor)}`}
              valorCor={colors.danger}
              onPress={() => navigation.navigate('NovaTransacao', { id: item.id })}
            />
          ))}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  // Mesmo "cartão levantado" do resto do app (veredito, aviso de sobra).
  cartaoMeta: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cartaoMetaTitulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 14,
    color: colors.primaryDark,
  },
  cartaoMetaTexto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  total: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  lista: {
    marginTop: 8,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
});
