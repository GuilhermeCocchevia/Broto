import { useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { BrilhoCeu } from '../components/CenaGameficada';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { interpolarCor } from '../utils/corPorValor';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { calcularParcelaEfetiva, calcularRendaEsperadaDoMes } from '../logic/projecao';
import { calcularDespesasTotaisDoMes, projetarSituacaoAtual, avaliarSituacaoAtual } from '../logic/orcamentoMensal';
import { calcularSobraMensal, sugerirInvestimentoInicial } from '../logic/sobraMensal';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { usePremissasDeProjecao } from '../hooks/usePremissasDeProjecao';
import { formatarReal } from '../utils/formatarReal';
import { ItemLista } from '../components/ItemLista';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { mesAtualLocal, hojeLocal } from '../utils/dataLocal';
import { formatarDataBr } from '../utils/formatarDataBr';

// Altura (em px) da faixa mais escura que sobra embaixo do botão "de pé" no
// aviso de sobra — mesma técnica "de botão de jogo pixel" do resto do app
// (ver BotaoMenu em DashboardScreen.tsx).
const ALTURA_BASE_BOTAO_SOBRA = 4;

// Lista de simulações — cada cartão é só um resumo (descrição, valor,
// termos). Tocar num cartão NÃO edita direto — abre a tela de detalhe
// (DetalheSimulacaoScreen), que cruza aquela simulação específica com as
// receitas/despesas reais do usuário e mostra um veredito de viabilidade
// ("dá pra fazer essa compra?"/"dá pra bater essa meta?"). Editar/excluir
// viraram ações DENTRO da tela de detalhe, não o toque direto no cartão —
// antes essa tela também mostrava um gráfico e uma tabela de projeção
// GERAL (misturando todas as simulações), o que deixava a pergunta "dá
// pra fazer ESSA compra específica?" sem resposta nenhuma.
export default function SimuladorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregandoSimulacoes = useSimulacoesStore((state) => state.carregando);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarSimulacoes();
    carregarTransacoes();
    carregarSaldoInicial();
  }, [carregarCategorias, carregarSimulacoes, carregarTransacoes, carregarSaldoInicial]);

  // "Depois de despesas reais e simulações já ativas, ainda sobra dinheiro
  // todo mês?" — nunca recomenda o que fazer com isso, só avisa e oferece
  // simular o rendimento (ver botão abaixo). Sem despesa nenhuma ainda,
  // calcularSobraMensal já devolve 0 sozinho — mesma cautela de nunca
  // pressionar usada na reserva de emergência.
  //
  // As despesas usadas aqui são as REAIS do mês atual
  // (calcularDespesasTotaisDoMes, o mesmo cálculo do cartão "Orçamento do
  // mês" no Dashboard) — não mais uma média dos últimos meses fechados.
  // Bug real reportado testando com dados reais: quem acabou de cadastrar
  // as despesas recorrentes (todas começando "esse mês") tinha meses
  // anteriores praticamente vazios no histórico, e a média inflava a
  // sobra pra um valor que não existia de verdade — mesmo erro de
  // raciocínio já corrigido na projeção do Simulador (ver
  // calcularSaldoProjetado em projecao.ts).
  //
  // `usePremissasDeProjecao` já centraliza saldoAtual/rendaFixaMensal/
  // estimativa (mesma fonte que Detalhe da Simulação e Dashboard usam) —
  // um lugar só, sem cada tela recalcular à própria maneira.
  const { saldoAtual, rendaFixaMensal, estimativa } = usePremissasDeProjecao();
  const mesAtual = useMemo(() => mesAtualLocal(), []);
  // A renda esperada do mês não é só `rendaFixaMensal` (essa é só a
  // estimativa a partir de receitas AVULSAS passadas, pensada pra preencher
  // meses sem dado real) — precisa somar também qualquer receita
  // RECORRENTE ('mensal') já cadastrada, senão um salário lançado como
  // recorrente (em vez de avulso todo mês) sumiria da conta. Reaproveita
  // calcularSaldoProjetado (sem nenhuma simulação) pra pegar as entradas do
  // mês do jeito EXATO que o resto do app já projeta — sem duplicar essa
  // soma numa lógica separada aqui.
  const rendaMensalEsperada = useMemo(
    () => calcularRendaEsperadaDoMes(transacoes, mesAtual, rendaFixaMensal),
    [transacoes, mesAtual, rendaFixaMensal],
  );
  const despesasDoMes = useMemo(
    () => calcularDespesasTotaisDoMes(transacoes, mesAtual),
    [transacoes, mesAtual],
  );
  const sobraMensal = useMemo(
    () => calcularSobraMensal(rendaMensalEsperada, despesasDoMes, simulacoes, mesAtual),
    [rendaMensalEsperada, despesasDoMes, simulacoes, mesAtual],
  );
  // Bug real corrigido (2026-09-27): "sobra esse mês" sozinho não basta —
  // já vimos no Dashboard e no Detalhe de Simulação que um mês parecer
  // tranquilo não significa nada sobre o que vem depois (um salário do
  // fim do mês pode já ter destino nas contas do mês seguinte, ou o saldo
  // pode ficar negativo daqui a alguns meses mesmo com esse mês de folga).
  // Antes de convidar a investir, confere o mesmo motor dia a dia que o
  // resto do app usa: só convida quando a situação está genuinamente
  // tranquila olhando pra frente, não só "esse mês fechou no positivo".
  const situacaoAtual = useMemo(() => {
    const projecao = projetarSituacaoAtual(transacoes, simulacoes, saldoAtual, hojeLocal(), estimativa);
    return avaliarSituacaoAtual(projecao);
  }, [transacoes, simulacoes, saldoAtual, estimativa]);
  const podeConvidarParaInvestir = sobraMensal > 0 && situacaoAtual.nivel === 'tranquilo';
  const temSimulacoes = simulacoes.length > 0;
  // Investimento inicial sugerido pro formulário aberto pelo botão do aviso
  // de sobra: só o que o saldo tem ALÉM de um mês de despesas (ver
  // sugerirInvestimentoInicial).
  const investimentoInicialSugerido = useMemo(
    () => sugerirInvestimentoInicial(saldoAtual, despesasDoMes),
    [saldoAtual, despesasDoMes],
  );

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      {/* Sem título próprio aqui: a tela usa "Large Title" nativo (ver
          RootNavigator.tsx) — o cabeçalho do sistema já mostra "Simulador"
          grande, repetir o mesmo texto no corpo da tela era redundante. */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Neutro de propósito: avisa que sobra dinheiro e oferece simular
            o rendimento — nunca recomenda ONDE guardar. Some sozinho
            quando não sobra nada (ou sem despesa média confiável ainda),
            mesma cautela de nunca insistir usada na reserva de emergência
            (ver reservaDeEmergencia.ts). Texto muda conforme já existe ou
            não alguma simulação ativa — antes da primeira simulação, "sobra"
            só pode estar descontando despesas reais (não existe simulação
            nenhuma pra descontar ainda); depois, deixa claro que já conta
            com o que já foi simulado. */}
        {podeConvidarParaInvestir && (
          <View style={styles.avisoSobra}>
            <Text style={styles.avisoSobraTexto}>
              {temSimulacoes
                ? `Depois de despesas e simulações ativas, ainda sobram ~${formatarReal(sobraMensal)}/mês.`
                : `Depois das suas despesas, ainda sobram ~${formatarReal(sobraMensal)}/mês.`}
            </Text>
            <Pressable accessibilityRole="button"
              style={styles.avisoSobraBotaoMoldura}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('NovaSimulacao', {
                  tipoSugerido: 'rendimento',
                  valorMensalSugerido: sobraMensal,
                  aporteInicialSugerido: investimentoInicialSugerido,
                });
              }}
            >
              {({ pressed }) => (
                <View
                  style={[styles.avisoSobraBotaoFace, { paddingBottom: pressed ? 0 : ALTURA_BASE_BOTAO_SOBRA }]}
                >
                  <View style={styles.avisoSobraBotaoBrilho} pointerEvents="none" />
                  <SymbolView
                    name="hand.point.right.fill"
                    size={18}
                    tintColor="#FFFFFF"
                    fallback={<Ionicons name="hand-right-outline" size={18} color="#FFFFFF" />}
                  />
                  <Text style={styles.avisoSobraBotaoTexto}>Simular quanto isso renderia guardado</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.botaoNovaSimulacao}>
          <BotaoPrimario
            label="+ nova simulação"
            onPress={() => navigation.navigate('NovaSimulacao')}
          />
        </View>

        {/* Só faz sentido "comparar" com 2 ou mais simulações existentes —
            texto colorido sem caixa (ação secundária, mesmo padrão do
            resto do app) pra não competir visualmente com "+ nova
            simulação". */}
        {simulacoes.length >= 2 && (
          <Pressable accessibilityRole="button"
            style={styles.botaoComparar}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('CompararSimulacoes');
            }}
          >
            <Text style={styles.botaoCompararTexto}>Comparar simulações</Text>
          </Pressable>
        )}

        <View style={styles.lista}>
          {carregandoSimulacoes && simulacoes.length === 0 && (
            <Text style={styles.listaVazia}>Carregando...</Text>
          )}
          {!carregandoSimulacoes && simulacoes.length === 0 && (
            <Text style={styles.listaVazia}>Nenhuma simulação criada ainda.</Text>
          )}
          {simulacoes.map((simulacao) => {
            const categoria = categoriaPorId.get(simulacao.categoriaId);
            // Mostra o valor REAL de cada parcela (já com juros embutidos, se
            // houver, só pra 'compra' — ver calcularParcelaEfetiva) — antes
            // mostrava só o valor total, que não deixava claro o efeito do
            // juros mês a mês.
            const valorDaParcela = calcularParcelaEfetiva(simulacao);
            // 'economia'/'rendimento'/'aposentadoria' ganham a moeda dourada
            // (a mesma de receita) em vez da bolinha de categoria — reforça
            // "isso é dinheiro guardado pra você", diferente visualmente de
            // uma compra (que é uma saída de dinheiro, categoria-colorida
            // como despesa).
            const marcador =
              simulacao.tipo === 'economia' || simulacao.tipo === 'rendimento' || simulacao.tipo === 'aposentadoria'
                ? { moeda: true }
                : { cor: categoria?.cor ?? colors.textMuted };
            // Só 'rendimento'/'aposentadoria' podem ter um aporte inicial
            // (ver comentário no tipo Simulacao, em models.ts).
            const temAporteInicial =
              (simulacao.tipo === 'rendimento' || simulacao.tipo === 'aposentadoria') &&
              simulacao.aporteInicial > 0;
            const trechoAporteInicial = temAporteInicial
              ? ` + ${formatarReal(simulacao.aporteInicial)} inicial`
              : '';
            const subtitulo =
              simulacao.tipo === 'aposentadoria'
                ? `Guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial} por ${simulacao.parcelas} meses · aposentadoria · a partir de ${formatarDataBr(simulacao.dataInicio)}`
                : simulacao.tipo === 'rendimento'
                  ? `Guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial} por ${simulacao.parcelas} meses · rendendo · a partir de ${formatarDataBr(simulacao.dataInicio)}`
                  : simulacao.tipo === 'economia'
                    ? `Guarde ${formatarReal(valorDaParcela)}/mês por ${simulacao.parcelas} meses · a partir de ${formatarDataBr(simulacao.dataInicio)}`
                    : `${simulacao.parcelas}x de ${formatarReal(valorDaParcela)} a partir de ${formatarDataBr(simulacao.dataInicio)}`;
            return (
              <ItemLista
                key={simulacao.id}
                {...marcador}
                titulo={simulacao.descricao}
                subtitulo={subtitulo}
                valorTexto={formatarReal(simulacao.valorTotal + simulacao.aporteInicial)}
                onPress={() => navigation.navigate('DetalheSimulacao', { id: simulacao.id })}
              />
            );
          })}
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  botaoNovaSimulacao: {
    width: '100%',
    paddingHorizontal: 24,
  },
  // Mesmo "cartão levantado" (sombra + cantos grandes) usado no resto do
  // app pra resultado/informação de simulação — cor neutra de propósito
  // (não é boa nem má notícia, só um aviso), mas com o mesmo capricho
  // visual dos outros cartões, não mais uma caixa branca chapada.
  avisoSobra: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  avisoSobraTexto: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 21,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  // Mesmo molde "de botão de jogo pixel" do resto do app (contorno +
  // base 3D que some ao pressionar) — antes era só texto sublinhado,
  // usuário reportou que não parecia clicável. A mãozinha apontando
  // (SF Symbol, com fallback de ícone no Android/web) reforça ainda mais
  // que é uma ação, não só mais uma frase.
  avisoSobraBotaoMoldura: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    backgroundColor: interpolarCor(colors.primary, '#000000', 0.3),
  },
  avisoSobraBotaoFace: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingTop: 11,
    paddingHorizontal: 14,
  },
  avisoSobraBotaoBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  avisoSobraBotaoTexto: {
    color: '#FFFFFF',
    fontFamily: 'Bungee_400Regular',
    fontSize: 12,
    textAlign: 'center',
    flexShrink: 1,
  },
  // Sem borda/caixa: ação secundária no iOS costuma ser só texto colorido,
  // mesma lógica já usada no resto do app (ex: "Importar backup").
  botaoComparar: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botaoCompararTexto: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 14,
  },
  lista: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 12,
  },
});
