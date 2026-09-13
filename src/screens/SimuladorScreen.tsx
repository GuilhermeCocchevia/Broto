import { useEffect, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { calcularSaldoProjetado, calcularRendaFixaMedia } from '../logic/projecao';
import type { RootStackParamList } from '../navigation/RootNavigator';

const MESES_PRA_FRENTE = 6;

// Formata dinheiro em Real. `toLocaleString` já sabe colocar "R$", separador
// de milhar e vírgula decimal do jeito que o Brasil usa, sem precisar montar
// a string na mão.
function formatarReal(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SimuladorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);

  useEffect(() => {
    carregarTransacoes();
    carregarSimulacoes();
  }, [carregarTransacoes, carregarSimulacoes]);

  // Renda fixa projetada = média dos últimos salários avulsos já registrados
  // (ver calcularRendaFixaMedia). Sem pelo menos 1 receita avulsa cadastrada,
  // isso fica 0 — não tem como estimar renda futura sem nenhum histórico real.
  const rendaFixaMensal = useMemo(() => calcularRendaFixaMedia(transacoes), [transacoes]);

  // useMemo evita recalcular a projeção em todo re-render — só recalcula quando
  // transacoes ou simulacoes realmente mudam (ex: depois de uma nova compra
  // simulada). Ainda não existe uma tela de "saldo atual", então por enquanto
  // a projeção parte de R$ 0 de saldo — isso muda quando o controle financeiro
  // atual (Fase 1 do app) existir de verdade.
  const meses = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    return calcularSaldoProjetado(
      transacoes,
      simulacoes,
      mesAtual,
      MESES_PRA_FRENTE,
      0,
      rendaFixaMensal,
    );
  }, [transacoes, simulacoes, rendaFixaMensal]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simulador</Text>
      <Text style={styles.subtitle}>Projeção de saldo pros próximos {MESES_PRA_FRENTE} meses.</Text>
      <Text style={styles.rendaFixa}>
        Renda fixa projetada: {formatarReal(rendaFixaMensal)}/mês
      </Text>

      <Pressable
        style={styles.botaoSecundario}
        onPress={() => navigation.navigate('NovaSimulacao')}
      >
        <Text style={styles.botaoSecundarioTexto}>+ nova simulação</Text>
      </Pressable>

      <FlatList
        style={styles.lista}
        data={meses}
        keyExtractor={(item) => item.mes}
        renderItem={({ item }) => (
          <View style={styles.linha}>
            <Text style={styles.mes}>{item.mes}</Text>
            <View style={styles.valores}>
              <Text style={styles.entradas}>+{formatarReal(item.entradas)}</Text>
              <Text style={styles.saidas}>-{formatarReal(item.saidas)}</Text>
              <Text style={styles.saldo}>{formatarReal(item.saldo)}</Text>
            </View>
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
});
