import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import {
  calcularGastoPorCategoria,
  calcularTaxaDePoupanca,
  calcularComprometimentoDeRendaFixa,
} from '../logic/saudeFinanceira';
import { formatarReal } from '../utils/formatarReal';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';

// Tela de "saúde financeira" do mês — de propósito separada do Dashboard.
// O Dashboard existe pra responder "quanto eu tenho agora" com um número só,
// sem competir por atenção; aqui é pra quando o usuário decide parar pra
// pensar sobre o próprio dinheiro. Em camadas: primeiro pra onde foi o
// dinheiro (a pergunta mais natural), depois os dois números de leitura
// rápida — reserva de emergência fica de fora por enquanto, só faz sentido
// ao lado de uma meta, que ainda não existe no app.
export default function ResumoScreen() {
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
  }, [carregarCategorias, carregarTransacoes]);

  // Mês corrente, mesma convenção (ISO/UTC) já usada em SimuladorScreen.
  const mesAtual = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const gastoPorCategoria = useMemo(
    () => calcularGastoPorCategoria(transacoes, mesAtual),
    [transacoes, mesAtual],
  );
  const maiorGasto = gastoPorCategoria[0]?.total ?? 0;

  const taxaDePoupanca = useMemo(
    () => calcularTaxaDePoupanca(transacoes, mesAtual),
    [transacoes, mesAtual],
  );
  const comprometimentoDeRendaFixa = useMemo(
    () => calcularComprometimentoDeRendaFixa(transacoes, mesAtual),
    [transacoes, mesAtual],
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.title}>Resumo</Text>
      <Text style={styles.subtitle}>Sua saúde financeira este mês.</Text>

      <Text style={styles.secaoTitulo}>Pra onde foi seu dinheiro</Text>
      {gastoPorCategoria.length === 0 ? (
        <Text style={styles.listaVazia}>Nenhuma despesa registrada este mês ainda.</Text>
      ) : (
        <View style={styles.listaCategorias}>
          {gastoPorCategoria.map((item) => {
            const categoria = categoriaPorId.get(item.categoriaId);
            // Proporção em relação ao maior gasto do mês, não ao total — é o
            // que deixa visualmente óbvio qual categoria pesa mais, sem
            // precisar calcular porcentagem de cabeça.
            const proporcao = maiorGasto === 0 ? 0 : item.total / maiorGasto;
            return (
              <View key={item.categoriaId} style={styles.linhaCategoria}>
                <View style={styles.linhaCategoriaTopo}>
                  <Text style={styles.nomeCategoria}>{categoria?.nome ?? 'Sem categoria'}</Text>
                  <Text style={styles.valorCategoria}>{formatarReal(item.total)}</Text>
                </View>
                <View style={styles.barraFundo}>
                  <View
                    style={[
                      styles.barraPreenchida,
                      { width: `${proporcao * 100}%`, backgroundColor: categoria?.cor ?? colors.textMuted },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.cartoes}>
        <View style={styles.cartao}>
          <Text style={styles.cartaoValor}>{formatarPorcentagem(taxaDePoupanca)}</Text>
          <Text style={styles.cartaoRotulo}>guardado este mês</Text>
        </View>
        <View style={styles.cartao}>
          <Text style={styles.cartaoValor}>{formatarPorcentagem(comprometimentoDeRendaFixa)}</Text>
          <Text style={styles.cartaoRotulo}>da renda já é conta fixa</Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Porcentagem sem casas decimais (ex: 0.234 -> "23%") — precisão de fração
// de ponto percentual não ajuda em nada essa leitura rápida.
function formatarPorcentagem(proporcao: number): string {
  return `${Math.round(proporcao * 100)}%`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
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
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 32,
    alignSelf: 'flex-start',
  },
  listaVazia: {
    marginTop: 12,
    color: colors.textMuted,
  },
  listaCategorias: {
    width: '100%',
    marginTop: 12,
    gap: 16,
  },
  linhaCategoria: {
    width: '100%',
  },
  linhaCategoriaTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  nomeCategoria: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  valorCategoria: {
    fontSize: 14,
    color: colors.textMuted,
  },
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: 4,
  },
  cartoes: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginTop: 32,
  },
  cartao: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  cartaoValor: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cartaoRotulo: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
