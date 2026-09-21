import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { PainelViabilidade } from '../components/PainelViabilidade';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { BotaoRevisarGastos } from '../components/BotaoRevisarGastos';
import { PremissasDaProjecao } from '../components/PremissasDaProjecao';
import { EseSeCard } from '../components/EseSeCard';
import { usePremissasDeProjecao } from '../hooks/usePremissasDeProjecao';
import { useCenarios } from '../hooks/useCenarios';
import {
  montarAvisoDeFolga,
  sugestaoParaMetaDeGuardar,
  temFaixaDeCenarios,
  type Avaliador,
} from '../logic/cenariosDeProjecao';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { avaliarViabilidadeSimulacao, calcularParcelaEfetiva } from '../logic/projecao';
import { calcularValorFuturoLiquido } from '../logic/custosRendaFixa';
import { formatarReal } from '../utils/formatarReal';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import type { RootStackParamList } from '../navigation/RootNavigator';

// A pergunta que essa tela existe pra responder: "dá pra fazer ESSA compra
// (ou bater ESSA meta) específica, considerando o que eu realmente ganho e
// gasto?" — cruza a simulação com as transações reais do usuário (ver
// avaliarViabilidadeSimulacao em logic/projecao.ts) e mostra um veredito
// explícito, não só um gráfico bonito pra interpretar sozinho. O bloco de
// veredito/gráfico/tabela em si mora em PainelViabilidade.tsx,
// compartilhado com a avaliação conjunta (CompararSimulacoesScreen).
export default function DetalheSimulacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'DetalheSimulacao'>>();
  const { id } = route.params;

  const categorias = useCategoriasStore((state) => state.categorias);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  const simulacao = simulacoes.find((s) => s.id === id);

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
    carregarSimulacoes();
    carregarSaldoInicial();
  }, [carregarCategorias, carregarTransacoes, carregarSimulacoes, carregarSaldoInicial]);

  useEffect(() => {
    navigation.setOptions({ title: simulacao?.descricao ?? 'Simulação' });
  }, [navigation, simulacao?.descricao]);

  // Saldo atual, renda esperada e estimativa de gastos — montados num lugar
  // só (ver premissasDeProjecao.ts), os mesmos que a avaliação conjunta usa.
  const premissas = usePremissasDeProjecao();
  const { saldoAtual, rendaFixaMensal, estimativa } = premissas;

  // Só avalia de verdade se a simulação ainda existir (pode ter sido excluída
  // em outra tela/aba enquanto essa estava aberta). `useCenarios` avalia o que
  // o app assume (base), o "e se" escolhido pelo usuário (esperado) e o
  // cenário com 20% a mais de gasto (pesado, a linha tracejada) — ver
  // cenariosDeProjecao.ts.
  const avaliar = useMemo<Avaliador | null>(() => {
    if (!simulacao) return null;
    return (estimativaAvaliada) =>
      avaliarViabilidadeSimulacao(simulacao, transacoes, saldoAtual, rendaFixaMensal, estimativaAvaliada);
  }, [simulacao, transacoes, saldoAtual, rendaFixaMensal]);
  const { cenarios, reducaoPct, setReducaoPct } = useCenarios(estimativa, avaliar);
  const resultado = cenarios?.esperado ?? null;

  if (!simulacao || !cenarios || !resultado) {
    return (
      <View style={styles.wrapper}>
        <BrilhoCeu />
        <View style={styles.conteudoVazio}>
          <Text style={styles.listaVazia}>Essa simulação não existe mais.</Text>
        </View>
      </View>
    );
  }

  // `calcularParcelaEfetiva` (não `calcularValorDaParcela` direto): pra
  // 'rendimento', `taxaJurosMensal` guarda a taxa de RENDIMENTO esperada,
  // não custo de parcelamento — não pode entrar na fórmula de amortização,
  // senão o valor que sai do saldo fica inflado sem motivo (ver comentário
  // na função, em projecao.ts).
  const valorDaParcela = calcularParcelaEfetiva(simulacao);
  const categoria = categoriaPorId.get(simulacao.categoriaId);
  const ehEconomia = simulacao.tipo === 'economia';
  const ehRendimento = simulacao.tipo === 'rendimento';
  const ehAposentadoria = simulacao.tipo === 'aposentadoria';
  const ehModalidadeDeRendimento = ehRendimento || ehAposentadoria;

  // Só 'rendimento'/'aposentadoria' podem ter um aporte inicial (ver
  // comentário no tipo Simulacao, em models.ts) — as outras nunca preenchem
  // esse campo, então o trecho abaixo nunca aparece pra elas.
  const trechoAporteInicial =
    ehModalidadeDeRendimento && simulacao.aporteInicial > 0
      ? ` + ${formatarReal(simulacao.aporteInicial)} de investimento inicial`
      : '';
  const resumo = ehAposentadoria
    ? `Aposentadoria · guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial} por ${simulacao.parcelas} meses, a partir de ${simulacao.dataInicio}`
    : ehRendimento
      ? `Rendimento · guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial} por ${simulacao.parcelas} meses, a partir de ${simulacao.dataInicio}`
      : ehEconomia
        ? `Meta de economia · guarde ${formatarReal(valorDaParcela)}/mês por ${simulacao.parcelas} meses, a partir de ${simulacao.dataInicio}`
        : `Compra parcelada · ${simulacao.parcelas}x de ${formatarReal(valorDaParcela)}, a partir de ${simulacao.dataInicio}`;

  // Meta de economia/investimento: o valor guardado é o OBJETIVO, então
  // sugerir "guarde menos" contradiz o que o usuário quer — o que sobra pra
  // ajustar são as despesas (ou o começo da meta, quando o mês atual já
  // fechou no negativo). Só compra continua sugerindo mexer na própria
  // simulação (valor, parcelas, esperar).
  const ehMetaDeGuardar = ehEconomia || ehModalidadeDeRendimento;
  const sugestao =
    !cenarios.base.viavel && ehMetaDeGuardar
      ? sugestaoParaMetaDeGuardar({
          base: cenarios.base,
          corteNecessario: cenarios.corteNecessario,
          motivoSemSolucao: cenarios.motivoSemSolucao,
        })
      : { texto: '', reducaoMensal: 0 };
  const reducaoMensal = sugestao.reducaoMensal;

  // Com um corte do "e se" escolhido, o veredito descreve ESSE cenário.
  const comEseSe = reducaoPct > 0 ? `Com ${reducaoPct}% a menos no dia a dia, ` : '';
  const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);
  const avisoDeFolga = montarAvisoDeFolga(cenarios.esperado, cenarios.pesado);

  const mensagemViavelBase = ehModalidadeDeRendimento
    ? 'Dá pra guardar esse valor sem faltar dinheiro pro resto das suas contas.'
    : ehEconomia
      ? 'Dá pra bater essa meta sem faltar dinheiro pro resto das suas contas.'
      : 'Cabe no seu orçamento — seu saldo não fica negativo enquanto essa compra dura.';
  const mensagemViavel =
    (comEseSe ? `${comEseSe}${minuscula(mensagemViavelBase)}` : mensagemViavelBase) +
    (avisoDeFolga ? ` ${avisoDeFolga}` : '');

  const mensagemNaoViavel = ehMetaDeGuardar
    ? `${reducaoPct > 0 ? `Mesmo com ${reducaoPct}% a menos no dia a dia, seu` : 'Guardando esse valor, seu'} saldo fica negativo em ${resultado.piorMes} (ficaria em ${formatarReal(resultado.piorSaldo)}).${reducaoPct === 0 && sugestao.texto ? ` ${sugestao.texto}` : ''}`
    : `Essa compra deixaria seu saldo negativo em ${resultado.piorMes} (ficaria em ${formatarReal(resultado.piorSaldo)}). Talvez valha ajustar o valor, o número de parcelas, ou esperar um pouco.`;

  // Só existe (e só faz sentido mostrar) quando há taxa de rendimento OU
  // investimento inicial — sem nenhum dos dois, não tem "projeção" nenhuma
  // além da soma simples que já aparece no resumo acima. É uma PROJEÇÃO com
  // o número que o usuário mesmo digitou, o app nunca sugere nem promete
  // uma taxa. Já líquida de IR regressivo (os dois tipos) e de custódia B3
  // (só 'aposentadoria' — ver calcularValorFuturoLiquido).
  const resultadoLiquido =
    ehModalidadeDeRendimento && (simulacao.taxaJurosMensal > 0 || simulacao.aporteInicial > 0)
      ? calcularValorFuturoLiquido(
          valorDaParcela,
          simulacao.taxaJurosMensal,
          simulacao.parcelas,
          ehAposentadoria,
          simulacao.aporteInicial,
        )
      : null;

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.cabecalho}>
          {!ehEconomia && !ehModalidadeDeRendimento && (
            <View style={[styles.bolinhaCategoria, { backgroundColor: categoria?.cor ?? colors.textMuted }]} />
          )}
          <Text style={styles.resumo}>{resumo}</Text>
        </View>

        <PainelViabilidade
          resultado={resultado}
          saldoAtual={saldoAtual}
          mensagemViavel={mensagemViavel}
          mensagemNaoViavel={mensagemNaoViavel}
          acaoAposVeredito={reducaoMensal > 0 ? <BotaoRevisarGastos reducaoMensal={reducaoMensal} /> : undefined}
          mesesPesado={temFaixaDeCenarios(cenarios.esperado, cenarios.pesado) ? cenarios.pesado.meses : undefined}
          aposGrafico={
            <>
              <EseSeCard
                cenarios={cenarios}
                reducaoPct={reducaoPct}
                onChange={setReducaoPct}
                gastoDoDiaADia={premissas.gastoDoDiaADia}
              />
              <PremissasDaProjecao premissas={premissas} />
            </>
          }
        />

        {resultadoLiquido !== null && (
          <View style={styles.cartaoRendimento}>
            <Text style={styles.cartaoRendimentoTitulo}>
              {ehAposentadoria
                ? 'Valor projetado ao vencimento (já líquido de custos, em poder de compra de hoje)'
                : 'Rendimento projetado'}
            </Text>
            <Text style={styles.cartaoRendimentoTexto}>
              Guardando {formatarReal(valorDaParcela)}/mês por {simulacao.parcelas} meses
              {simulacao.taxaJurosMensal > 0
                ? ` a ${(simulacao.taxaJurosMensal * 100).toLocaleString('pt-BR')}% ao mês`
                : ''}
              {simulacao.aporteInicial > 0
                ? `, mais um investimento inicial de ${formatarReal(simulacao.aporteInicial)}`
                : ''}
              :
            </Text>
            <Text style={styles.cartaoRendimentoTexto}>
              Bruto: {formatarReal(resultadoLiquido.valorFuturoBruto)} ao final ({formatarReal(resultadoLiquido.ganhoBruto)}{' '}
              de rendimento)
            </Text>
            <Text style={styles.cartaoRendimentoTextoLiquido}>
              Líquido (após {(resultadoLiquido.aliquotaIR * 100).toLocaleString('pt-BR')}% de IR
              {ehAposentadoria ? ' e custódia B3' : ''}): {formatarReal(resultadoLiquido.valorFuturoLiquido)}
            </Text>
            <Text style={styles.cartaoRendimentoAviso}>
              Projeção com a taxa que você informou — o app não recomenda nem garante rendimento nenhum.
            </Text>
          </View>
        )}

        <View style={styles.botaoEditar}>
          <BotaoPrimario
            label="Editar simulação"
            onPress={() => navigation.navigate('NovaSimulacao', { id: simulacao.id })}
          />
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
    alignItems: 'center',
    gap: 16,
  },
  conteudoVazio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalho: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bolinhaCategoria: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  resumo: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  // Mesmo cartão com sombra do veredito de viabilidade (ver
  // PainelViabilidade.tsx) — é uma informação separada (quanto RENDERIA),
  // não substitui nem compete com o veredito de viabilidade acima (que é
  // sobre o dinheiro saindo do saldo, não sobre o quanto ele rende).
  cartaoRendimento: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    gap: 6,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  cartaoRendimentoTitulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 14,
    color: colors.primaryDark,
  },
  cartaoRendimentoTexto: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  cartaoRendimentoTextoLiquido: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    lineHeight: 20,
  },
  cartaoRendimentoAviso: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  botaoEditar: {
    width: '100%',
    marginTop: 8,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
  },
});
