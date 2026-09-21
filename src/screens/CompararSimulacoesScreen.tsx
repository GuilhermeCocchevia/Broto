import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { PainelViabilidade } from '../components/PainelViabilidade';
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
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { avaliarViabilidadeConjunta, calcularParcelaEfetiva } from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';
import { formatarMesBr } from '../utils/formatarDataBr';

// "Dá pra fazer essa compra E bater essa meta de economia ao mesmo tempo,
// com o que eu realmente ganho e gasto?" — escolha 2 ou mais simulações
// abaixo pra ver o efeito COMBINADO delas na sua vida financeira real, não
// só uma de cada vez (ver DetalheSimulacaoScreen, que faz a mesma pergunta
// só que pra uma simulação isolada).
export default function CompararSimulacoesScreen() {
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  useEffect(() => {
    carregarTransacoes();
    carregarSimulacoes();
    carregarSaldoInicial();
  }, [carregarTransacoes, carregarSimulacoes, carregarSaldoInicial]);

  function alternarSelecao(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelecionadas((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  // Mesmas premissas do detalhe de uma simulação (ver DetalheSimulacaoScreen).
  const premissas = usePremissasDeProjecao();
  const { saldoAtual, rendaFixaMensal, estimativa } = premissas;

  const simulacoesEscolhidas = useMemo(
    () => simulacoes.filter((s) => selecionadas.has(s.id)),
    [simulacoes, selecionadas],
  );

  // Só avalia (e só mostra o painel) com 2 ou mais escolhidas — com 0 ou 1
  // não tem "combinação" nenhuma pra avaliar, é só a tela de detalhe normal.
  // Base, "e se" e cenário mais pesado: ver useCenarios/cenariosDeProjecao.ts.
  const avaliar = useMemo<Avaliador | null>(() => {
    if (simulacoesEscolhidas.length < 2) return null;
    return (estimativaAvaliada) =>
      avaliarViabilidadeConjunta(simulacoesEscolhidas, transacoes, saldoAtual, rendaFixaMensal, estimativaAvaliada);
  }, [simulacoesEscolhidas, transacoes, saldoAtual, rendaFixaMensal]);
  const { cenarios, reducaoPct, setReducaoPct } = useCenarios(estimativa, avaliar);
  const resultado = cenarios?.esperado ?? null;

  // Só quando TODAS as escolhidas são metas de guardar (economia,
  // rendimento, aposentadoria) o caminho é gastar menos — se tem uma compra
  // no meio, ainda dá pra ajustar ela, então a mensagem antiga continua
  // valendo (ver o mesmo raciocínio em DetalheSimulacaoScreen).
  const todasSaoMetaDeGuardar = simulacoesEscolhidas.every((s) => s.tipo !== 'compra');
  const sugestao = useMemo(
    () =>
      cenarios && !cenarios.base.viavel && todasSaoMetaDeGuardar
        ? sugestaoParaMetaDeGuardar({
            base: cenarios.base,
            corteNecessario: cenarios.corteNecessario,
            motivoSemSolucao: cenarios.motivoSemSolucao,
            plural: true,
          })
        : { texto: '', reducaoMensal: 0 },
    [cenarios, todasSaoMetaDeGuardar],
  );
  const reducaoMensal = sugestao.reducaoMensal;

  const mensagens = useMemo(() => {
    if (!resultado || !cenarios) return null;
    const nomes = simulacoesEscolhidas.map((s) => `"${s.descricao}"`).join(' + ');
    const comEseSe = reducaoPct > 0 ? `Com ${reducaoPct}% a menos no dia a dia, ` : '';
    const avisoDeFolga = montarAvisoDeFolga(cenarios.esperado, cenarios.pesado);
    const situacao = `${reducaoPct > 0 ? `${comEseSe}fazendo` : 'Fazendo'} ${nomes} ao mesmo tempo, seu saldo fica negativo em ${formatarMesBr(resultado.piorMes)} (ficaria em ${formatarReal(resultado.piorSaldo)}).`;
    return {
      viavel:
        `${comEseSe ? `${comEseSe}dá` : 'Dá'} pra fazer ${nomes} ao mesmo tempo, sem faltar dinheiro pro resto das suas contas.` +
        (avisoDeFolga ? ` ${avisoDeFolga}` : ''),
      naoViavel: todasSaoMetaDeGuardar
        ? `${situacao.charAt(0).toUpperCase()}${situacao.slice(1)}${reducaoPct === 0 && sugestao.texto ? ` ${sugestao.texto}` : ''}`
        : `${situacao.charAt(0).toUpperCase()}${situacao.slice(1)} Talvez valha ajustar alguma delas, ou escalonar no tempo.`,
    };
  }, [resultado, cenarios, reducaoPct, simulacoesEscolhidas, todasSaoMetaDeGuardar, sugestao]);

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.instrucao}>
          Escolha 2 ou mais simulações pra ver se dá pra fazer todas elas ao mesmo tempo, cruzando
          com suas receitas e despesas reais.
        </Text>

        {simulacoes.length === 0 && (
          <Text style={styles.listaVazia}>Nenhuma simulação criada ainda.</Text>
        )}

        <View style={styles.lista}>
          {simulacoes.map((simulacao) => {
            const selecionada = selecionadas.has(simulacao.id);
            // calcularParcelaEfetiva (não calcularValorDaParcela direto):
            // pra 'rendimento', taxaJurosMensal é taxa de rendimento
            // esperada, não custo de parcelamento — ver comentário na
            // função, em projecao.ts.
            const valorDaParcela = calcularParcelaEfetiva(simulacao);
            const trechoAporteInicial =
              simulacao.aporteInicial > 0 ? ` + ${formatarReal(simulacao.aporteInicial)} inicial` : '';
            const subtitulo =
              simulacao.tipo === 'aposentadoria'
                ? `Aposentadoria · guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial}`
                : simulacao.tipo === 'rendimento'
                  ? `Rendimento · guarde ${formatarReal(valorDaParcela)}/mês${trechoAporteInicial}`
                  : simulacao.tipo === 'economia'
                    ? `Meta · guarde ${formatarReal(valorDaParcela)}/mês`
                    : `Compra · ${simulacao.parcelas}x de ${formatarReal(valorDaParcela)}`;
            return (
              <Pressable
                key={simulacao.id}
                style={styles.linhaSelecao}
                onPress={() => alternarSelecao(simulacao.id)}
              >
                <SymbolView
                  name={selecionada ? 'checkmark.circle.fill' : 'circle'}
                  size={24}
                  tintColor={selecionada ? colors.primary : colors.textMuted}
                  fallback={
                    <Ionicons
                      name={selecionada ? 'checkmark-circle' : 'ellipse-outline'}
                      size={24}
                      color={selecionada ? colors.primary : colors.textMuted}
                    />
                  }
                />
                <View style={styles.linhaSelecaoInfo}>
                  <Text style={styles.linhaSelecaoTitulo}>{simulacao.descricao}</Text>
                  <Text style={styles.linhaSelecaoSubtitulo}>{subtitulo}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {simulacoesEscolhidas.length === 1 && (
          <Text style={styles.aviso}>Escolha mais uma pra comparar juntas.</Text>
        )}

        {resultado && cenarios && mensagens && (
          <PainelViabilidade
            resultado={resultado}
            saldoAtual={saldoAtual}
            mensagemViavel={mensagens.viavel}
            mensagemNaoViavel={mensagens.naoViavel}
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
        )}
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
    paddingTop: 16,
    alignItems: 'center',
    gap: 16,
  },
  instrucao: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  lista: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  linhaSelecao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  linhaSelecaoInfo: {
    flex: 1,
  },
  linhaSelecaoTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  linhaSelecaoSubtitulo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  aviso: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
  },
});
