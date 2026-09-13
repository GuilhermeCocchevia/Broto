import { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { calcularSaldoProjetado } from '../logic/projecao';

const MESES_PRA_FRENTE = 6;

// Formata dinheiro em Real. `toLocaleString` já sabe colocar "R$", separador
// de milhar e vírgula decimal do jeito que o Brasil usa, sem precisar montar
// a string na mão.
function formatarReal(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function SimuladorScreen() {
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);

  useEffect(() => {
    carregarTransacoes();
    carregarSimulacoes();
  }, [carregarTransacoes, carregarSimulacoes]);

  // useMemo evita recalcular a projeção em todo re-render — só recalcula quando
  // transacoes ou simulacoes realmente mudam (ex: depois de uma nova compra
  // simulada). Ainda não existe uma tela de "saldo atual", então por enquanto
  // a projeção parte de R$ 0 — isso muda quando o controle financeiro atual
  // (Fase 1 do app) existir de verdade.
  const meses = useMemo(() => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    return calcularSaldoProjetado(transacoes, simulacoes, mesAtual, MESES_PRA_FRENTE);
  }, [transacoes, simulacoes]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simulador</Text>
      <Text style={styles.subtitle}>Projeção de saldo pros próximos {MESES_PRA_FRENTE} meses.</Text>

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
