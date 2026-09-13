import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Formulário de "e se eu comprar isso?" — cria uma Simulacao (compra
// hipotética, possivelmente parcelada) que entra na projeção do Simulador
// sem nunca virar uma Transacao de verdade.
export default function NovaSimulacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionar = useSimulacoesStore((state) => state.adicionar);

  const [descricao, setDescricao] = useState('');
  const [valorTotalTexto, setValorTotalTexto] = useState('');
  const [parcelasTexto, setParcelasTexto] = useState('1');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    const valorTotal = Number(valorTotalTexto.replace(',', '.'));
    // parcelas vem de TextInput com teclado numérico, mas ainda assim é texto
    // até aqui — Number.isInteger confere que não veio algo tipo "3.5x".
    const parcelas = Number(parcelasTexto);

    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (!valorTotalTexto || Number.isNaN(valorTotal) || valorTotal <= 0) {
      setErro('Informe um valor total válido, maior que zero.');
      return;
    }
    if (!Number.isInteger(parcelas) || parcelas <= 0) {
      setErro('Número de parcelas precisa ser um número inteiro maior que zero.');
      return;
    }
    if (!categoriaId) {
      setErro('Escolha uma categoria.');
      return;
    }

    setErro(null);
    try {
      await adicionar({
        descricao: descricao.trim(),
        valorTotal,
        parcelas,
        dataInicio,
        categoriaId,
      });
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(`Não consegui salvar: ${String(erroAoSalvar)}`);
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

      <Pressable style={styles.botaoSalvar} onPress={salvar}>
        <Text style={styles.botaoSalvarTexto}>Salvar</Text>
      </Pressable>
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
});
