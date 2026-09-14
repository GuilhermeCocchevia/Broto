import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { parsearValorMonetario } from '../utils/parsearValorMonetario';
import { validarData } from '../utils/validarData';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Formulário de "e se eu comprar isso?" — cria uma Simulacao (compra
// hipotética, possivelmente parcelada) que entra na projeção do Simulador
// sem nunca virar uma Transacao de verdade.
export default function NovaSimulacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NovaSimulacao'>>();
  const idEditando = route.params?.id;

  const categorias = useCategoriasStore((state) => state.categorias);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const adicionar = useSimulacoesStore((state) => state.adicionar);
  const atualizar = useSimulacoesStore((state) => state.atualizar);
  const remover = useSimulacoesStore((state) => state.remover);

  const [descricao, setDescricao] = useState('');
  const [valorTotalTexto, setValorTotalTexto] = useState('');
  const [parcelasTexto, setParcelasTexto] = useState('1');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: idEditando ? 'Editar simulação' : 'Nova simulação' });
  }, [navigation, idEditando]);

  useEffect(() => {
    if (!idEditando) return;
    const simulacao = simulacoes.find((s) => s.id === idEditando);
    if (simulacao) {
      setDescricao(simulacao.descricao);
      setValorTotalTexto(String(simulacao.valorTotal));
      setParcelasTexto(String(simulacao.parcelas));
      setDataInicio(simulacao.dataInicio);
      setCategoriaId(simulacao.categoriaId);
    }
  }, [idEditando, simulacoes]);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    const valorTotal = parsearValorMonetario(valorTotalTexto);
    // parcelas vem de TextInput com teclado numérico, mas ainda assim é texto
    // até aqui — Number.isInteger confere que não veio algo tipo "3.5x".
    const parcelas = Number(parcelasTexto);

    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (valorTotal === null || valorTotal <= 0) {
      setErro('Informe um valor total válido, maior que zero.');
      return;
    }
    if (!Number.isInteger(parcelas) || parcelas <= 0) {
      setErro('Número de parcelas precisa ser um número inteiro maior que zero.');
      return;
    }
    if (!validarData(dataInicio)) {
      setErro('Data inválida. Use o formato AAAA-MM-DD, ex: 2026-09-14.');
      return;
    }
    if (!categoriaId) {
      setErro('Escolha uma categoria.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const dados = { descricao: descricao.trim(), valorTotal, parcelas, dataInicio, categoriaId };
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
    Alert.alert('Excluir simulação', 'Essa ação não pode ser desfeita.', [
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
        placeholder="Ex: TV nova"
      />

      <Text style={styles.rotulo}>Valor total (R$)</Text>
      <TextInput
        style={styles.input}
        value={valorTotalTexto}
        onChangeText={setValorTotalTexto}
        placeholder="Ex: 1000"
        keyboardType="decimal-pad"
      />

      <Text style={styles.rotulo}>Parcelas (1 = à vista)</Text>
      <TextInput
        style={styles.input}
        value={parcelasTexto}
        onChangeText={setParcelasTexto}
        placeholder="Ex: 10"
        keyboardType="number-pad"
      />

      <Text style={styles.rotulo}>Data da 1ª parcela</Text>
      <TextInput
        style={styles.input}
        value={dataInicio}
        onChangeText={setDataInicio}
        placeholder="AAAA-MM-DD"
      />

      <Text style={styles.rotulo}>Categoria</Text>
      <View style={styles.opcoes}>
        {categorias.map((categoria) => (
          <OpcaoBotao
            key={categoria.id}
            label={categoria.nome}
            selecionado={categoriaId === categoria.id}
            onPress={() => setCategoriaId(categoria.id)}
          />
        ))}
        {categorias.length === 0 && (
          <Text style={styles.avisoSemCategoria}>
            Nenhuma categoria cadastrada ainda — crie uma no Dashboard primeiro.
          </Text>
        )}
      </View>

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
          <Text style={styles.botaoExcluirTexto}>Excluir simulação</Text>
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
  avisoSemCategoria: {
    color: colors.danger,
    fontSize: 13,
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
