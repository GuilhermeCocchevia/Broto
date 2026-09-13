import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
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
  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionar = useTransacoesStore((state) => state.adicionar);

  const [descricao, setDescricao] = useState('');
  const [valorTexto, setValorTexto] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [frequencia, setFrequencia] = useState<Frequencia>('unica');
  const [categoriaId, setCategoriaId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function salvar() {
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
    adicionar({
      descricao: descricao.trim(),
      valor,
      data,
      tipo,
      categoriaId,
      frequencia,
      dataFim: null,
    });
    navigation.goBack();
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
        <Text style={styles.botaoSalvarTexto}>Salvar</Text>
      </Pressable>
    </ScrollView>
  );
}

// Um "chip" clicável que troca de cor quando selecionado — reaproveitado pra
// tipo, frequência e categoria, em vez de repetir o mesmo JSX três vezes.
function OpcaoBotao({
  label,
  selecionado,
  onPress,
}: {
  label: string;
  selecionado: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.chip, selecionado && styles.chipSelecionado]}
      onPress={onPress}
    >
      <Text style={[styles.chipTexto, selecionado && styles.chipTextoSelecionado]}>{label}</Text>
    </Pressable>
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
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    backgroundColor: colors.surface,
  },
  chipSelecionado: {
    backgroundColor: colors.primary,
  },
  chipTexto: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  chipTextoSelecionado: {
    color: colors.surface,
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
