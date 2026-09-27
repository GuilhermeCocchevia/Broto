import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { BrilhoCeu } from '../components/CenaGameficada';
import { colors } from '../theme/colors';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useConquistasStore } from '../store/useConquistasStore';
import { avaliarConquistasElegiveis, CONQUISTAS, type Conquista } from '../logic/conquistas';
import { mesAtualLocal } from '../utils/dataLocal';
import { formatarDataBr, formatarDataPorExtenso } from '../utils/formatarDataBr';

// Lista de marcos que só sobem — nunca uma pontuação que cai com um mês
// ruim (ver logic/conquistas.ts pro raciocínio completo). Cada conquista já
// desbloqueada mostra quando; as trancadas mostram como chegar lá, nunca de
// forma cobrando — é só informação, no mesmo tom calmo do resto do app.
export default function ConquistasScreen() {
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const desbloqueadas = useConquistasStore((state) => state.desbloqueadas);
  const carregarConquistas = useConquistasStore((state) => state.carregar);

  useEffect(() => {
    carregarTransacoes();
    carregarSimulacoes();
    carregarConquistas();
  }, [carregarTransacoes, carregarSimulacoes, carregarConquistas]);

  // Reavalia ao vivo (não só o que já está salvo) — assim, mesmo antes de
  // `useDetectarConquistas` (que roda uma vez, no topo do app) terminar de
  // persistir uma conquista nova, essa tela já mostra o estado certo.
  const elegiveis = useMemo(
    () => new Set(avaliarConquistasElegiveis(transacoes, simulacoes, mesAtualLocal())),
    [transacoes, simulacoes],
  );
  const dataPorChave = useMemo(
    () => new Map(desbloqueadas.map((d) => [d.chave, d.desbloqueadaEm])),
    [desbloqueadas],
  );

  const quantidadeConquistada = CONQUISTAS.filter((c) => elegiveis.has(c.chave)).length;

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.subtitulo}>
          {quantidadeConquistada} de {CONQUISTAS.length} conquistadas
        </Text>

        <View style={styles.lista}>
          {CONQUISTAS.map((conquista) => (
            <LinhaConquista
              key={conquista.chave}
              conquista={conquista}
              conquistada={elegiveis.has(conquista.chave)}
              desbloqueadaEm={dataPorChave.get(conquista.chave)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function LinhaConquista({
  conquista,
  conquistada,
  desbloqueadaEm,
}: {
  conquista: Conquista;
  conquistada: boolean;
  desbloqueadaEm: string | undefined;
}) {
  return (
    // Uma conquista = UM elemento lido por inteiro, dizendo se já foi ganha
    // ou ainda está trancada (o cadeado e as cores não chegam ao leitor).
    <View
      accessible
      accessibilityLabel={
        conquistada
          ? `${conquista.titulo}. Conquistada. ${conquista.descricao}${
              desbloqueadaEm ? `. Desde ${formatarDataPorExtenso(desbloqueadaEm.slice(0, 10))}` : ''
            }`
          : `${conquista.titulo}. Ainda trancada. Como conseguir: ${conquista.comoConseguir}`
      }
      style={[styles.linha, !conquistada && styles.linhaTrancada]}
    >
      <View style={[styles.selo, conquistada ? styles.seloConquistado : styles.seloTrancado]}>
        <SymbolView
          name={(conquistada ? conquista.icone : 'lock.fill') as never}
          size={20}
          tintColor={conquistada ? '#FFFFFF' : colors.textMuted}
          fallback={
            <Ionicons
              name={(conquistada ? conquista.iconeFallback : 'lock-closed') as never}
              size={20}
              color={conquistada ? '#FFFFFF' : colors.textMuted}
            />
          }
        />
      </View>
      <View style={styles.linhaTexto}>
        <Text style={styles.linhaTitulo}>{conquista.titulo}</Text>
        <Text style={styles.linhaDescricao}>
          {conquistada ? conquista.descricao : conquista.comoConseguir}
        </Text>
        {conquistada && desbloqueadaEm && (
          <Text style={styles.linhaData}>Desde {formatarDataBr(desbloqueadaEm.slice(0, 10))}</Text>
        )}
      </View>
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
    gap: 16,
  },
  subtitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  lista: {
    gap: 12,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  // Trancada: mais apagada, sem sombra — não é "ruim", só ainda não
  // alcançada (nunca em vermelho/cor de alerta, mesma cautela de sempre).
  linhaTrancada: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  selo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloConquistado: {
    backgroundColor: colors.primary,
  },
  seloTrancado: {
    backgroundColor: colors.background,
  },
  linhaTexto: {
    flex: 1,
    gap: 2,
  },
  linhaTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  linhaDescricao: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  linhaData: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 2,
  },
});
