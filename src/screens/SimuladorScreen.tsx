import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { calcularSaldoProjetado, calcularRendaFixaMedia, obterSaldoAtual, adicionarMeses } from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';
import { GraficoSaldo } from '../components/GraficoSaldo';
import { ItemLista } from '../components/ItemLista';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import type { RootStackParamList } from '../navigation/RootNavigator';

const MESES_PRA_FRENTE = 6;

export default function SimuladorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregandoSimulacoes = useSimulacoesStore((state) => state.carregando);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
    carregarSimulacoes();
    carregarSaldoInicial();
  }, [carregarCategorias, carregarTransacoes, carregarSimulacoes, carregarSaldoInicial]);

  // Renda fixa projetada = média dos últimos salários avulsos já registrados
  // (ver calcularRendaFixaMedia). Sem pelo menos 1 receita avulsa cadastrada,
  // isso fica 0 — não tem como estimar renda futura sem nenhum histórico real.
  const rendaFixaMensal = useMemo(() => calcularRendaFixaMedia(transacoes), [transacoes]);

  const saldoAtual = useMemo(
    () => obterSaldoAtual(saldosIniciais, transacoes),
    [saldosIniciais, transacoes],
  );

  // useMemo evita recalcular a projeção em todo re-render — só recalcula quando
  // as dependências realmente mudam (ex: depois de uma nova compra simulada).
  //
  // Detalhe importante: a projeção começa no MÊS QUE VEM, não no mês atual.
  // O `saldoAtual` já reflete tudo que aconteceu até hoje (é "quanto eu tenho
  // agora"); se a projeção também somasse as transações do mês atual em cima
  // disso, contaria as mesmas coisas duas vezes — mesmo erro que já corrigimos
  // com a renda fixa (ver [[Estimativa não pode se sobrepor ao dado real que a
  // gerou]] no segundo cérebro). Por isso o mês atual fica de fora da tabela:
  // ele já está "dentro" do saldoAtual, só o futuro precisa ser projetado.
  const meses = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    const proximoMes = adicionarMeses(mesAtual, 1);
    return calcularSaldoProjetado(
      transacoes,
      simulacoes,
      proximoMes,
      MESES_PRA_FRENTE,
      saldoAtual,
      rendaFixaMensal,
    );
  }, [transacoes, simulacoes, saldoAtual, rendaFixaMensal]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.title}>Simulador</Text>
      <Text style={styles.subtitle}>
        A partir de {formatarReal(saldoAtual)} de hoje, projeção pros próximos{' '}
        {MESES_PRA_FRENTE} meses.
      </Text>
      <Text style={styles.rendaFixa}>
        Renda fixa projetada: {formatarReal(rendaFixaMensal)}/mês
      </Text>

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => navigation.navigate('NovaSimulacao')}
      >
        <Text style={styles.botaoSecundarioTexto}>+ nova simulação</Text>
      </Pressable>

      <GraficoSaldo saldoAtual={saldoAtual} meses={meses} />

      <View style={styles.lista}>
        {meses.map((item) => (
          <View key={item.mes} style={styles.linha}>
            <Text style={styles.mes}>{item.mes}</Text>
            <View style={styles.valores}>
              <Text style={styles.entradas}>+{formatarReal(item.entradas)}</Text>
              <Text style={styles.saidas}>-{formatarReal(item.saidas)}</Text>
              <Text style={styles.saldo}>{formatarReal(item.saldo)}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.secaoTitulo}>Minhas simulações</Text>
      <View style={styles.lista}>
        {carregandoSimulacoes && simulacoes.length === 0 && (
          <Text style={styles.listaVazia}>Carregando...</Text>
        )}
        {!carregandoSimulacoes && simulacoes.length === 0 && (
          <Text style={styles.listaVazia}>Nenhuma simulação criada ainda.</Text>
        )}
        {simulacoes.map((simulacao) => {
          const categoria = categoriaPorId.get(simulacao.categoriaId);
          return (
            <ItemLista
              key={simulacao.id}
              cor={categoria?.cor ?? colors.textMuted}
              titulo={simulacao.descricao}
              subtitulo={`${simulacao.parcelas}x a partir de ${simulacao.dataInicio}`}
              valorTexto={formatarReal(simulacao.valorTotal)}
              onPress={() => navigation.navigate('NovaSimulacao', { id: simulacao.id })}
            />
          );
        })}
      </View>
    </ScrollView>
  );
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  rendaFixa: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 8,
  },
  botaoSecundario: {
    marginTop: 12,
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
  linha: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  mes: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  valores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  entradas: {
    color: colors.success,
    fontSize: 13,
  },
  saidas: {
    color: colors.danger,
    fontSize: 13,
  },
  saldo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 24,
    alignSelf: 'flex-start',
    paddingHorizontal: 24,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 12,
  },
});
