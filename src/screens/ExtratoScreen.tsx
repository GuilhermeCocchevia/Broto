import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { BrilhoCeu } from '../components/CenaGameficada';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { formatarReal } from '../utils/formatarReal';
import { corDaDespesa } from '../utils/corPorValor';
import { ItemLista } from '../components/ItemLista';
import { useCategoriaPorId } from '../hooks/useCategoriaPorId';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { Transacao } from '../types/models';

// Dentro de cada seção (fixas ou únicas), receita sempre vem antes de
// despesa — não importa a data — pra ficar óbvio de relance "isso é
// dinheiro entrando" antes de "isso é dinheiro saindo", em vez de misturado
// cronologicamente. Dentro de cada um dos dois grupos, mais recente
// primeiro. `[...lista]` copia antes de ordenar (`.sort()` muta o array
// original, e mutar o que vive dentro da store é o tipo de bug sutil que
// só aparece bem mais tarde).
function ordenarComReceitasPrimeiro(lista: Transacao[]): Transacao[] {
  return [...lista].sort((a, b) => {
    if (a.tipo !== b.tipo) {
      return a.tipo === 'receita' ? -1 : 1;
    }
    return a.data < b.data ? 1 : -1;
  });
}

// Extrato completo — antes vivia dentro do Dashboard, mas com o tempo (mais
// transações lançadas) foi deixando a tela inicial poluída, competindo com
// o saldo e os botões pela atenção. Virou tela própria, igual Categorias e
// Resumo já eram — o Dashboard volta a ser só "quanto eu tenho e o que eu
// quero fazer agora".
//
// Separado em duas seções (fixas mensais x únicas) em vez de uma lista só:
// é a mesma pergunta que qualquer app de finanças tenta responder — "o que
// é um compromisso recorrente (aluguel, assinatura) e o que foi um gasto
// pontual (aquela compra de uma vez)?" — misturado numa lista só, cronológica,
// isso fica difícil de enxergar de relance.
export default function ExtratoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregandoTransacoes = useTransacoesStore((state) => state.carregando);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const categoriaPorId = useCategoriaPorId();

  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
  }, [carregarCategorias, carregarTransacoes]);

  // O "espectro" de cor da despesa é relativo a TODAS as despesas (fixas e
  // únicas juntas) — é em relação a esse intervalo inteiro que cada uma cai
  // entre amarelo e vermelho, não só dentro do próprio grupo.
  const { despesaMinima, despesaMaxima } = useMemo(() => {
    const valoresDeDespesa = transacoes
      .filter((transacao) => transacao.tipo === 'despesa')
      .map((transacao) => transacao.valor);

    if (valoresDeDespesa.length === 0) {
      return { despesaMinima: 0, despesaMaxima: 0 };
    }

    return {
      despesaMinima: Math.min(...valoresDeDespesa),
      despesaMaxima: Math.max(...valoresDeDespesa),
    };
  }, [transacoes]);

  const fixas = useMemo(
    () => ordenarComReceitasPrimeiro(transacoes.filter((t) => t.frequencia === 'mensal')),
    [transacoes],
  );
  const unicas = useMemo(
    () => ordenarComReceitasPrimeiro(transacoes.filter((t) => t.frequencia === 'unica')),
    [transacoes],
  );

  function renderizarLinha(item: Transacao) {
    const categoria = categoriaPorId.get(item.categoriaId);
    const sinal = item.tipo === 'receita' ? '+' : '-';
    // Marcador por VALOR, não por categoria: receita sempre vira moeda
    // dourada; despesa vira uma cor entre amarelo e vermelho vivo, mais
    // perto do vermelho quanto maior o gasto comparado aos outros que
    // existem.
    const marcador =
      item.tipo === 'receita'
        ? { moeda: true }
        : { cor: corDaDespesa(item.valor, despesaMinima, despesaMaxima), brilho: true };
    return (
      <ItemLista
        key={item.id}
        {...marcador}
        titulo={item.descricao}
        subtitulo={`${categoria?.nome ?? 'Sem categoria'} · ${item.data}`}
        valorTexto={`${sinal}${formatarReal(item.valor)}`}
        valorCor={item.tipo === 'receita' ? colors.success : colors.danger}
        onPress={() => navigation.navigate('NovaTransacao', { id: item.id })}
      />
    );
  }

  const carregandoEVazio = carregandoTransacoes && transacoes.length === 0;
  const semTransacaoNenhuma = !carregandoTransacoes && transacoes.length === 0;

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      {/* Sem título próprio aqui: a tela usa "Large Title" nativo (ver
          RootNavigator.tsx) — o cabeçalho do sistema já mostra "Extrato"
          grande, repetir o mesmo texto no corpo da tela seria redundante. */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        // Sem isso, o "Large Title" nativo fica flutuando por CIMA do
        // conteúdo em vez de empurrá-lo pra baixo — ver o comentário
        // equivalente em SimuladorScreen.tsx.
        contentInsetAdjustmentBehavior="automatic"
      >
        {carregandoEVazio && <Text style={styles.listaVazia}>Carregando...</Text>}
        {semTransacaoNenhuma && (
          <Text style={styles.listaVazia}>Nenhuma transação lançada ainda.</Text>
        )}

        {fixas.length > 0 && (
          <>
            <Text style={styles.secaoTitulo}>Fixas mensais</Text>
            <View style={styles.lista}>{fixas.map(renderizarLinha)}</View>
          </>
        )}

        {unicas.length > 0 && (
          <>
            <Text style={styles.secaoTitulo}>Únicas</Text>
            <View style={styles.lista}>{unicas.map(renderizarLinha)}</View>
          </>
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
    paddingBottom: 40,
  },
  secaoTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  lista: {
    marginTop: 8,
  },
  listaVazia: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: 24,
  },
});
