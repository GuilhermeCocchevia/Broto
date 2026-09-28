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
  calcularDataFimPorQuantidadeDeAnos,
  calcularDataFimPorQuantidadeDeMeses,
  calcularQuantidadeDeAnosPorDataFim,
  calcularQuantidadeDeMesesPorDataFim,
} from '../logic/projecao';
import { nomearParcela, redimensionarParcelas, type RascunhoDeParcela } from '../logic/parcelasAnuais';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import { escolherCorAutomatica, encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TipoTransacao, Frequencia } from '../types/models';
import { categoriaCostumaSerAnual } from '../utils/categoriaCostumaSerAnual';
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
  // Mesma ideia do campo acima, só que em ANOS — usado só quando
  // frequencia === 'anual' (ver o campo mais abaixo no JSX). Campo
  // separado (não reaproveita quantidadeMesesTexto) porque as unidades são
  // diferentes: trocar de mensal pra anual não devia converter "12 meses"
  // em "12 anos" sozinho, então cada frequência guarda o próprio rascunho.
  const [quantidadeAnosTexto, setQuantidadeAnosTexto] = useState('');
  // Atalho pra criar uma conta anual já dividida em parcelas (ex: 13º
  // salário em 2x, IPTU em 10x) — só existe na hora de CRIAR (nunca ao
  // editar, ver `!idEditando` no JSX): cada parcela vira sua própria
  // transação 'anual' independente ao salvar (ver salvar() e
  // logic/parcelasAnuais.ts), não um novo conceito no banco.
  const [dividirEmParcelas, setDividirEmParcelas] = useState(false);
  const [quantidadeParcelasTexto, setQuantidadeParcelasTexto] = useState('2');
  const [parcelas, setParcelas] = useState<RascunhoDeParcela[]>([
    { data: hojeLocal(), valor: 0 },
    { data: hojeLocal(), valor: 0 },
  ]);
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

  // Trocar de frequência enquanto "Em parcelas" está ativo deixaria o
  // formulário num estado sem sentido (parcelas só existem pra anual) — sai
  // de "Anual" e o atalho desliga sozinho, sem exigir que a pessoa lembre
  // de desligar na mão.
  function escolherFrequencia(nova: Frequencia) {
    setFrequencia(nova);
    if (nova !== 'anual') setDividirEmParcelas(false);
  }

  function mudarQuantidadeDeParcelas(texto: string) {
    setQuantidadeParcelasTexto(texto);
    const quantidade = Number(texto);
    // Só redimensiona com um número válido — enquanto a pessoa apaga o
    // campo pra digitar de novo (fica vazio por um instante), a lista de
    // parcelas continua como estava em vez de sumir.
    if (!Number.isInteger(quantidade) || quantidade < 2) return;
    setParcelas((atual) => redimensionarParcelas(atual, quantidade));
  }

  function atualizarParcela(indice: number, mudanca: Partial<RascunhoDeParcela>) {
    setParcelas((atual) => atual.map((parcela, i) => (i === indice ? { ...parcela, ...mudanca } : parcela)));
  }

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
        transacao.dataFim && transacao.frequencia === 'mensal'
          ? String(calcularQuantidadeDeMesesPorDataFim(transacao.data, transacao.dataFim))
          : '',
      );
      setQuantidadeAnosTexto(
        transacao.dataFim && transacao.frequencia === 'anual'
          ? String(calcularQuantidadeDeAnosPorDataFim(transacao.data, transacao.dataFim))
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
    // Dividindo em parcelas, o campo "Valor" único nem aparece (cada
    // parcela tem o próprio) — valida a lista de parcelas em vez dele.
    const dividindo = frequencia === 'anual' && dividirEmParcelas && !idEditando;
    if (!dividindo && valor <= 0) {
      setErro('Informe um valor válido, maior que zero.');
      return;
    }
    if (dividindo && parcelas.some((parcela) => parcela.valor <= 0)) {
      setErro('Informe um valor válido, maior que zero, em cada parcela.');
      return;
    }
    // Quantidade de meses/anos só faz sentido na frequência correspondente,
    // e é opcional mesmo assim (vazio = repete pra sempre) — por isso só
    // valida se o usuário de fato preencheu alguma coisa.
    const quantidadeMeses = Number(quantidadeMesesTexto);
    if (
      frequencia === 'mensal' &&
      quantidadeMesesTexto.trim() &&
      (!Number.isInteger(quantidadeMeses) || quantidadeMeses <= 0)
    ) {
      setErro('A quantidade de meses precisa ser um número inteiro maior que zero, ou deixe em branco.');
      return;
    }
    const quantidadeAnos = Number(quantidadeAnosTexto);
    if (
      frequencia === 'anual' &&
      quantidadeAnosTexto.trim() &&
      (!Number.isInteger(quantidadeAnos) || quantidadeAnos <= 0)
    ) {
      setErro('A quantidade de anos precisa ser um número inteiro maior que zero, ou deixe em branco.');
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

      if (dividindo) {
        // Cada parcela é uma INSERT própria — mesma chamada que qualquer
        // transação nova usaria, só repetida. Sequencial (não Promise.all)
        // pra não disparar várias escritas concorrentes no SQLite de uma
        // vez; com no máximo umas poucas parcelas, o custo é irrelevante.
        const total = parcelas.length;
        for (let indice = 0; indice < total; indice++) {
          const parcela = parcelas[indice];
          await adicionar({
            descricao: nomearParcela(descricao.trim(), indice, total),
            valor: parcela.valor,
            data: parcela.data,
            tipo,
            categoriaId,
            frequencia: 'anual',
            dataFim: quantidadeAnosTexto.trim()
              ? calcularDataFimPorQuantidadeDeAnos(parcela.data, quantidadeAnos)
              : null,
          });
        }
      } else {
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
              : frequencia === 'anual' && quantidadeAnosTexto.trim()
                ? calcularDataFimPorQuantidadeDeAnos(data, quantidadeAnos)
                : null,
        };
        if (idEditando) {
          await atualizar(idEditando, dados);
        } else {
          await adicionar(dados);
        }
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
        <CampoTexto
          accessibilityLabel="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          placeholder="Ex: Salário de agosto"
        />

        {/* Escondidos dividindo em parcelas: cada parcela tem a própria data
            e o próprio valor, mais abaixo (ver o bloco de "Anual"). */}
        {!(frequencia === 'anual' && dividirEmParcelas && !idEditando) && (
          <>
            <Text style={styles.rotulo}>Valor (R$)</Text>
            <CampoMoeda valor={valor} onChangeValor={setValor} acessibilidadeLabel="Valor em reais" />

            <Text style={styles.rotulo}>Data</Text>
            <CampoData valor={data} onChangeValor={setData} atalhosRapidos acessibilidadeLabel="Data" />
          </>
        )}

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
            onPress={() => escolherFrequencia('unica')}
          />
          <OpcaoBotao
            label="Mensal (repete)"
            selecionado={frequencia === 'mensal'}
            onPress={() => escolherFrequencia('mensal')}
          />
          <OpcaoBotao
            label="Anual (1x por ano)"
            selecionado={frequencia === 'anual'}
            onPress={() => escolherFrequencia('anual')}
          />
        </View>

        {frequencia === 'anual' && (
          <>
            <Text style={styles.dica}>
              Repete todo ano, no mesmo mês e dia da data escolhida — como IPVA, IPTU, seguro ou 13º salário.
            </Text>

            {/* Só na CRIAÇÃO: uma vez salva, cada parcela já é uma transação
                comum, sem nada de especial pra reabrir aqui ao editar. */}
            {!idEditando && (
              <>
                <Text style={styles.rotulo}>Como lançar</Text>
                <View style={styles.opcoes}>
                  <OpcaoBotao
                    label="De uma vez"
                    selecionado={!dividirEmParcelas}
                    onPress={() => setDividirEmParcelas(false)}
                  />
                  <OpcaoBotao
                    label="Em parcelas"
                    selecionado={dividirEmParcelas}
                    onPress={() => setDividirEmParcelas(true)}
                  />
                </View>
              </>
            )}

            {dividirEmParcelas && !idEditando && (
              <>
                <Text style={styles.dica}>
                  Cada parcela vira uma transação anual própria (ex: &quot;13º salário (1/2)&quot;), com sua própria data e
                  seu próprio valor — editar ou excluir uma depois não mexe nas outras.
                </Text>
                <Text style={styles.rotulo}>Quantas parcelas?</Text>
                <CampoTexto
                  accessibilityLabel="Quantas parcelas"
                  value={quantidadeParcelasTexto}
                  onChangeText={mudarQuantidadeDeParcelas}
                  placeholder="Ex: 2"
                  keyboardType="number-pad"
                />

                {parcelas.map((parcela, indice) => (
                  <View key={indice} style={styles.parcela}>
                    <Text style={styles.parcelaTitulo}>
                      {nomearParcela('Parcela', indice, parcelas.length)}
                    </Text>
                    <Text style={styles.rotulo}>Data</Text>
                    <CampoData
                      valor={parcela.data}
                      onChangeValor={(novaData) => atualizarParcela(indice, { data: novaData })}
                      acessibilidadeLabel={`Data da parcela ${indice + 1}`}
                    />
                    <Text style={styles.rotulo}>Valor (R$)</Text>
                    <CampoMoeda
                      valor={parcela.valor}
                      onChangeValor={(novoValor) => atualizarParcela(indice, { valor: novoValor })}
                      acessibilidadeLabel={`Valor da parcela ${indice + 1}`}
                    />
                  </View>
                ))}
              </>
            )}

            <Text style={styles.rotulo}>Repete por quantos anos? (opcional)</Text>
            <CampoTexto
              accessibilityLabel="Repete por quantos anos, opcional"
              value={quantidadeAnosTexto}
              onChangeText={setQuantidadeAnosTexto}
              placeholder="Ex: 5 — deixe em branco pra repetir sempre"
              keyboardType="number-pad"
            />
          </>
        )}

        {frequencia === 'mensal' && (
          <>
            <Text style={styles.rotulo}>Repete por quantos meses? (opcional)</Text>
            <CampoTexto
              accessibilityLabel="Repete por quantos meses, opcional"
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

        {frequencia === 'unica' && categoriaCostumaSerAnual(categoriaTexto) && (
          <Pressable accessibilityRole="button" onPress={() => escolherFrequencia('anual')}>
            <Text style={styles.dica}>
              Essa categoria costuma se repetir todo ano.{' '}
              <Text style={styles.dicaAcao}>Marcar como anual</Text>
            </Text>
          </Pressable>
        )}

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.botaoSalvar}>
          <BotaoPrimario
            label={
              salvando
                ? 'Salvando...'
                : idEditando
                  ? 'Salvar alterações'
                  : frequencia === 'anual' && dividirEmParcelas
                    ? `Salvar as ${parcelas.length} parcelas`
                    : 'Salvar'
            }
            onPress={salvar}
            desabilitado={salvando}
          />
        </View>

        {idEditando && (
          <Pressable accessibilityRole="button" style={styles.botaoExcluir} onPress={confirmarExclusao}>
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
  dica: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 8,
  },
  dicaAcao: {
    color: colors.primaryDark,
    fontWeight: '700',
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
  // Uma faixa por parcela, separada da anterior por uma linha fina — mesmo
  // tom usado como divisor em listas do resto do app (ex: linhas do
  // extrato), não uma caixa nova.
  parcela: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  parcelaTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
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
