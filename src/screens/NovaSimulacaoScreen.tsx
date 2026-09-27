import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useTaxasReferenciaStore } from '../store/useTaxasReferenciaStore';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';
import { CampoCategoria } from '../components/CampoCategoria';
import { CampoTexto } from '../components/CampoTexto';
import { CampoMoeda } from '../components/CampoMoeda';
import { CampoData } from '../components/CampoData';
import { OpcaoBotao } from '../components/OpcaoBotao';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { BrilhoCeu } from '../components/CenaGameficada';
import { AvisoAposentadoriaModal } from '../components/AvisoAposentadoriaModal';
import { AvisoPreenchimento } from '../components/AvisoPreenchimento';
import { parsearValorMonetario } from '../utils/parsearValorMonetario';
import { mensagemDeErro } from '../utils/mensagemDeErro';
import { escolherCorAutomatica, encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import {
  calcularValorDaParcela,
  calcularJurosTotal,
  calcularQuantidadeDeMesesPorDataFim,
  calcularDataFimPorQuantidadeDeMeses,
} from '../logic/projecao';
import { calcularValorFuturoLiquido, calcularAporteNecessario } from '../logic/custosRendaFixa';
import { converterTaxaAnualParaMensal } from '../logic/taxasReferencia';
import {
  guardarRascunho,
  obterRascunho,
  type RascunhosPorTipo,
} from '../logic/rascunhosDeSimulacao';
import { formatarReal } from '../utils/formatarReal';
import type { RootStackParamList } from '../navigation/RootNavigator';
import type { TipoSimulacao } from '../types/models';
import { hojeLocal } from '../utils/dataLocal';

// A CATEGORIA da simulação é sempre do tipo despesa, não importa o `tipo`
// da simulação em si (compra ou economia) — as duas são "compromisso de
// dinheiro futuro" (uma compra parcelada ou uma meta de guardar dinheiro),
// nunca uma receita.
const TIPO_SIMULACAO = 'despesa' as const;

// Formulário de "e se eu comprar isso?" (tipo 'compra', pergunta pelo
// VALOR TOTAL da compra), "quanto eu quero guardar por mês?" (tipo
// 'economia', pergunta pelo valor MENSAL direto — não "quanto no total",
// justamente pra virar um hábito recorrente de verdade, comparável mês a
// mês com o que a pessoa realmente consegue guardar, ver
// logic/orcamentoMensal.ts), ou "quanto eu preciso guardar por mês pra
// CHEGAR num valor?" (tipos 'rendimento'/'aposentadoria') — cria uma
// Simulacao que entra na projeção do Simulador sem nunca virar uma
// Transacao de verdade.
//
// 'rendimento'/'aposentadoria' podem fazer a pergunta nos DOIS sentidos
// (ver `direcaoInvestimento`, controlado pelo seletor "Quanto preciso
// guardar" / "Quanto vou ter" na tela): 'meta' é AO CONTRÁRIO de
// 'economia' — a pessoa diz quanto quer TER no final (não quanto vai
// guardar por mês) e o app resolve o aporte mensal necessário, JÁ
// considerando os juros compostos (ver calcularAporteNecessario em
// custosRendaFixa.ts); 'aporte' é a pergunta DIRETA — a pessoa diz quanto
// PODE guardar por mês e o app projeta quanto isso vira lá na frente (ver
// calcularValorFuturoLiquido). As duas também aceitam um `aporteInicial`
// opcional (dinheiro que a pessoa já tem guardado em outro lugar), que
// entra na mesma conta de juros compostos. O que fica salvo em
// `valorTotal`/`parcelas` continua sendo EXATAMENTE o mesmo padrão de
// sempre (total aportado só via os aportes MENSAIS / meses de aporte —
// `aporteInicial` é uma coluna à parte, ver models.ts) — só a TELA pergunta
// de um jeito diferente e faz a conta (reversa ou direta) antes de salvar;
// o resto do app (lista, detalhe, projeção de saldo) nem percebe a
// diferença, além de também descontar o aporte inicial do saldo projetado
// no primeiro mês (ver calcularSaidaEfetivaNoMes em projecao.ts).
//
// Juros só tem "custo" de verdade em 'compra'; em
// 'rendimento'/'aposentadoria' o mesmo campo vira a taxa de RENDIMENTO
// esperada (ver calcularParcelaEfetiva em projecao.ts, que garante que
// essa taxa nunca infla o valor que sai do saldo). Essas duas também podem
// puxar taxas PÚBLICAS de referência (Selic/CDI/Tesouro RendA+, ver
// useTaxasReferenciaStore) — sempre só como ponto de partida, nunca uma
// recomendação.
export default function NovaSimulacaoScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NovaSimulacao'>>();
  const idEditando = route.params?.id;
  const tipoSugerido = route.params?.tipoSugerido;
  const valorMensalSugerido = route.params?.valorMensalSugerido;
  const aporteInicialSugerido = route.params?.aporteInicialSugerido ?? 0;
  // Aberta pelo botão do aviso de sobra do Simulador ("Simular quanto isso
  // renderia guardado"): o formulário já vem preenchido como uma reserva de
  // emergência com a sobra do mês — tudo editável, é só um ponto de partida.
  const ehSugestaoDeSobra =
    !idEditando && tipoSugerido === 'rendimento' && valorMensalSugerido !== undefined && valorMensalSugerido > 0;

  const categorias = useCategoriasStore((state) => state.categorias);
  const adicionarCategoria = useCategoriasStore((state) => state.adicionar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const adicionar = useSimulacoesStore((state) => state.adicionar);
  const atualizar = useSimulacoesStore((state) => state.atualizar);
  const remover = useSimulacoesStore((state) => state.remover);

  const taxasReferencia = useTaxasReferenciaStore();
  const carregarConfiguracoes = useConfiguracoesStore((state) => state.carregar);

  // Pré-preenchimento da sugestão vinda do aviso de sobra (ver
  // SimuladorScreen.tsx) — só um ponto de partida razoável, o usuário pode
  // mudar tudo livremente antes de salvar. 12 meses de prazo; a categoria é
  // uma das sugestões padrão de despesa (ver data/sugestoesCategorias.ts),
  // então reaproveita a categoria se ela já existir ou cria na hora.
  const MESES_PADRAO_SUGESTAO = 12;
  const DESCRICAO_SUGESTAO = 'Reserva de emergência';
  const CATEGORIA_SUGESTAO = 'Aporte em investimentos';

  const [tipo, setTipo] = useState<TipoSimulacao>(tipoSugerido ?? 'compra');
  // Os avisos de risco viraram um modal (ver AvisoAposentadoriaModal.tsx) —
  // abre sozinho a primeira vez que esse tipo é escolhido nesta sessão
  // (não a cada letra digitada no formulário), a menos que a pessoa já
  // tenha marcado "não mostrar novamente" antes (persistido, ver
  // useConfiguracoesStore). Continua reabrível a qualquer momento pelo
  // link "Ver avisos" perto do seletor de tipo.
  const [avisoAposentadoriaVisivel, setAvisoAposentadoriaVisivel] = useState(false);
  const [descricao, setDescricao] = useState(ehSugestaoDeSobra ? DESCRICAO_SUGESTAO : '');
  // Na sugestão de sobra o campo é o aporte MENSAL exato (a sobra, com
  // centavos) — não um alvo total. Antes o formulário abria em modo "quanto
  // você quer ter" com a sobra × 12, o que parecia um valor sem nexo (sobra
  // de R$376 virava R$4.500 no campo).
  const [valor, setValor] = useState(
    ehSugestaoDeSobra ? Math.round(valorMensalSugerido * 100) / 100 : 0,
  );
  const [parcelasTexto, setParcelasTexto] = useState(ehSugestaoDeSobra ? String(MESES_PADRAO_SUGESTAO) : '1');
  // Só usado por 'aposentadoria' — substitui "em quantos meses" por uma
  // data-alvo de verdade (ver comentário no topo do arquivo: décadas em
  // meses é impraticável de digitar). `parcelas` é sempre DERIVADO daqui +
  // `dataInicio`, nunca digitado diretamente pra esse tipo. Começa em hoje
  // (mesmo padrão de `dataInicio` logo abaixo) só porque o seletor nativo
  // sempre precisa de uma data válida pra abrir — a pessoa troca pelo
  // vencimento real que quiser antes de salvar.
  const [dataAlvoTexto, setDataAlvoTexto] = useState(hojeLocal());
  // Digitado como PORCENTAGEM (ex: "2,5" = 2,5% ao mês) — mais natural de
  // digitar do que a fração (0,025) que é como fica guardado de verdade.
  // Vazio = sem juros, mesmo comportamento de quando esse campo não existia.
  const [taxaJurosTexto, setTaxaJurosTexto] = useState('');
  // Só usado por 'rendimento'/'aposentadoria' — as duas perguntas que essa
  // dupla de campos existe pra responder (ver comentário logo abaixo, em
  // `direcaoInvestimento`). 'meta' é o padrão porque é o comportamento que
  // já existia antes dessa escolha existir (preserva o que quem já usava a
  // tela está acostumado a ver).
  const [direcaoInvestimento, setDirecaoInvestimento] = useState<'meta' | 'aporte'>(
    ehSugestaoDeSobra ? 'aporte' : 'meta',
  );
  // Dinheiro que a pessoa já tem guardado (em outro lugar) e quer incluir
  // na simulação — opcional, sempre some 0 se deixado em branco (ver
  // comentário no tipo Simulacao, em models.ts).
  const [aporteInicial, setAporteInicial] = useState(ehSugestaoDeSobra ? aporteInicialSugerido : 0);
  const [dataInicio, setDataInicio] = useState(hojeLocal());
  const [categoriaTexto, setCategoriaTexto] = useState(ehSugestaoDeSobra ? CATEGORIA_SUGESTAO : '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  // 'rendimento'/'aposentadoria' também perguntam a taxa (junto de
  // 'compra', com significado diferente em cada um, ver comentário no topo
  // do arquivo). Taxa é opcional em 'rendimento' (cai pra divisão simples,
  // sem juros, se deixado em branco) mas OBRIGATÓRIA em 'aposentadoria' —
  // não faz sentido planejar aposentadoria sem considerar rendimento
  // nenhum.
  const ehEconomiaSimples = tipo === 'economia';
  // A pergunta pode ir nos dois sentidos pra esses dois tipos (ver
  // `direcaoInvestimento` e o comentário no topo do arquivo) — esse boolean
  // só marca QUE tipo é (rendimento/aposentadoria), não QUAL direção.
  const ehMetaDeInvestimento = tipo === 'rendimento' || tipo === 'aposentadoria';
  const ehAposentadoria = tipo === 'aposentadoria';
  // "Quanto você quer ter?" (resolve o aporte necessário) vs "Quanto você
  // vai guardar por mês?" (resolve quanto isso vira lá na frente).
  const perguntaPelaMeta = ehMetaDeInvestimento && direcaoInvestimento === 'meta';
  const perguntaPeloAporte = ehMetaDeInvestimento && direcaoInvestimento === 'aporte';
  const ehModalidadeDeGuardarDinheiro = ehEconomiaSimples || ehMetaDeInvestimento;
  const mostrarCampoDeTaxa = tipo === 'compra' || ehMetaDeInvestimento;
  const taxaObrigatoria = ehAposentadoria;
  const mostrarTaxasReferencia = ehMetaDeInvestimento;

  // Cada tipo (compra, economia, rendimento, aposentadoria) tem o SEU
  // rascunho dos campos — ver rascunhosDeSimulacao.ts. Trocar de tipo salva
  // o que está na tela pro tipo atual e carrega o rascunho do novo (em
  // branco se nunca foi preenchido), então o que foi digitado (ou
  // autopreenchido) num tipo não vaza pros outros; voltar recupera o que
  // estava lá. Fica em `useRef` (não `useState`): guardar um rascunho não
  // precisa redesenhar a tela.
  const rascunhos = useRef<RascunhosPorTipo>({});

  function trocarTipo(novoTipo: TipoSimulacao) {
    if (novoTipo === tipo) return;
    const hoje = hojeLocal();
    rascunhos.current = guardarRascunho(rascunhos.current, tipo, {
      descricao,
      valor,
      parcelasTexto,
      dataAlvoTexto,
      taxaJurosTexto,
      direcaoInvestimento,
      aporteInicial,
      categoriaTexto,
    });
    const novo = obterRascunho(rascunhos.current, novoTipo, hoje);
    setDescricao(novo.descricao);
    setValor(novo.valor);
    setParcelasTexto(novo.parcelasTexto);
    setDataAlvoTexto(novo.dataAlvoTexto);
    setTaxaJurosTexto(novo.taxaJurosTexto);
    setDirecaoInvestimento(novo.direcaoInvestimento);
    setAporteInicial(novo.aporteInicial);
    setCategoriaTexto(novo.categoriaTexto);
    setErro(null);
    setTipo(novoTipo);
  }

  // Aplica uma taxa ANUAL de referência (vinda do Banco Central ou do
  // Tesouro Direto) ao campo de taxa — que é sempre AO MÊS (ver rótulo) —
  // convertendo antes. Só preenche o campo, o usuário ainda pode editar
  // livremente depois; nunca é uma escolha automática/silenciosa.
  function preencherTaxaAnual(taxaAnualPorcentagem: number) {
    const taxaMensalFracao = converterTaxaAnualParaMensal(taxaAnualPorcentagem);
    setTaxaJurosTexto(String(Number((taxaMensalFracao * 100).toFixed(4))));
  }

  // Versão do toque numa referência (com haptic); o preenchimento
  // automático da sugestão usa `preencherTaxaAnual` direto, sem vibrar.
  function aplicarTaxaAnual(taxaAnualPorcentagem: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    preencherTaxaAnual(taxaAnualPorcentagem);
  }

  // Além da taxa, um vencimento real do Tesouro RendA+ também preenche
  // "até quando" direto — o usuário continua livre pra mudar essa data
  // depois.
  function aplicarVencimento(vencimento: string, taxaAnualPorcentagem: number) {
    aplicarTaxaAnual(taxaAnualPorcentagem);
    setDataAlvoTexto(vencimento);
  }

  // Lê o estado da store DIRETO (`getState()`, não o valor via `useX(...)`
  // do topo do componente) de propósito: essa função também é chamada
  // dentro de um `.then()` de carregamento assíncrono (ver useEffect
  // abaixo), onde um valor capturado por closure no início do render
  // poderia estar desatualizado (a config ainda não tinha carregado do
  // banco quando o componente montou) — `getState()` sempre devolve o
  // valor mais recente de verdade, sem essa corrida.
  function mostrarAvisoAposentadoriaSeNecessario() {
    if (!useConfiguracoesStore.getState().naoMostrarAvisoAposentadoria) {
      setAvisoAposentadoriaVisivel(true);
    }
  }

  useEffect(() => {
    navigation.setOptions({ title: idEditando ? 'Editar simulação' : 'Nova simulação' });
  }, [navigation, idEditando]);

  useEffect(() => {
    taxasReferencia.carregar().then(() => {
      // Sugestão de sobra sem nenhuma taxa guardada ainda (app que nunca
      // buscou as referências): busca uma vez pra poder preencher a Selic.
      // Se falhar (sem internet), o erro aparece no bloco de taxas e o
      // campo fica vazio pra a pessoa preencher — nada trava.
      if (ehSugestaoDeSobra && useTaxasReferenciaStore.getState().selicMetaAnual === null) {
        taxasReferencia.atualizar();
      }
    });
    carregarConfiguracoes().then(() => {
      // Só relevante se a tela já abriu direto em 'aposentadoria' (vinda
      // de uma rota, ex: futuro atalho) — quando o usuário troca de tipo
      // TOCANDO no botão (ver onPress abaixo), a config já carregou há
      // tempo, não precisa desse `.then()`.
      if (tipoSugerido === 'aposentadoria') {
        mostrarAvisoAposentadoriaSeNecessario();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sugestão de sobra: assim que a Selic estiver disponível (do cache ou da
  // busca acima), preenche a taxa — uma vez só, e só se o campo ainda
  // estiver vazio (nunca sobrescreve o que a pessoa já digitou/escolheu).
  const [selicAplicada, setSelicAplicada] = useState(false);
  useEffect(() => {
    // Só enquanto o tipo da sugestão (rendimento) está na tela: preencher a
    // taxa com outro tipo aberto a vazaria pra ele. Se a Selic chegar
    // depois de a pessoa ter trocado de tipo, aplica quando ela voltar.
    if (!ehSugestaoDeSobra || selicAplicada || tipo !== 'rendimento') return;
    if (taxasReferencia.selicMetaAnual === null) return;
    if (!taxaJurosTexto.trim()) {
      preencherTaxaAnual(taxasReferencia.selicMetaAnual);
    }
    setSelicAplicada(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxasReferencia.selicMetaAnual, tipo]);

  useEffect(() => {
    if (!idEditando) return;
    const simulacao = simulacoes.find((s) => s.id === idEditando);
    if (simulacao) {
      setTipo(simulacao.tipo);
      setDescricao(simulacao.descricao);
      setParcelasTexto(String(simulacao.parcelas));
      // Volta de fração pra porcentagem (0,025 -> "2.5"), o inverso do que
      // salvar() faz. "0" vira campo vazio — mais limpo que mostrar "0" pra
      // uma simulação sem juros.
      setTaxaJurosTexto(simulacao.taxaJurosMensal > 0 ? String(simulacao.taxaJurosMensal * 100) : '');
      setDataInicio(simulacao.dataInicio);
      setAporteInicial(simulacao.aporteInicial);
      const categoriaAtual = categorias.find((c) => c.id === simulacao.categoriaId);
      setCategoriaTexto(categoriaAtual?.nome ?? '');

      if (simulacao.tipo === 'rendimento' || simulacao.tipo === 'aposentadoria') {
        // Reabre sempre em modo 'meta' ("quanto você quer ter"), não
        // importa em qual direção a simulação foi originalmente criada —
        // `valorTotal`/`parcelas`/`aporteInicial` guardam só o aporte
        // mensal e o inicial, nunca a direção escolhida na tela (ver
        // comentário no topo do arquivo), então reconstrói o alvo rodando
        // a conta pra FRENTE de novo a partir do que foi salvo. Precisa
        // ser `calcularValorFuturoLiquido` (não `calcularValorFuturoComAportes`
        // direto): pra 'aposentadoria', o "bruto" já é calculado com a taxa
        // LÍQUIDA de custódia B3 embutida (ver a função) — usar a taxa
        // crua aqui reconstruiria um valor maior que o que a pessoa
        // realmente digitou.
        setDirecaoInvestimento('meta');
        const aporteMensal = simulacao.valorTotal / simulacao.parcelas;
        const { valorFuturoBruto } = calcularValorFuturoLiquido(
          aporteMensal,
          simulacao.taxaJurosMensal,
          simulacao.parcelas,
          simulacao.tipo === 'aposentadoria',
          simulacao.aporteInicial,
        );
        setValor(Number(valorFuturoBruto.toFixed(2)));
        if (simulacao.tipo === 'aposentadoria') {
          setDataAlvoTexto(calcularDataFimPorQuantidadeDeMeses(simulacao.dataInicio, simulacao.parcelas));
        }
      } else if (simulacao.tipo === 'economia') {
        // Campo pergunta o aporte MENSAL direto (ver comentário no topo do
        // arquivo) — `valorTotal`/`parcelas` guardam o total só pra manter
        // o mesmo padrão de sempre, então reconstrói dividindo de volta.
        setValor(simulacao.valorTotal / simulacao.parcelas);
      } else {
        setValor(simulacao.valorTotal);
      }
    }
  }, [idEditando, simulacoes, categorias]);

  // async: só volta pra tela anterior depois de confirmar que gravou de
  // verdade — ver o comentário equivalente em NovaCategoriaScreen.tsx.
  async function salvar() {
    // Em modo 'meta', esse número é "quanto você quer TER" (o alvo), não o
    // total que sai do bolso — vira o aporte mensal necessário mais abaixo
    // via calcularAporteNecessario. Em modo 'aporte', é o inverso: já É o
    // aporte mensal que a pessoa vai fazer, direto.
    const valorDigitado = valor;

    if (!descricao.trim()) {
      setErro('Preencha a descrição.');
      return;
    }
    if (valorDigitado <= 0) {
      setErro(
        perguntaPelaMeta
          ? 'Informe um valor-alvo válido, maior que zero.'
          : perguntaPeloAporte || ehEconomiaSimples
            ? 'Informe um valor de aporte mensal válido, maior que zero.'
            : 'Informe um valor total válido, maior que zero.',
      );
      return;
    }
    // 'aposentadoria' deriva os meses de aporte de uma data-alvo real (ver
    // comentário no topo do arquivo) — as outras continuam digitando o
    // número de meses/parcelas direto. `dataInicio`/`dataAlvoTexto` vêm de
    // um seletor nativo (CampoData) — sempre uma data de calendário
    // válida, não precisa validar formato aqui.
    let parcelas: number;
    if (ehAposentadoria) {
      parcelas = calcularQuantidadeDeMesesPorDataFim(dataInicio, dataAlvoTexto);
      if (parcelas <= 0) {
        setErro('A data-alvo precisa ser depois da data de início.');
        return;
      }
    } else {
      // parcelas vem de TextInput com teclado numérico, mas ainda assim é
      // texto até aqui — Number.isInteger confere que não veio algo tipo
      // "3.5x".
      parcelas = Number(parcelasTexto);
      if (!Number.isInteger(parcelas) || parcelas <= 0) {
        setErro(
          tipo === 'compra'
            ? 'Número de parcelas precisa ser um número inteiro maior que zero.'
            : 'O prazo precisa ser um número inteiro de meses, maior que zero.',
        );
        return;
      }
    }

    // Juros só existe pra 'compra' (custo do parcelamento) e
    // 'rendimento'/'aposentadoria' (taxa de rendimento esperada) —
    // 'economia' é sempre 0 (não faz sentido "juros" numa meta simples de
    // guardar dinheiro), então nem valida o campo (fica escondido na tela,
    // ver JSX). Vazio é válido pra compra sem juros — só valida o formato
    // se o usuário digitou alguma coisa. `parsearValorMonetario` serve bem
    // aqui também: é só "texto brasileiro de número" -> number, não é
    // específico de R$.
    let taxaJurosMensal = 0;
    if (taxaObrigatoria && !taxaJurosTexto.trim()) {
      setErro('Informe uma taxa de rendimento — não dá pra planejar aposentadoria sem considerar isso.');
      return;
    }
    if (mostrarCampoDeTaxa && taxaJurosTexto.trim()) {
      const taxaJurosPorcentagem = parsearValorMonetario(taxaJurosTexto);
      if (taxaJurosPorcentagem === null || taxaJurosPorcentagem < 0) {
        setErro(
          tipo === 'compra'
            ? 'Taxa de juros inválida. Use um número maior ou igual a 0, ou deixe em branco.'
            : 'Taxa de rendimento inválida. Use um número maior ou igual a 0, ou deixe em branco.',
        );
        return;
      }
      taxaJurosMensal = taxaJurosPorcentagem / 100;
    }
    if (!categoriaTexto.trim()) {
      setErro('Escolha ou digite uma categoria.');
      return;
    }

    // O que fica salvo em `valorTotal` continua sendo o TOTAL aportado só
    // via aportes MENSAIS (mesmo padrão de sempre, ver comentário no topo
    // do arquivo) — nunca o valor-alvo que a pessoa digitou, e sem contar o
    // `aporteInicial` (que é salvo à parte). Em modo 'meta', precisa da
    // conta reversa primeiro (quanto aportar por mês pra chegar no alvo, já
    // com juros e já descontando o que o aporte inicial sozinho renderia).
    // Em modo 'aporte' E em 'economia', `valorDigitado` já É o aporte
    // mensal — é só multiplicar pelos meses, mesma conta de sempre. Só
    // 'compra' continua com `valorDigitado` sendo o total direto (o
    // usuário sabe o preço da compra, não faz sentido perguntar "por mês").
    const valorTotal = perguntaPelaMeta
      ? calcularAporteNecessario(valorDigitado, taxaJurosMensal, parcelas, ehAposentadoria, aporteInicial) * parcelas
      : perguntaPeloAporte || ehEconomiaSimples
        ? valorDigitado * parcelas
        : valorDigitado;

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
        tipo,
        valorTotal,
        parcelas,
        dataInicio,
        categoriaId,
        taxaJurosMensal,
        // Sempre 0 fora de 'rendimento'/'aposentadoria' — o campo nem
        // aparece na tela pros outros tipos (ver `ehMetaDeInvestimento`).
        aporteInicial: ehMetaDeInvestimento ? aporteInicial : 0,
      };
      if (idEditando) {
        await atualizar(idEditando, dados);
      } else {
        await adicionar(dados);
      }
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
    Alert.alert('Excluir simulação', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
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

  // Prévia ao vivo: recalcula a cada letra digitada, pra mostrar o custo
  // real do parcelamento ANTES do usuário confirmar — é o dado mais
  // importante pra decidir se vale a pena parcelar com juros ou não.
  // `|| 0` em cada leitura evita mostrar "NaN" enquanto o campo ainda não é
  // um número válido (ex: campo vazio ou só "-"), sem precisar duplicar a
  // validação de salvar() aqui.
  const preview = useMemo(() => {
    // Em modo 'meta' isso é o ALVO ("quanto quer ter"); em modo 'aporte' já
    // É o aporte mensal direto — ver comentário no topo do arquivo.
    const valorDigitado = valor;
    if (valorDigitado <= 0) return null;

    let parcelas: number;
    if (ehAposentadoria) {
      parcelas = calcularQuantidadeDeMesesPorDataFim(dataInicio, dataAlvoTexto);
    } else {
      parcelas = Number(parcelasTexto) || 0;
    }
    if (parcelas <= 0) return null;

    // Juros só entra na conta pra 'compra'/'rendimento'/'aposentadoria' —
    // 'economia' é sempre sem juros (ver comentário em salvar()).
    const taxaJurosPorcentagem = mostrarCampoDeTaxa && taxaJurosTexto.trim() ? (parsearValorMonetario(taxaJurosTexto) ?? 0) : 0;
    const taxaJurosMensal = taxaJurosPorcentagem / 100;

    if (ehMetaDeInvestimento) {
      // Modo 'meta': resolve o aporte mensal NECESSÁRIO pra chegar no valor
      // desejado, já com os juros compostos e já descontando o que o
      // aporte inicial sozinho renderia. Modo 'aporte': o aporte mensal já
      // É o valor digitado, só projeta pra frente direto. Os dois usam
      // calcularValorFuturoLiquido pro resultado final — líquido de IR (os
      // dois tipos) e de custódia B3 (só 'aposentadoria').
      const aporteMensal = perguntaPeloAporte
        ? valorDigitado
        : calcularAporteNecessario(valorDigitado, taxaJurosMensal, parcelas, ehAposentadoria, aporteInicial);
      const resultado = calcularValorFuturoLiquido(
        aporteMensal,
        taxaJurosMensal,
        parcelas,
        ehAposentadoria,
        aporteInicial,
      );
      return {
        valorDaParcela: aporteMensal,
        parcelas,
        taxaJurosMensal,
        jurosTotal: 0,
        valorFuturoBruto: resultado.valorFuturoBruto,
        rendimentoBruto: resultado.ganhoBruto,
        valorFuturoLiquido: resultado.valorFuturoLiquido,
        aliquotaIR: resultado.aliquotaIR,
      };
    }

    if (ehEconomiaSimples) {
      // `valorDigitado` já É o aporte mensal direto (ver comentário no
      // topo do arquivo) — nada pra dividir, é só ecoar de volta. O total
      // ao final (valorDigitado * parcelas) aparece no texto do preview,
      // não aqui — é informação derivada, não o resultado principal.
      return {
        valorDaParcela: valorDigitado,
        parcelas,
        taxaJurosMensal: 0,
        jurosTotal: 0,
        valorFuturoBruto: null,
        rendimentoBruto: 0,
        valorFuturoLiquido: null,
        aliquotaIR: 0,
      };
    }

    const valorDaParcela = calcularValorDaParcela(valorDigitado, parcelas, taxaJurosMensal);
    const jurosTotal = calcularJurosTotal(valorDigitado, parcelas, taxaJurosMensal);
    return {
      valorDaParcela,
      parcelas,
      taxaJurosMensal,
      jurosTotal,
      valorFuturoBruto: null,
      rendimentoBruto: 0,
      valorFuturoLiquido: null,
      aliquotaIR: 0,
    };
  }, [
    valor,
    parcelasTexto,
    dataAlvoTexto,
    dataInicio,
    taxaJurosTexto,
    mostrarCampoDeTaxa,
    ehMetaDeInvestimento,
    ehAposentadoria,
    ehEconomiaSimples,
    perguntaPeloAporte,
    aporteInicial,
  ]);

  // Os rótulos mudam com o tipo de simulação. Ficam em constantes porque são
  // usados DUAS vezes: no texto visual acima do campo e como nome do campo pro
  // leitor de tela (o Text solto não fica ligado ao campo).
  const rotuloValor = perguntaPelaMeta
    ? 'Quanto você quer ter? (R$)'
    : perguntaPeloAporte || ehEconomiaSimples
      ? 'Quanto você quer guardar por mês? (R$)'
      : 'Valor total (R$)';
  const rotuloTaxa =
    tipo === 'compra'
      ? 'Taxa de juros ao mês, em % (opcional)'
      : taxaObrigatoria
        ? 'Taxa de rendimento ao mês, em %'
        : 'Taxa de rendimento ao mês, em % (opcional)';
  const rotuloParcelas = ehModalidadeDeGuardarDinheiro ? 'Em quantos meses?' : 'Parcelas (1 = à vista)';
  const rotuloDataInicio = ehModalidadeDeGuardarDinheiro ? 'A partir de quando?' : 'Data da 1ª parcela';

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
        {ehSugestaoDeSobra && tipo === 'rendimento' && (
          <AvisoPreenchimento>
            Preenchi com a sua sobra do mês, como uma reserva de emergência rendendo na Selic por 12
            meses. Ajuste o que quiser.
          </AvisoPreenchimento>
        )}

        <Text style={styles.rotulo}>Tipo de simulação</Text>
        <View style={styles.opcoes}>
          <OpcaoBotao label="Compra" selecionado={tipo === 'compra'} onPress={() => trocarTipo('compra')} />
          <OpcaoBotao
            label="Meta de economia"
            selecionado={tipo === 'economia'}
            onPress={() => trocarTipo('economia')}
          />
          <OpcaoBotao
            label="Rendimento"
            selecionado={tipo === 'rendimento'}
            onPress={() => trocarTipo('rendimento')}
          />
          <OpcaoBotao
            label="Aposentadoria"
            selecionado={tipo === 'aposentadoria'}
            onPress={() => {
              trocarTipo('aposentadoria');
              mostrarAvisoAposentadoriaSeNecessario();
            }}
          />
        </View>

        {tipo === 'aposentadoria' && (
          // Os avisos em si agora moram no modal (AvisoAposentadoriaModal,
          // ver fim do JSX) — esse link só existe pra reabrir de propósito,
          // caso a pessoa tenha fechado sem ler direito ou marcado "não
          // mostrar novamente" e queira reler depois.
          <Pressable accessibilityRole="button"
            style={styles.linkAvisos}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAvisoAposentadoriaVisivel(true);
            }}
          >
            <Text style={styles.linkAvisosTexto}>Ver avisos de risco</Text>
          </Pressable>
        )}

        {ehMetaDeInvestimento && (
          // Duas perguntas diferentes pro mesmo tipo de simulação (ver
          // comentário no topo do arquivo) — o usuário escolhe qual delas
          // quer responder, sem precisar fazer a conta de cabeça antes.
          <>
            <Text style={styles.rotulo}>O que você quer descobrir?</Text>
            <View style={styles.opcoes}>
              <OpcaoBotao
                label="Quanto preciso guardar"
                selecionado={direcaoInvestimento === 'meta'}
                onPress={() => setDirecaoInvestimento('meta')}
              />
              <OpcaoBotao
                label="Quanto vou ter"
                selecionado={direcaoInvestimento === 'aporte'}
                onPress={() => setDirecaoInvestimento('aporte')}
              />
            </View>
          </>
        )}

        <Text style={styles.rotulo}>Descrição</Text>
        <CampoTexto
          accessibilityLabel="Descrição"
          value={descricao}
          onChangeText={setDescricao}
          placeholder={
            tipo === 'compra'
              ? 'Ex: TV nova'
              : tipo === 'rendimento'
                ? 'Ex: Reserva rendendo'
                : tipo === 'aposentadoria'
                  ? 'Ex: Minha aposentadoria'
                  : 'Ex: Viagem pra praia'
          }
        />

        <Text style={styles.rotulo}>{rotuloValor}</Text>
        <CampoMoeda valor={valor} onChangeValor={setValor} acessibilidadeLabel={rotuloValor} />

        {ehMetaDeInvestimento && (
          <>
            <Text style={styles.rotulo}>Investimento inicial, se já tiver algo guardado (R$, opcional)</Text>
            <CampoMoeda
              valor={aporteInicial}
              onChangeValor={setAporteInicial}
              acessibilidadeLabel="Investimento inicial, se já tiver algo guardado, em reais, opcional"
            />
            {ehSugestaoDeSobra && tipo === 'rendimento' && aporteInicialSugerido > 0 && (
              <Text style={styles.dica}>
                Sugestão: o que passa de um mês de despesas no seu saldo, pra nunca faltar dinheiro nas
                contas do mês.
              </Text>
            )}
          </>
        )}

        {mostrarCampoDeTaxa && (
          <>
            <Text style={styles.rotulo}>{rotuloTaxa}</Text>
            <CampoTexto
              accessibilityLabel={rotuloTaxa}
              value={taxaJurosTexto}
              onChangeText={setTaxaJurosTexto}
              placeholder={
                tipo === 'compra'
                  ? 'Deixe em branco pra parcelamento sem juros'
                  : taxaObrigatoria
                    ? 'Ex: 0,58 (ou escolha uma referência abaixo)'
                    : 'Deixe em branco pra não simular rendimento'
              }
              keyboardType="decimal-pad"
            />
          </>
        )}

        {mostrarTaxasReferencia && (
          <View style={styles.blocoTaxas}>
            <View style={styles.blocoTaxasCabecalho}>
              <Text style={styles.blocoTaxasTitulo}>Taxas de referência</Text>
              <Pressable accessibilityRole="button"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  taxasReferencia.atualizar();
                }}
                disabled={taxasReferencia.atualizando}
                accessibilityLabel="Atualizar as taxas de referência"
                accessibilityState={{ disabled: taxasReferencia.atualizando, busy: taxasReferencia.atualizando }}
              >
                <Text style={styles.blocoTaxasAtualizar}>
                  {taxasReferencia.atualizando ? 'Atualizando...' : 'Atualizar'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.blocoTaxasLegenda}>
              {taxasReferencia.atualizadoEm
                ? `Atualizado em ${new Date(taxasReferencia.atualizadoEm).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Nunca atualizado — toque em "Atualizar" pra buscar'}
            </Text>
            {taxasReferencia.erro && <Text style={styles.blocoTaxasErro}>{taxasReferencia.erro}</Text>}

            {tipo === 'rendimento' && (taxasReferencia.selicMetaAnual !== null || taxasReferencia.cdiAnualizadoAnual !== null) && (
              <View style={styles.opcoes}>
                {taxasReferencia.selicMetaAnual !== null && (
                  <OpcaoBotao
                    label={`Selic: ${taxasReferencia.selicMetaAnual.toLocaleString('pt-BR')}% a.a.`}
                    selecionado={false}
                    onPress={() => aplicarTaxaAnual(taxasReferencia.selicMetaAnual!)}
                  />
                )}
                {taxasReferencia.cdiAnualizadoAnual !== null && (
                  <OpcaoBotao
                    label={`CDI: ${taxasReferencia.cdiAnualizadoAnual.toLocaleString('pt-BR')}% a.a.`}
                    selecionado={false}
                    onPress={() => aplicarTaxaAnual(taxasReferencia.cdiAnualizadoAnual!)}
                  />
                )}
              </View>
            )}

            {tipo === 'aposentadoria' && taxasReferencia.tesouroRendaMais.length > 0 && (
              <>
                <Text style={styles.blocoTaxasLegenda}>Tesouro RendA+ Aposentadoria Extra, por vencimento:</Text>
                <View style={styles.opcoes}>
                  {taxasReferencia.tesouroRendaMais.map((item) => (
                    <OpcaoBotao
                      key={item.vencimento}
                      label={`${item.vencimento.slice(0, 4)} · ${item.taxaAnual.toLocaleString('pt-BR')}%`}
                      selecionado={false}
                      onPress={() => aplicarVencimento(item.vencimento, item.taxaAnual)}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {ehAposentadoria ? (
          <>
            <Text style={styles.rotulo}>Até quando? (data-alvo)</Text>
            <CampoData valor={dataAlvoTexto} onChangeValor={setDataAlvoTexto} acessibilidadeLabel="Data-alvo" />
          </>
        ) : (
          <>
            <Text style={styles.rotulo}>{rotuloParcelas}</Text>
            <CampoTexto
              accessibilityLabel={rotuloParcelas}
              value={parcelasTexto}
              onChangeText={setParcelasTexto}
              placeholder={ehModalidadeDeGuardarDinheiro ? 'Ex: 12' : 'Ex: 10'}
              keyboardType="number-pad"
            />
          </>
        )}

        {preview && (
          <View style={styles.preview}>
            {perguntaPelaMeta ? (
              // Explica como chegou no resultado, do jeito que foi pedido:
              // não é só "guarde X/mês", é "pra ter Y em Z meses a W% ao
              // mês, você precisa guardar X/mês".
              <Text style={styles.previewLinha}>
                Pra ter {formatarReal(valor)} em {preview.parcelas} meses
                {preview.taxaJurosMensal > 0
                  ? ` a ${(preview.taxaJurosMensal * 100).toLocaleString('pt-BR')}% ao mês`
                  : ''}
                {aporteInicial > 0 ? `, já contando com um investimento inicial de ${formatarReal(aporteInicial)}` : ''}
                , você precisa guardar {formatarReal(preview.valorDaParcela)}/mês.
              </Text>
            ) : perguntaPeloAporte ? (
              // Sentido inverso: a pessoa já disse quanto vai guardar por
              // mês. Com rendimento (juros > 0), só descreve a projeção — o
              // resultado (bruto e líquido) aparece no bloco logo abaixo;
              // sem rendimento nenhum não tem bruto/líquido pra separar (é
              // só a soma direta), então já fala o total aqui mesmo.
              <Text style={styles.previewLinha}>
                Guardando {formatarReal(valor)}/mês por {preview.parcelas} meses
                {preview.taxaJurosMensal > 0
                  ? ` a ${(preview.taxaJurosMensal * 100).toLocaleString('pt-BR')}% ao mês`
                  : ''}
                {aporteInicial > 0 ? `, mais um investimento inicial de ${formatarReal(aporteInicial)}` : ''}
                {preview.rendimentoBruto > 0
                  ? ', você teria aproximadamente:'
                  : `, você teria ${formatarReal(preview.valorFuturoBruto ?? 0)} guardado.`}
              </Text>
            ) : ehEconomiaSimples ? (
              // `preview.valorDaParcela` já É o valor mensal digitado (ver
              // comentário no topo do arquivo) — o número novo aqui é o
              // total ao final, pra mostrar aonde esse hábito mensal chega.
              <Text style={styles.previewLinha}>
                Guardando {formatarReal(preview.valorDaParcela)}/mês por {preview.parcelas} meses, você vai juntar{' '}
                {formatarReal(preview.valorDaParcela * preview.parcelas)}.
              </Text>
            ) : (
              <Text style={styles.previewLinha}>
                {parcelasTexto}x de {formatarReal(preview.valorDaParcela)}
              </Text>
            )}
            {preview.jurosTotal > 0 && (
              <Text style={styles.previewJuros}>
                + {formatarReal(preview.jurosTotal)} de juros no total
              </Text>
            )}
            {preview.valorFuturoBruto !== null && preview.rendimentoBruto > 0 && (
              // "Projetado", não "garantido" — é uma conta com a taxa que o
              // PRÓPRIO usuário informou, o app não promete rendimento
              // nenhum nem recomenda taxa nenhuma. Bruto e líquido lado a
              // lado: o líquido já desconta o IR regressivo real (e, só em
              // 'aposentadoria', a custódia B3) — é o número que a pessoa
              // realmente teria na mão.
              <>
                <Text style={styles.previewRendimento}>
                  Bruto: {formatarReal(preview.valorFuturoBruto)} ao final (+{formatarReal(preview.rendimentoBruto)}{' '}
                  de rendimento)
                </Text>
                <Text style={styles.previewRendimentoLiquido}>
                  Líquido (após {(preview.aliquotaIR * 100).toLocaleString('pt-BR')}% de IR
                  {tipo === 'aposentadoria' ? ' e custódia B3' : ''}): {formatarReal(preview.valorFuturoLiquido ?? 0)}
                </Text>
              </>
            )}
          </View>
        )}

        <Text style={styles.rotulo}>{rotuloDataInicio}</Text>
        <CampoData valor={dataInicio} onChangeValor={setDataInicio} atalhosRapidos acessibilidadeLabel={rotuloDataInicio} />

        <Text style={styles.rotulo}>Categoria</Text>
        <CampoCategoria
          tipo={TIPO_SIMULACAO}
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
          <Pressable accessibilityRole="button" style={styles.botaoExcluir} onPress={confirmarExclusao}>
            <Text style={styles.botaoExcluirTexto}>Excluir simulação</Text>
          </Pressable>
        )}
      </ScrollView>

      <AvisoAposentadoriaModal
        visivel={avisoAposentadoriaVisivel}
        aoFechar={() => setAvisoAposentadoriaVisivel(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Explicação discreta do que foi pré-preenchido (só na sugestão de sobra).
  dica: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
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
  // Mesmo "cartão levantado" (sombra + cantos grandes) usado no resto do
  // app pra resultado de simulação (ver cartaoRendimento em
  // DetalheSimulacaoScreen.tsx) — antes era uma caixa branca chapada com
  // letra pequena, reportada como "feia e difícil de ler".
  preview: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  previewLinha: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  previewJuros: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  previewRendimento: {
    fontSize: 14,
    color: colors.primaryDark,
    lineHeight: 20,
  },
  previewRendimentoLiquido: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    marginTop: 2,
  },
  // Link pra reabrir o modal de avisos (AvisoAposentadoriaModal) — o
  // conteúdo em si não mora mais aqui, só o gatilho pra reler depois.
  linkAvisos: {
    marginTop: 10,
    paddingVertical: 6,
  },
  linkAvisosTexto: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
  // Mesmo cartão levantado do `preview` acima — mesmo motivo.
  blocoTaxas: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  blocoTaxasCabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  blocoTaxasTitulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 14,
    color: colors.primaryDark,
  },
  blocoTaxasAtualizar: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  blocoTaxasLegenda: {
    fontSize: 13,
    color: colors.textMuted,
  },
  blocoTaxasErro: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  erro: {
    color: colors.danger,
    marginTop: 16,
  },
  botaoSalvar: {
    marginTop: 24,
  },
  // Sem borda: ação destrutiva no iOS é texto colorido, não uma caixa
  // contornada — mesma lógica do botão secundário sem caixa.
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
