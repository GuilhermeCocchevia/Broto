import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { CampoCategoria } from '../components/CampoCategoria';
import { parsearValorMonetario } from '../utils/parsearValorMonetario';
import { validarData } from '../utils/validarData';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import { escolherCorAutomatica, encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import { calcularValorDaParcela, calcularJurosTotal } from '../logic/projecao';
import { formatarReal } from '../utils/formatarReal';
import type { RootStackParamList } from '../navigation/RootNavigator';

// Uma simulação é sempre uma compra hipotética — não existe "simulação de
// receita" no app hoje, então a categoria dela é sempre do tipo despesa.
const TIPO_SIMULACAO = 'despesa' as const;

// Formulário de "e se eu comprar isso?" — cria uma Simulacao (compra
// hipotética, possivelmente parcelada) que entra na projeção do Simulador
// sem nunca virar uma Transacao de verdade.
export default function NovaSimulacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NovaSimulacao'>>();
  const idEditando = route.params?.id;

  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionarCategoria = useCategoriasStore((state) => state.adicionar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const adicionar = useSimulacoesStore((state) => state.adicionar);
  const atualizar = useSimulacoesStore((state) => state.atualizar);
  const remover = useSimulacoesStore((state) => state.remover);

  const [descricao, setDescricao] = useState('');
  const [valorTotalTexto, setValorTotalTexto] = useState('');
  const [parcelasTexto, setParcelasTexto] = useState('1');
  // Digitado como PORCENTAGEM (ex: "2,5" = 2,5% ao mês) — mais natural de
  // digitar do que a fração (0,025) que é como fica guardado de verdade.
  // Vazio = sem juros, mesmo comportamento de quando esse campo não existia.
  const [taxaJurosTexto, setTaxaJurosTexto] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [categoriaTexto, setCategoriaTexto] = useState('');
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
      // Volta de fração pra porcentagem (0,025 -> "2.5"), o inverso do que
      // salvar() faz. "0" vira campo vazio — mais limpo que mostrar "0" pra
      // uma simulação sem juros.
      setTaxaJurosTexto(simulacao.taxaJurosMensal > 0 ? String(simulacao.taxaJurosMensal * 100) : '');
      setDataInicio(simulacao.dataInicio);
      const categoriaAtual = categorias.find((c) => c.id === simulacao.categoriaId);
      setCategoriaTexto(categoriaAtual?.nome ?? '');
    }
  }, [idEditando, simulacoes, categorias]);

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
    // Vazio é válido (= sem juros) — só valida o formato se o usuário
    // digitou alguma coisa. `parsearValorMonetario` serve bem aqui também:
    // é só "texto brasileiro de número" -> number, não é específico de R$.
    const taxaJurosPorcentagem = taxaJurosTexto.trim() ? parsearValorMonetario(taxaJurosTexto) : 0;
    if (taxaJurosPorcentagem === null || taxaJurosPorcentagem < 0) {
      setErro('Taxa de juros inválida. Use um número maior ou igual a 0, ou deixe em branco.');
      return;
    }
    if (!validarData(dataInicio)) {
      setErro('Data inválida. Use o formato AAAA-MM-DD, ex: 2026-09-14.');
      return;
    }
    if (!categoriaTexto.trim()) {
      setErro('Escolha ou digite uma categoria.');
      return;
    }

    setErro(null);
    setSalvando(true);
    try {
      const categoriaExistente = encontrarCategoriaPorNome(categorias, categoriaTexto, TIPO_SIMULACAO);
      const categoriaId = categoriaExistente
        ? categoriaExistente.id
        : await adicionarCategoria({
            nome: categoriaTexto.trim(),
            tipo: TIPO_SIMULACAO,
            cor: escolherCorAutomatica(categorias.length),
          });

      const dados = {
        descricao: descricao.trim(),
        valorTotal,
        parcelas,
        dataInicio,
        categoriaId,
        // Porcentagem -> fração (2.5 -> 0.025), o formato que o resto do
        // app (calcularValorDaParcela, calcularSaldoProjetado) espera.
        taxaJurosMensal: taxaJurosPorcentagem / 100,
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

  // Prévia ao vivo: recalcula a cada letra digitada, pra mostrar o custo
  // real do parcelamento ANTES do usuário confirmar — é o dado mais
  // importante pra decidir se vale a pena parcelar com juros ou não.
  // `|| 0` em cada leitura evita mostrar "NaN" enquanto o campo ainda não é
  // um número válido (ex: campo vazio ou só "-"), sem precisar duplicar a
  // validação de salvar() aqui.
  const preview = useMemo(() => {
    const valorTotal = parsearValorMonetario(valorTotalTexto) ?? 0;
    const parcelas = Number(parcelasTexto) || 0;
    const taxaJurosPorcentagem = taxaJurosTexto.trim() ? (parsearValorMonetario(taxaJurosTexto) ?? 0) : 0;
    if (valorTotal <= 0 || parcelas <= 0) return null;

    const taxaJurosMensal = taxaJurosPorcentagem / 100;
    const valorDaParcela = calcularValorDaParcela(valorTotal, parcelas, taxaJurosMensal);
    const jurosTotal = calcularJurosTotal(valorTotal, parcelas, taxaJurosMensal);
    return { valorDaParcela, jurosTotal };
  }, [valorTotalTexto, parcelasTexto, taxaJurosTexto]);

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

      <Text style={styles.rotulo}>Taxa de juros ao mês, em % (opcional)</Text>
      <TextInput
        style={styles.input}
        value={taxaJurosTexto}
        onChangeText={setTaxaJurosTexto}
        placeholder="Deixe em branco pra parcelamento sem juros"
        keyboardType="decimal-pad"
      />

      {preview && (
        <View style={styles.preview}>
          <Text style={styles.previewLinha}>
            {parcelasTexto}x de {formatarReal(preview.valorDaParcela)}
          </Text>
          {preview.jurosTotal > 0 && (
            <Text style={styles.previewJuros}>
              + {formatarReal(preview.jurosTotal)} de juros no total
            </Text>
          )}
        </View>
      )}

      <Text style={styles.rotulo}>Data da 1ª parcela</Text>
      <TextInput
        style={styles.input}
        value={dataInicio}
        onChangeText={setDataInicio}
        placeholder="AAAA-MM-DD"
      />

      <Text style={styles.rotulo}>Categoria</Text>
      <CampoCategoria
        tipo={TIPO_SIMULACAO}
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
  preview: {
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.surface,
    gap: 2,
  },
  previewLinha: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  previewJuros: {
    fontSize: 12,
    color: colors.danger,
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
