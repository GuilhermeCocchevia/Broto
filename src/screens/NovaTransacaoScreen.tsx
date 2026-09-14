import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
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
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const adicionar = useTransacoesStore((state) => state.adicionar);
  const atualizar = useTransacoesStore((state) => state.atualizar);
  const remover = useTransacoesStore((state) => state.remover);

  const [descricao, setDescricao] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [frequencia, setFrequencia] = useState<Frequencia>('unica');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

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
      setCategoriaId(transacao.categoriaId);
    }
  }, [idEditando, transacoes]);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    // valorTexto vem de um TextInput, ou seja, sempre é string — Number('abc')
    // não dá erro, devolve NaN ("Not a Number"), por isso a checagem explícita.
    const valor = Number(valorTexto.replace(',', '.'));

    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (!valorTexto || Number.isNaN(valor) || valor <= 0) {
      setErro('Informe um valor válido, maior que zero.');
      return;
    }
    if (!categoriaId) {
      setErro('Escolha uma categoria.');
      return;
    }

    setErro(null);
    try {
      const dados = {
        descricao: descricao.trim(),
        valor,
        data,
        tipo,
        categoriaId,
        frequencia,
        dataFim: null,
      };
      if (idEditando) {
        await atualizar(idEditando, dados);
      } else {
        await adicionar(dados);
      }
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(`Não consegui salvar: ${String(erroAoSalvar)}`);
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
      setErro(`Não consegui excluir: ${String(erroAoExcluir)}`);
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

      <Pressable style={styles.botaoSalvar} onPress={salvar}>
        <Text style={styles.botaoSalvarTexto}>{idEditando ? 'Salvar alterações' : 'Salvar'}</Text>
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
