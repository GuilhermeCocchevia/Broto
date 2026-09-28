import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { GraficoSaldo } from './GraficoSaldo';
import { CabecalhoDosMeses, LinhaMesProjetado } from './LinhaMesProjetado';
import { corDoSaldo } from '../utils/corPorValor';
import { calcularMesesDeGastoCobertos } from '../logic/saudeFinanceira';
import type { MesProjetado, ResultadoViabilidade } from '../logic/projecao';
import { DECORATIVO } from '../utils/acessibilidade';

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
  aposGrafico,
  mesesPesado,
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
  // Blocos entre o gráfico e a tabela ("E se eu gastar menos?" e "Como
  // calculei") — o que explica e permite mexer no que está no gráfico fica
  // junto dele.
  aposGrafico?: ReactNode;
  // Cenário mais pesado, desenhado como linha tracejada no gráfico.
  mesesPesado?: MesProjetado[];
}) {
  // Leitor de tela: quando o veredito ou a mensagem MUDAM por uma ação da
  // pessoa (ex: escolheu "−10%" no "e se"), o foco continua no botão tocado e
  // ela não sabe o que aconteceu — então o novo veredito é anunciado em voz
  // alta. Pula a primeira renderização (senão anunciaria ao abrir a tela).
  const mensagemAtual = resultado.viavel ? mensagemViavel : mensagemNaoViavel;
  const primeiraRenderizacao = useRef(true);
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    AccessibilityInfo.announceForAccessibility(`${resultado.viavel ? 'Dá pra fazer!' : 'Cuidado'}. ${mensagemAtual}`);
  }, [resultado.viavel, mensagemAtual]);

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
        {/* Ícone só repete o que o título já diz ("Dá pra fazer!"/"Cuidado"). */}
        <View {...DECORATIVO}>
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
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.veredictoTitulo, { color: resultado.viavel ? colors.primaryDark : colors.danger }]}
        >
          {resultado.viavel ? 'Dá pra fazer!' : 'Cuidado'}
        </Text>
        <Text style={styles.veredictoTexto}>
          {resultado.viavel ? mensagemViavel : mensagemNaoViavel}
        </Text>
        {acaoAposVeredito}
      </View>

      <GraficoSaldo saldoAtual={saldoAtual} meses={resultado.meses} mesesPesado={mesesPesado} />

      {aposGrafico}

      <View style={styles.lista}>
        <CabecalhoDosMeses />
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
