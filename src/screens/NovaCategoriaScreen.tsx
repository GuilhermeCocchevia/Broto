import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { OpcaoBotao } from '../components/OpcaoBotao';
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
  const adicionar = useCategoriasStore((state) => state.adicionar);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoTransacao>('despesa');
  const [cor, setCor] = useState(CORES_DISPONIVEIS[0]);
  const [erro, setErro] = useState<string | null>(null);

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
    try {
      await adicionar({ nome: nome.trim(), tipo, cor });
      navigation.goBack();
    } catch (erroAoSalvar) {
      setErro(`Não consegui salvar: ${String(erroAoSalvar)}`);
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
});
