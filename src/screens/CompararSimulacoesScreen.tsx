import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { PainelViabilidade } from '../components/PainelViabilidade';
import { BotaoRevisarGastos } from '../components/BotaoRevisarGastos';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import {
  avaliarViabilidadeConjunta,
  calcularRendaFixaMedia,
  calcularParcelaEfetiva,
  calcularReducaoMensalNecessaria,
  obterSaldoAtual,
} from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';

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
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
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

  const saldoAtual = useMemo(
    () => obterSaldoAtual(saldosIniciais, transacoes),
    [saldosIniciais, transacoes],
  );
  const rendaFixaMensal = useMemo(() => calcularRendaFixaMedia(transacoes), [transacoes]);

  const simulacoesEscolhidas = useMemo(
    () => simulacoes.filter((s) => selecionadas.has(s.id)),
    [simulacoes, selecionadas],
  );

  // Só calcula (e só mostra o painel) com 2 ou mais escolhidas — com 0 ou 1
  // não tem "combinação" nenhuma pra avaliar, é só a tela de detalhe normal.
  const resultado = useMemo(() => {
    if (simulacoesEscolhidas.length < 2) return null;
    return avaliarViabilidadeConjunta(simulacoesEscolhidas, transacoes, saldoAtual, rendaFixaMensal);
  }, [simulacoesEscolhidas, transacoes, saldoAtual, rendaFixaMensal]);

  // Só quando TODAS as escolhidas são metas de guardar (economia,
  // rendimento, aposentadoria) o caminho é gastar menos — se tem uma compra
  // no meio, ainda dá pra ajustar ela, então a mensagem antiga continua
  // valendo (ver o mesmo raciocínio em DetalheSimulacaoScreen).
  const todasSaoMetaDeGuardar = simulacoesEscolhidas.every((s) => s.tipo !== 'compra');
  const reducaoMensal = useMemo(
    () => (resultado && !resultado.viavel && todasSaoMetaDeGuardar ? calcularReducaoMensalNecessaria(resultado.meses) : 0),
    [resultado, todasSaoMetaDeGuardar],
  );

  const mensagens = useMemo(() => {
    if (!resultado) return null;
    const nomes = simulacoesEscolhidas.map((s) => `"${s.descricao}"`).join(' + ');
    const situacao = `Fazendo ${nomes} ao mesmo tempo, seu saldo fica negativo em ${resultado.piorMes} (ficaria em ${formatarReal(resultado.piorSaldo)}).`;
    return {
      viavel: `Dá pra fazer ${nomes} ao mesmo tempo, sem faltar dinheiro pro resto das suas contas.`,
      naoViavel: todasSaoMetaDeGuardar
        ? `${situacao} Pra manter essas metas, o caminho é gastar menos: cerca de ${formatarReal(reducaoMensal)} a menos por mês resolve.`
        : `${situacao} Talvez valha ajustar alguma delas, ou escalonar no tempo.`,
    };
  }, [resultado, simulacoesEscolhidas, todasSaoMetaDeGuardar, reducaoMensal]);

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

        {resultado && mensagens && (
          <PainelViabilidade
            resultado={resultado}
            saldoAtual={saldoAtual}
            mensagemViavel={mensagens.viavel}
            mensagemNaoViavel={mensagens.naoViavel}
            acaoAposVeredito={reducaoMensal > 0 ? <BotaoRevisarGastos reducaoMensal={reducaoMensal} /> : undefined}
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
