import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { useMetaReservaStore } from '../store/useMetaReservaStore';
import {
  calcularGastoPorCategoria,
  calcularTaxaDePoupanca,
  calcularComprometimentoDeRendaFixa,
} from '../logic/saudeFinanceira';
import { obterSaldoAtual, adicionarMeses } from '../logic/projecao';
import {
  obterMetaAtual,
  calcularDespesaMediaMensal,
  calcularMesesDeReservaCobertos,
  taxaDePoupancaPositivaPorMesesSeguidos,
} from '../logic/reservaDeEmergencia';
import { formatarReal } from '../utils/formatarReal';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';

// Quantos meses "fechados" olhar pra trás tanto pra estimar a despesa média
// quanto pra checar a sequência de meses com taxa de poupança positiva.
const MESES_PARA_ANALISE = 3;

// Tela de "saúde financeira" do mês — de propósito separada do Dashboard.
// O Dashboard existe pra responder "quanto eu tenho agora" com um número só,
// sem competir por atenção; aqui é pra quando o usuário decide parar pra
// pensar sobre o próprio dinheiro. Em camadas: primeiro pra onde foi o
// dinheiro (a pergunta mais natural), depois os dois números de leitura
// rápida, por último a reserva de emergência — só aparece se o usuário
// pedir (ver comentário mais abaixo).
export default function ResumoScreen() {
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const metas = useMetaReservaStore((state) => state.metas);
  const carregarMetas = useMetaReservaStore((state) => state.carregar);
  const atualizarMeta = useMetaReservaStore((state) => state.atualizar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
    carregarSaldoInicial();
    carregarMetas();
  }, [carregarCategorias, carregarTransacoes, carregarSaldoInicial, carregarMetas]);

  // Mês corrente, mesma convenção (ISO/UTC) já usada em SimuladorScreen.
  const mesAtual = useMemo(() => new Date().toISOString().slice(0, 7), []);
  // O mês atual ainda não "fechou" — pra saber se os últimos meses foram
  // consistentemente bons, ou pra calcular uma despesa média confiável, olha
  // a partir do mês ANTERIOR, nunca do corrente (que muda a cada lançamento
  // novo, não é um dado estável ainda).
  const ultimoMesFechado = useMemo(() => adicionarMeses(mesAtual, -1), [mesAtual]);

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

  // --- Reserva de emergência ---
  // Fica escondida por padrão. Só aparece um convite (nunca a métrica em si)
  // quando: (a) o usuário nunca foi perguntado, ou (b) ele recusou antes MAS
  // a saúde financeira dele melhorou de verdade desde então — nunca insiste
  // só porque passou tempo. "Melhorou" aqui é objetivo: taxa de poupança
  // positiva nos últimos 3 meses fechados seguidos (ver
  // reservaDeEmergencia.ts pro raciocínio completo dessa escolha).
  const metaAtual = useMemo(() => obterMetaAtual(metas), [metas]);
  const despesaMediaMensal = useMemo(
    () => calcularDespesaMediaMensal(transacoes, ultimoMesFechado, MESES_PARA_ANALISE),
    [transacoes, ultimoMesFechado],
  );
  const condicaoDeMelhoraAtingida = useMemo(
    () => taxaDePoupancaPositivaPorMesesSeguidos(transacoes, ultimoMesFechado, MESES_PARA_ANALISE),
    [transacoes, ultimoMesFechado],
  );
  const saldoAtual = useMemo(
    () => obterSaldoAtual(saldosIniciais, transacoes),
    [saldosIniciais, transacoes],
  );
  const mesesDeReservaCobertos = useMemo(
    () => calcularMesesDeReservaCobertos(saldoAtual, despesaMediaMensal),
    [saldoAtual, despesaMediaMensal],
  );

  // 3 meses do gasto médio é o ponto de partida clássico de reserva de
  // emergência — só sugerido quando já existe despesa suficiente registrada
  // pra fazer sentido (sem isso, "sugerimos R$0" ficaria sem sentido).
  const valorSugerido = despesaMediaMensal * 3;
  const temDadosSuficientes = despesaMediaMensal > 0;

  const mostrarConviteInicial = metaAtual === null && temDadosSuficientes;
  const mostrarConviteDeVolta = metaAtual !== null && !metaAtual.ativa && condicaoDeMelhoraAtingida;
  const mostrarIndicador = metaAtual !== null && metaAtual.ativa;

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

      {mostrarConviteInicial && (
        <View style={styles.convite}>
          <Text style={styles.conviteTitulo}>Quer acompanhar uma reserva de emergência?</Text>
          <Text style={styles.conviteTexto}>
            Baseado no seu gasto médio dos últimos meses, um ponto de partida comum é{' '}
            {formatarReal(valorSugerido)} (3 meses de despesa). É só uma sugestão de referência, não
            uma cobrança — dá pra ativar e desativar quando quiser.
          </Text>
          <View style={styles.conviteBotoes}>
            <Pressable
              style={styles.conviteBotaoSecundario}
              onPress={() => atualizarMeta(false, null)}
            >
              <Text style={styles.conviteBotaoSecundarioTexto}>Agora não</Text>
            </Pressable>
            <Pressable style={styles.conviteBotao} onPress={() => atualizarMeta(true, valorSugerido)}>
              <Text style={styles.conviteBotaoTexto}>Quero</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mostrarConviteDeVolta && (
        <View style={styles.convite}>
          <Text style={styles.conviteTitulo}>Sua saúde financeira melhorou</Text>
          <Text style={styles.conviteTexto}>
            Você guardou dinheiro nos últimos {MESES_PARA_ANALISE} meses seguidos. Quer ativar o
            acompanhamento da reserva de emergência agora?
          </Text>
          <View style={styles.conviteBotoes}>
            <Pressable
              style={styles.conviteBotaoSecundario}
              onPress={() => atualizarMeta(false, null)}
            >
              <Text style={styles.conviteBotaoSecundarioTexto}>Agora não</Text>
            </Pressable>
            <Pressable style={styles.conviteBotao} onPress={() => atualizarMeta(true, valorSugerido)}>
              <Text style={styles.conviteBotaoTexto}>Quero</Text>
            </Pressable>
          </View>
        </View>
      )}

      {mostrarIndicador && (
        <View style={styles.reservaCartao}>
          <Text style={styles.reservaValor}>
            {mesesDeReservaCobertos.toFixed(1)} {mesesDeReservaCobertos === 1 ? 'mês' : 'meses'}
          </Text>
          <Text style={styles.reservaRotulo}>de despesas cobertos pelo saldo atual</Text>
          {metaAtual?.valorAlvo != null && (
            <Text style={styles.reservaMeta}>Meta: {formatarReal(metaAtual.valorAlvo)}</Text>
          )}
        </View>
      )}
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
  convite: {
    width: '100%',
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  conviteTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  conviteTexto: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  conviteBotoes: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  conviteBotao: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  conviteBotaoTexto: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 14,
  },
  conviteBotaoSecundario: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  conviteBotaoSecundarioTexto: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 14,
  },
  reservaCartao: {
    width: '100%',
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  reservaValor: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  reservaRotulo: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  reservaMeta: {
    marginTop: 8,
    fontSize: 13,
    color: colors.text,
  },
});
