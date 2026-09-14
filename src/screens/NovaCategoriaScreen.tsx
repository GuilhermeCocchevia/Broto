import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TipoTransacao } from '../types/models';

// Paleta de cores fixa pra escolher a "cor da categoria" — mais simples do
// que um seletor de cor livre (roda de cores, etc.), e garante que toda
// categoria combina com o tema visual do app.
const CORES_DISPONIVEIS = [
  colors.primary,
  colors.primaryDark,
  colors.secondary,
  colors.accent,
  colors.success,
  colors.danger,
  colors.warning,
];

export default function NovaCategoriaScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NovaCategoria'>>();
  const idEditando = route.params?.id;

  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionar = useCategoriasStore((state) => state.adicionar);
  const atualizar = useCategoriasStore((state) => state.atualizar);
  const remover = useCategoriasStore((state) => state.remover);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [cor, setCor] = useState(CORES_DISPONIVEIS[0]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Muda o título no cabeçalho pra deixar claro se é edição ou criação —
  // `navigation.setOptions` é como você muda as opções da própria tela (título,
  // botões do header, etc.) depois que ela já montou, sem precisar de uma prop.
  useEffect(() => {
    navigation.setOptions({ title: idEditando ? 'Editar categoria' : 'Nova categoria' });
  }, [navigation, idEditando]);

  // Se veio um `id` pela navegação, é edição: preenche o formulário com os
  // dados que já existem, em vez de começar em branco.
  useEffect(() => {
    if (!idEditando) return;
    const categoria = categorias.find((c) => c.id === idEditando);
    if (categoria) {
      setNome(categoria.nome);
      setTipo(categoria.tipo);
      setCor(categoria.cor);
    }
  }, [idEditando, categorias]);

  // async pra poder usar `await`: só volta pra tela anterior DEPOIS de confirmar
  // que gravou de verdade no banco. Sem isso, se o `adicionar` falhar (ex: sem
  // conexão, erro do SQLite), a Promise rejeitada não tem quem capture o erro
  // (vira uma "unhandled rejection" silenciosa) e a tela já voltou como se
  // tivesse dado tudo certo — foi exatamente esse bug que pegamos testando.
  async function salvar() {
    if (!nome.trim()) {
      setErro('Preencha o nome da categoria.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      if (idEditando) {
        await atualizar(idEditando, { nome: nome.trim(), tipo, cor });
      } else {
        await adicionar({ nome: nome.trim(), tipo, cor });
      }
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(mensagemDeErro(erroAoSalvar, 'salvar'));
    } finally {
      setSalvando(false);
    }
  }

  function confirmarExclusao() {
    Alert.alert('Excluir categoria', 'Essa ação não pode ser desfeita.', [
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
      <Text style={styles.rotulo}>Nome</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Alimentação"
      />

      <Text style={styles.rotulo}>Tipo</Text>
      <View style={styles.opcoes}>
        <OpcaoBotao label="Receita" selecionado={tipo === 'receita'} onPress={() => setTipo('receita')} />
        <OpcaoBotao label="Despesa" selecionado={tipo === 'despesa'} onPress={() => setTipo('despesa')} />
      </View>

      <Text style={styles.rotulo}>Cor</Text>
      <View style={styles.opcoes}>
        {CORES_DISPONIVEIS.map((corDisponivel) => (
          <Pressable
            key={corDisponivel}
            style={[
              styles.bolinhaCor,
              { backgroundColor: corDisponivel },
              cor === corDisponivel && styles.bolinhaCorSelecionada,
            ]}
            onPress={() => setCor(corDisponivel)}
          />
        ))}
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
          <Text style={styles.botaoExcluirTexto}>Excluir categoria</Text>
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
  bolinhaCor: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bolinhaCorSelecionada: {
    borderColor: colors.text,
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
