import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { GraficoSaldo } from './GraficoSaldo';
import { LinhaMesProjetado } from './LinhaMesProjetado';
import { corDoSaldo } from '../utils/corPorValor';
import { calcularMesesDeGastoCobertos } from '../logic/saudeFinanceira';
import type { ResultadoViabilidade } from '../logic/projecao';

// O bloco "veredito + gráfico + tabela" — compartilhado entre a tela de
// detalhe de UMA simulação (DetalheSimulacaoScreen) e a de avaliação
// CONJUNTA de várias (CompararSimulacoesScreen). As duas fazem exatamente a
// mesma pergunta ("dá pra fazer isso, cruzando com a vida financeira real
// do usuário?") — só muda QUEM está sendo avaliado e o texto das
// mensagens, que cada tela decide sozinha (uma simulação fala "essa
// compra", a outra fala "essas simulações juntas").
export function PainelViabilidade({
  resultado,
  saldoAtual,
  mensagemViavel,
  mensagemNaoViavel,
  acaoAposVeredito,
}: {
  resultado: ResultadoViabilidade;
  saldoAtual: number;
  mensagemViavel: string;
  mensagemNaoViavel: string;
  // Ação opcional DENTRO do cartão de veredito, logo abaixo da mensagem —
  // usada pra uma ação sugerida (ver BotaoRevisarGastos) ficar colada na
  // mensagem que a motivou, sem empurrar o gráfico pra baixo com um cartão
  // à parte.
  acaoAposVeredito?: ReactNode;
}) {
  // Toque no corpo confirma o veredito mesmo sem olhar pra tela — mesmo
  // padrão de "reforçar pelo toque" usado em salvar/excluir no resto do
  // app, só que aqui é informativo, não uma confirmação de ação. Só
  // dispara quando o VEREDITO muda de verdade (não a cada re-render).
  useEffect(() => {
    Haptics.notificationAsync(
      resultado.viavel
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado.viavel]);

  // Referência ABSOLUTA pra colorir a tabela — precisa ser o MESMO número
  // usado dentro do GraficoSaldo (ver comentário lá) pra cor de uma linha
  // sempre bater com a cor do ponto equivalente no gráfico logo acima.
  const despesaMediaDoPeriodo = useMemo(() => {
    if (resultado.meses.length === 0) return 0;
    return resultado.meses.reduce((soma, mes) => soma + mes.saidas, 0) / resultado.meses.length;
  }, [resultado.meses]);

  return (
    <>
      {/* O elemento mais importante da tela — o veredito de viabilidade,
          cruzando o que está sendo avaliado com a vida financeira REAL do
          usuário (não só uma projeção hipotética isolada). */}
      <View
        style={[styles.veredito, resultado.viavel ? styles.veredictoViavel : styles.veredictoNaoViavel]}
      >
        <SymbolView
          name={resultado.viavel ? 'checkmark.circle.fill' : 'exclamationmark.triangle.fill'}
          size={28}
          tintColor={resultado.viavel ? colors.primaryDark : colors.danger}
          fallback={
            <Ionicons
              name={resultado.viavel ? 'checkmark-circle' : 'warning-outline'}
              size={28}
              color={resultado.viavel ? colors.primaryDark : colors.danger}
            />
          }
        />
        <Text
          style={[styles.veredictoTitulo, { color: resultado.viavel ? colors.primaryDark : colors.danger }]}
        >
          {resultado.viavel ? 'Dá pra fazer!' : 'Cuidado'}
        </Text>
        <Text style={styles.veredictoTexto}>
          {resultado.viavel ? mensagemViavel : mensagemNaoViavel}
        </Text>
        {acaoAposVeredito}
      </View>

      <GraficoSaldo saldoAtual={saldoAtual} meses={resultado.meses} />

      <View style={styles.lista}>
        {resultado.meses.map((item) => (
          <LinhaMesProjetado
            key={item.mes}
            item={item}
            cor={corDoSaldo(calcularMesesDeGastoCobertos(item.saldo, despesaMediaDoPeriodo))}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Mesma sombra sutil dos cartões da Resumo/Backup — o veredito é o
  // elemento mais importante da tela, precisa parecer "levantado" do
  // fundo, não mais uma caixa chapada igual as outras.
  veredito: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  // Uma borda colorida fina (não preenchimento cheio) já basta pra separar
  // "viável"/"atenção" sem brigar com a paleta cream+verde do resto do
  // app — preenchimento sólido vermelho/verde ficaria pesado demais pra
  // uma mensagem informativa, não um erro de formulário.
  veredictoViavel: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  veredictoNaoViavel: {
    borderWidth: 2,
    borderColor: colors.danger,
  },
  veredictoTitulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 18,
  },
  veredictoTexto: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  lista: {
    width: '100%',
  },
});
