import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { CampoCategoria } from '../components/CampoCategoria';
import { parsearValorMonetario } from '../utils/parsearValorMonetario';
import { validarData } from '../utils/validarData';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import { escolherCorAutomatica, encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TipoTransacao, Frequencia } from '../types/models';

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
  const [valorTexto, setValorTexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [frequencia, setFrequencia] = useState<Frequencia>('unica');
  // Texto vazio = "repete pra sempre" (vira `null` ao salvar). Só é usado de
  // verdade quando frequencia === 'mensal' — ver o campo mais abaixo no JSX.
  const [dataFimTexto, setDataFimTexto] = useState('');
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
      setValorTexto(String(transacao.valor));
      setData(transacao.data);
      setTipo(transacao.tipo);
      setFrequencia(transacao.frequencia);
      setDataFimTexto(transacao.dataFim ?? '');
      // O campo guarda o NOME da categoria, não o id — então precisa achar
      // a categoria pelo id salvo na transação e pegar o nome dela.
      const categoriaAtual = categorias.find((c) => c.id === transacao.categoriaId);
      setCategoriaTexto(categoriaAtual?.nome ?? '');
    }
  }, [idEditando, transacoes, categorias]);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    const valor = parsearValorMonetario(valorTexto);

    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (valor === null || valor <= 0) {
      setErro('Informe um valor válido, maior que zero.');
      return;
    }
    if (!validarData(data)) {
      setErro('Data inválida. Use o formato AAAA-MM-DD, ex: 2026-09-14.');
      return;
    }
    // dataFim só faz sentido pra transação mensal, e é opcional mesmo assim
    // (vazio = repete pra sempre) — por isso só valida o formato se o
    // usuário de fato preencheu alguma coisa.
    if (frequencia === 'mensal' && dataFimTexto.trim() && !validarData(dataFimTexto)) {
      setErro('Data final inválida. Use o formato AAAA-MM-DD, ou deixe em branco.');
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
        dataFim: frequencia === 'mensal' && dataFimTexto.trim() ? dataFimTexto : null,
      };
      if (idEditando) {
        await atualizar(idEditando, dados);
      } else {
        await adicionar(dados);
      }
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(mensagemDeErro(erroAoSalvar, 'salvar'));
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir transação', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: excluir },
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
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.rotulo}>Descrição</Text>
      <TextInput
        style={styles.input}
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex: Salário de agosto"
      />

      <Text style={styles.rotulo}>Valor (R$)</Text>
      <TextInput
        style={styles.input}
        value={valorTexto}
        onChangeText={setValorTexto}
        placeholder="Ex: 3000"
        keyboardType="decimal-pad"
      />

      <Text style={styles.rotulo}>Data</Text>
      <TextInput
        style={styles.input}
        value={data}
        onChangeText={setData}
        placeholder="AAAA-MM-DD"
      />

      <Text style={styles.rotulo}>Tipo</Text>
      <View style={styles.opcoes}>
        <OpcaoBotao label="Receita" selecionado={tipo === 'receita'} onPress={() => setTipo('receita')} />
        <OpcaoBotao label="Despesa" selecionado={tipo === 'despesa'} onPress={() => setTipo('despesa')} />
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
          <Text style={styles.rotulo}>Repete até quando? (opcional)</Text>
          <TextInput
            style={styles.input}
            value={dataFimTexto}
            onChangeText={setDataFimTexto}
            placeholder="Deixe em branco pra repetir sempre"
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

      <Pressable
        style={[styles.botaoSalvar, salvando && styles.botaoDesabilitado]}
        onPress={salvar}
        disabled={salvando}
      >
        <Text style={styles.botaoSalvarTexto}>
          {salvando ? 'Salvando...' : idEditando ? 'Salvar alterações' : 'Salvar'}
        </Text>
      </Pressable>

      {idEditando && (
        <Pressable style={styles.botaoExcluir} onPress={confirmarExclusao}>
          <Text style={styles.botaoExcluirTexto}>Excluir transação</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
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
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoSalvarTexto: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  botaoExcluir: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  botaoExcluirTexto: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 16,
  },
});
