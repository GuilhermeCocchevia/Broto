import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { CampoCategoria } from '../components/CampoCategoria';
import { CampoTexto } from '../components/CampoTexto';
import { CampoMoeda } from '../components/CampoMoeda';
import { CampoData } from '../components/CampoData';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { BrilhoCeu } from '../components/CenaGameficada';
import {
  calcularDataFimPorQuantidadeDeMeses,
  calcularQuantidadeDeMesesPorDataFim,
} from '../logic/projecao';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import { escolherCorAutomatica, encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TipoTransacao, Frequencia } from '../types/models';
import { hojeLocal } from '../utils/dataLocal';

// Formulário genérico de lançamento — serve tanto pra registrar um salário já
// recebido (receita, avulsa, com data no passado) quanto uma despesa comum, ou
// uma receita/despesa recorrente. Usamos useState pra cada campo (formulário
// "controlado": o valor mostrado no input sempre vem do estado do React, nunca
// direto do que o usuário digitou) em vez de uma biblioteca de formulário —
// com esses ~6 campos ainda compensa fazer na mão.
export default function NovaTransacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NovaTransacao'>>();
  const idEditando = route.params?.id;

  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionarCategoria = useCategoriasStore((state) => state.adicionar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const adicionar = useTransacoesStore((state) => state.adicionar);
  const atualizar = useTransacoesStore((state) => state.atualizar);
  const remover = useTransacoesStore((state) => state.remover);

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState(0);
  const [data, setData] = useState(hojeLocal());
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [frequencia, setFrequencia] = useState<Frequencia>('unica');
  // Texto vazio = "repete pra sempre" (vira `dataFim: null` ao salvar). Só é
  // usado de verdade quando frequencia === 'mensal' — ver o campo mais
  // abaixo no JSX. Pedimos "quantos meses" (não uma data final) porque é
  // assim que a pessoa já pensa numa compra recorrente — associa direto com
  // a quantidade de parcelas, tipo "financiei em 12x" — bem mais natural do
  // que calcular de cabeça em qual mês/ano aquilo termina. A conversão pra
  // data (o que o banco realmente guarda) fica em salvar(), ver
  // calcularDataFimPorQuantidadeDeMeses em logic/projecao.ts.
  const [quantidadeMesesTexto, setQuantidadeMesesTexto] = useState('');
  // Nome digitado no campo de categoria — não é mais um id de categoria já
  // escolhida. Resolvido (ou criado, se for nome novo) só na hora de salvar,
  // ver salvar() abaixo. Isso é o que junta "escolher categoria" e "criar
  // categoria nova" num campo só, em vez de duas telas separadas.
  const [categoriaTexto, setCategoriaTexto] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  // Impede clique duplo: enquanto uma gravação está em andamento, o botão
  // fica desabilitado — sem isso, dois toques rápidos disparavam duas
  // inserções antes da primeira terminar e a tela navegar de volta.
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: idEditando ? 'Editar transação' : 'Nova transação' });
  }, [navigation, idEditando]);

  useEffect(() => {
    if (!idEditando) return;
    const transacao = transacoes.find((t) => t.id === idEditando);
    if (transacao) {
      setDescricao(transacao.descricao);
      setValor(transacao.valor);
      setData(transacao.data);
      setTipo(transacao.tipo);
      setFrequencia(transacao.frequencia);
      // O banco só guarda a data final calculada, não a quantidade de meses
      // que a pessoa digitou — refaz a conta de trás pra frente só pra
      // pré-preencher o campo com um número que faça sentido de novo.
      setQuantidadeMesesTexto(
        transacao.dataFim
          ? String(calcularQuantidadeDeMesesPorDataFim(transacao.data, transacao.dataFim))
          : '',
      );
      // O campo guarda o NOME da categoria, não o id — então precisa achar
      // a categoria pelo id salvo na transação e pegar o nome dela.
      const categoriaAtual = categorias.find((c) => c.id === transacao.categoriaId);
      setCategoriaTexto(categoriaAtual?.nome ?? '');
    }
  }, [idEditando, transacoes, categorias]);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (valor <= 0) {
      setErro('Informe um valor válido, maior que zero.');
      return;
    }
    // Quantidade de meses só faz sentido pra transação mensal, e é opcional
    // mesmo assim (vazio = repete pra sempre) — por isso só valida se o
    // usuário de fato preencheu alguma coisa.
    const quantidadeMeses = Number(quantidadeMesesTexto);
    if (
      frequencia === 'mensal' &&
      quantidadeMesesTexto.trim() &&
      (!Number.isInteger(quantidadeMeses) || quantidadeMeses <= 0)
    ) {
      setErro('A quantidade de meses precisa ser um número inteiro maior que zero, ou deixe em branco.');
      return;
    }
    if (!categoriaTexto.trim()) {
      setErro('Escolha ou digite uma categoria.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      // Resolve a categoria pelo nome digitado: se já existe uma com esse
      // nome (e o mesmo tipo receita/despesa), reaproveita ela. Se não,
      // cria uma categoria nova na hora — é isso que junta "escolher" e
      // "criar" categoria num campo só.
      const categoriaExistente = encontrarCategoriaPorNome(categorias, categoriaTexto, tipo);
      const categoriaId = categoriaExistente
        ? categoriaExistente.id
        : await adicionarCategoria({
            nome: categoriaTexto.trim(),
            tipo,
            cor: escolherCorAutomatica(categorias.length),
          });

      const dados = {
        descricao: descricao.trim(),
        valor,
        data,
        tipo,
        categoriaId,
        frequencia,
        dataFim:
          frequencia === 'mensal' && quantidadeMesesTexto.trim()
            ? calcularDataFimPorQuantidadeDeMeses(data, quantidadeMeses)
            : null,
      };
      if (idEditando) {
        await atualizar(idEditando, dados);
      } else {
        await adicionar(dados);
      }
      // Toque de sucesso — confirma pelo "corpo" que gravou, sem precisar
      // olhar pra tela nesse instante exato (ela já está saindo).
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (erroAoSalvar) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErro(mensagemDeErro(erroAoSalvar, 'salvar'));
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir transação', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        // Toque de "atenção" no exato instante que confirma a ação
        // irreversível — mesmo padrão nas outras telas com exclusão.
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          excluir();
        },
      },
    ]);
  }

  async function excluir() {
    if (!idEditando) return;
    try {
      await remover(idEditando);
      navigation.goBack();
    } catch (erroAoExcluir) {
      setErro(mensagemDeErro(erroAoExcluir, 'excluir'));
    }
  }

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        <Text style={styles.rotulo}>Descrição</Text>
        <CampoTexto value={descricao} onChangeText={setDescricao} placeholder="Ex: Salário de agosto" />

        <Text style={styles.rotulo}>Valor (R$)</Text>
        <CampoMoeda valor={valor} onChangeValor={setValor} />

        <Text style={styles.rotulo}>Data</Text>
        <CampoData valor={data} onChangeValor={setData} atalhosRapidos />

        <Text style={styles.rotulo}>Tipo</Text>
        <View style={styles.opcoes}>
          <OpcaoBotao
            label="Receita"
            selecionado={tipo === 'receita'}
            onPress={() => setTipo('receita')}
          />
          <OpcaoBotao
            label="Despesa"
            selecionado={tipo === 'despesa'}
            onPress={() => setTipo('despesa')}
          />
        </View>

        <Text style={styles.rotulo}>Frequência</Text>
        <View style={styles.opcoes}>
          <OpcaoBotao
            label="Avulsa (única vez)"
            selecionado={frequencia === 'unica'}
            onPress={() => setFrequencia('unica')}
          />
          <OpcaoBotao
            label="Mensal (repete)"
            selecionado={frequencia === 'mensal'}
            onPress={() => setFrequencia('mensal')}
          />
        </View>

        {frequencia === 'mensal' && (
          <>
            <Text style={styles.rotulo}>Repete por quantos meses? (opcional)</Text>
            <CampoTexto
              value={quantidadeMesesTexto}
              onChangeText={setQuantidadeMesesTexto}
              placeholder="Ex: 12 — deixe em branco pra repetir sempre"
              keyboardType="number-pad"
            />
          </>
        )}

        <Text style={styles.rotulo}>Categoria</Text>
        <CampoCategoria
          tipo={tipo}
          categorias={categorias}
          valor={categoriaTexto}
          onChangeValor={setCategoriaTexto}
        />

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.botaoSalvar}>
          <BotaoPrimario
            label={salvando ? 'Salvando...' : idEditando ? 'Salvar alterações' : 'Salvar'}
            onPress={salvar}
            desabilitado={salvando}
          />
        </View>

        {idEditando && (
          <Pressable style={styles.botaoExcluir} onPress={confirmarExclusao}>
            <Text style={styles.botaoExcluirTexto}>Excluir transação</Text>
          </Pressable>
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
    gap: 4,
  },
  rotulo: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 6,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  erro: {
    color: colors.danger,
    marginTop: 16,
  },
  botaoSalvar: {
    marginTop: 24,
  },
  // Sem borda: ação destrutiva no iOS é texto colorido (aqui, vermelho), não
  // uma caixa contornada — mesma lógica do botão secundário sem caixa.
  botaoExcluir: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoExcluirTexto: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
});
