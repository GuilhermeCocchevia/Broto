import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { BrilhoCeu } from '../components/CenaGameficada';
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
import { mesAtualLocal } from '../utils/dataLocal';

// Tela de "saúde financeira" do mês — de propósito separada do Dashboard.
// O Dashboard existe pra responder "quanto eu tenho agora" com um número só,
// sem competir por atenção; aqui é pra quando o usuário decide parar pra
// pensar sobre o próprio dinheiro. Em camadas: primeiro pra onde foi o
// dinheiro (a pergunta mais natural), depois os dois números de leitura
// rápida.
//
// A reserva de emergência (convite opt-in + "X meses cobertos") que vivia
// aqui foi removida — com a barra de orçamento do Dashboard e a Meta de
// economia do Simulador (as duas usando despesas REAIS do mês, não uma
// média histórica) essa pergunta já é respondida de um jeito mais direto e
// confiável em outro lugar; não fazia mais sentido manter uma terceira
// versão separada, mais fraca, dessa mesma ideia.
export default function ResumoScreen() {
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
  }, [carregarCategorias, carregarTransacoes]);

  // Mês corrente, mesma convenção (ISO/UTC) já usada em SimuladorScreen.
  const mesAtual = useMemo(() => mesAtualLocal(), []);

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
    // Sem título próprio aqui: a tela usa "Large Title" nativo (ver
    // RootNavigator.tsx) — o cabeçalho do sistema já mostra "Resumo"
    // grande, repetir o mesmo texto no corpo da tela era redundante.
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        // Sem isso, o "Large Title" nativo fica flutuando por CIMA do
        // conteúdo em vez de empurrá-lo pra baixo — ver o comentário
        // equivalente em SimuladorScreen.tsx.
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.subtitle}>Sua saúde financeira este mês.</Text>

        <Text accessibilityRole="header" style={styles.secaoTitulo}>Pra onde foi seu dinheiro</Text>
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
                    >
                      {/* Mesmo "verniz" de brilho dos botões gameficados — a
                          barra chapada destoava do resto do app depois da
                          polida. */}
                      <LinearGradient
                        colors={['rgba(255, 255, 255, 0.35)', 'rgba(255, 255, 255, 0)']}
                        style={styles.barraBrilho}
                        pointerEvents="none"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.cartoes}>
          <View
            accessible
            accessibilityLabel={`${formatarPorcentagem(taxaDePoupanca)} guardado este mês`}
            style={styles.cartao}
          >
            <SymbolView
              name="banknote.fill"
              size={20}
              tintColor={colors.primaryDark}
              fallback={<Ionicons name="cash-outline" size={20} color={colors.primaryDark} />}
            />
            <Text style={styles.cartaoValor}>{formatarPorcentagem(taxaDePoupanca)}</Text>
            <Text style={styles.cartaoRotulo}>guardado este mês</Text>
          </View>
          <View
            accessible
            accessibilityLabel={`${formatarPorcentagem(comprometimentoDeRendaFixa)} da renda já é conta fixa`}
            style={styles.cartao}
          >
            <SymbolView
              name="doc.text.fill"
              size={20}
              tintColor={colors.primaryDark}
              fallback={<Ionicons name="receipt-outline" size={20} color={colors.primaryDark} />}
            />
            <Text style={styles.cartaoValor}>{formatarPorcentagem(comprometimentoDeRendaFixa)}</Text>
            <Text style={styles.cartaoRotulo}>da renda já é conta fixa</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Porcentagem sem casas decimais (ex: 0.234 -> "23%") — precisão de fração
// de ponto percentual não ajuda em nada essa leitura rápida.
function formatarPorcentagem(proporcao: number): string {
  return `${Math.round(proporcao * 100)}%`;
}

// Sombra bem sutil dos cartões de estatística — antes eram caixas brancas
// totalmente chapadas, sem nenhuma separação do fundo creme, a marca
// registrada de "tela genérica de SaaS" que destoava do resto do app já
// polido.
const sombraCartao = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 4,
  elevation: 2,
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  conteudo: {
    alignItems: 'center',
    // paddingTop pequeno agora — quem reserva o espaço de "título" é o
    // Large Title nativo, não mais um Text solto aqui dentro.
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 24,
    gap: 8,
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
  // Track da barra com um leve fundo (não mais `colors.surface` chapado) —
  // já é o suficiente pra separar visualmente do card branco por trás dela.
  barraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  // `position: relative` + `overflow: hidden` contêm o brilho (`barraBrilho`,
  // ver JSX) dentro dos cantos arredondados da barra.
  barraPreenchida: {
    height: '100%',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  // Mesmo "verniz" dos botões gameficados — cobre só a metade de cima da
  // barra preenchida.
  barraBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
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
    gap: 4,
    ...sombraCartao,
  },
  cartaoValor: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cartaoRotulo: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
