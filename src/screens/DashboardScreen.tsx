import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { obterSaldoAtual, calcularRendaFixaMedia } from '../logic/projecao';
import { estimarGastosFuturos } from '../logic/estimativaDeGastos';
import { projetarSituacaoAtual, avaliarSituacaoAtual } from '../logic/orcamentoMensal';
import { formatarReal } from '../utils/formatarReal';
import { interpolarCor } from '../utils/corPorValor';
import { IconeBroto } from '../components/IconeBroto';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';
import { curiosidadesInvestimento } from '../data/curiosidadesInvestimento';
import { escolherProximaCuriosidade } from '../logic/curiosidades';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { mesAtualLocal, hojeLocal } from '../utils/dataLocal';
import { DECORATIVO } from '../utils/acessibilidade';

// Paleta só desta tela — mais "aterrada" que as cores vivas do resto do
// app (colors.primary/secondary/etc, ver theme/colors.ts), de propósito:
// veio do pedido de deixar a tela inicial menos infantil sem perder a
// mecânica de botão de jogo (relevo + brilho). Fica local (não em
// colors.ts) porque é só o Dashboard que muda de tom — o resto do app
// continua com a paleta viva de sempre.
//
// Uma família de verdes (não seis cores soltas) — pedido explícito de
// padronizar a tela inicial num só tom, reforçando a marca ("Broto"). Pra
// não perder o "achar o botão certo num relance" que a cor variada dava,
// a família varia de claro a escuro: "Nova transação" fica no verde mais
// vivo/saturado (é a ação mais usada, ganha o maior destaque), o resto
// desce em tom conforme a ordem visual da grade (escuro -> claro).
const CORES_MENU_INICIAL = {
  novaTransacao: '#3F7D52',
  simulador: '#5C8C6B',
  extrato: '#8FA06B',
  atualizarSaldo: '#6B9C7A',
  categorias: '#2F4A3B',
  resumo: '#A3B58A',
};
// Verde escuro da marca — usado no ícone/nome "Broto" e no saldo, no lugar
// do dourado cartoon de antes.
const COR_MARCA = '#2F5C4E';

export default function DashboardScreen() {
  // useNavigation<...> tipado com RootStackParamList: dá autocomplete e erro de
  // compilação se você tentar navigation.navigate('TelaQueNaoExiste').
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const carregarConfiguracoes = useConfiguracoesStore((state) => state.carregar);
  const atualizarCuriosidadeIndice = useConfiguracoesStore((state) => state.atualizarCuriosidadeIndice);

  // Sorteada uma vez, na abertura do app (não a cada vez que essa tela
  // ganha foco de novo) — ver o `.then()` do carregarConfiguracoes() logo
  // abaixo.
  const [curiosidade, setCuriosidade] = useState<string | null>(null);

  // Array vazio de dependências = roda só uma vez, quando a tela monta na tela
  // (igual componentDidMount das classes antigas do React).
  useEffect(() => {
    const prontoCategorias = carregarCategorias();
    const prontoTransacoes = carregarTransacoes();
    const prontoSaldo = carregarSaldoInicial();
    carregarSimulacoes();
    const prontoConfiguracoes = carregarConfiguracoes();

    // `.then()` (não um valor capturado por `useConfiguracoesStore(seletor)`
    // no topo do componente): a curiosidade sorteada precisa do
    // `curiosidadeIndice` (a última mostrada) já carregado do banco — ler
    // um valor de store por seletor aqui correria o risco de pegar o `null`
    // inicial, antes do carregamento assíncrono terminar (mesma corrida já
    // resolvida em NovaSimulacaoScreen.tsx, ver comentário lá).
    prontoConfiguracoes.then(() => {
      const indiceAnterior = useConfiguracoesStore.getState().curiosidadeIndice;
      const indiceEscolhido = escolherProximaCuriosidade(curiosidadesInvestimento.length, indiceAnterior);
      setCuriosidade(curiosidadesInvestimento[indiceEscolhido]);
      atualizarCuriosidadeIndice(indiceEscolhido);
    });

    // Tutorial automático SÓ pra quem abre o app com o banco genuinamente
    // vazio (primeira instalação de verdade) — nunca pra quem já tem dado
    // real, mesmo que ainda não tenha "concluído" o tutorial (ex: alguém
    // que restaurou um backup antigo, de antes dessa coluna existir, não
    // pode ser recebido com um tutorial do zero). `Promise.all` espera os 4
    // carregamentos terminarem antes de checar — ler as stores direto por
    // `getState()` (não pelos valores capturados no topo do componente,
    // que podem estar desatualizados neste exato instante) evita a mesma
    // corrida do comentário acima.
    Promise.all([prontoCategorias, prontoTransacoes, prontoSaldo, prontoConfiguracoes]).then(() => {
      const appEstaVazio =
        useCategoriasStore.getState().categorias.length === 0 &&
        useTransacoesStore.getState().transacoes.length === 0 &&
        useSaldoInicialStore.getState().saldosIniciais.length === 0;
      if (appEstaVazio && !useConfiguracoesStore.getState().tutorialConcluido) {
        // `.replace` (não `.navigate`): a pessoa ainda não "chegou" ao
        // Dashboard de verdade — o Tutorial toma o lugar dele na pilha, não
        // empilha por cima (senão o botão de voltar do Tutorial devolveria
        // pra um Dashboard vazio no meio da apresentação).
        navigation.replace('Tutorial');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregarCategorias, carregarTransacoes, carregarSaldoInicial, carregarSimulacoes, carregarConfiguracoes]);

  // Sem cabeçalho nativo nessa tela (ver RootNavigator.tsx) — o gradiente
  // de fundo vai até o topo de VERDADE da tela, por trás do notch, mas o
  // conteúdo (título, saldo, botões) não pode ficar embaixo do notch/barra
  // de status. `insets.top` é exatamente essa distância segura: usamos ela
  // como o respiro de cima do cabeçalho, no lugar de um número fixo que
  // funcionaria num aparelho e ficaria errado (grudado no notch) em outro.
  const insets = useSafeAreaInsets();

  const saldoAtual = useMemo(
    () => obterSaldoAtual(saldosIniciais, transacoes),
    [saldosIniciais, transacoes],
  );

  // "Situação atual": como está o dinheiro de verdade, olhando pra frente
  // — sempre visível (não só quando existe uma meta de economia; metas e
  // parcelas ativas continuam entrando na conta, só deixaram de ser o
  // gatilho que decide SE o card aparece). Projeta o saldo ACUMULADO a
  // partir de hoje (mesmo motor do Simulador) e julga pelo PIOR PONTO da
  // trajetória — não por uma soma de renda/despesa "por mês", que escondia
  // que um salário do fim do mês é o dinheiro que paga as contas do mês
  // seguinte, não uma sobra livre. Ver o comentário completo em
  // logic/orcamentoMensal.ts.
  const situacaoAtual = useMemo(() => {
    const hoje = hojeLocal();
    const rendaFixaMensal = calcularRendaFixaMedia(transacoes);
    const estimativa = estimarGastosFuturos(transacoes, mesAtualLocal());
    const projecao = projetarSituacaoAtual(
      transacoes,
      simulacoes,
      saldoAtual,
      hoje,
      estimativa,
      rendaFixaMensal,
    );
    // A conclusão (tranquilo? apertado? negativo em qual dia?) mora em
    // avaliarSituacaoAtual — a tela só desenha o que ela devolve, sem
    // refazer a conta.
    return avaliarSituacaoAtual(projecao);
  }, [transacoes, simulacoes, saldoAtual]);

  return (
    // Sem "céu"/"chão" ilustrados nem mascote animado (ver comentário no
    // topo do arquivo, CORES_MENU_INICIAL) — a tela virou um fundo neutro
    // (gradiente sutil, ver LinearGradient abaixo) com o menu de botões e,
    // agora, o cartão de curiosidade preenchendo o espaço que antes era
    // cenário. `bounces`/`overScrollMode="never"` continuam desligados só
    // pra não deixar aparecer o fundo padrão do `container` num gesto mais
    // forte, puxando o gradiente de leve.
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      bounces={false}
      overScrollMode="never"
    >
      <View style={[styles.mundo, { paddingBottom: insets.bottom + 24 }]}>
        <LinearGradient colors={['#F1EDE4', '#E7E1D3']} style={StyleSheet.absoluteFill} />

        {/* Engrenagem sutil, numa cor neutra clara — não é uma ação do dia
            a dia como as outras, é só o acesso a Configurações
            (privacidade, acessibilidade, dados, Backup), não precisa (nem
            deve) competir visualmente com elas. Fica FORA do
            `cabecalhoTopo` de propósito (ancorada direto no `mundo`, não
            nele), na mesma altura do título — os dois ficam presos no
            topo, junto do notch; só a grade de botões (`areaBotoes`,
            abaixo) se centraliza no espaço que sobra.
            Sem o efeito de "base 3D que soma/some" dos outros botões aqui
            de propósito: nos botões retangulares maiores, uma faixa escura
            embaixo lê como o bloco "de pé"; num círculo pequeno de 36px, a
            mesma técnica (um `bottom` que corta o círculo num traço reto)
            lia como uma linha estranha colada na bolinha, não como
            profundidade. Pressionar aqui só escurece a face, sem cortar a
            forma. */}
        <Pressable
          // Botão só com ícone: sem nome, o leitor de tela diria apenas "botão".
          accessibilityRole="button"
          accessibilityLabel="Configurações"
          style={[styles.botaoEngrenagemMoldura, { top: insets.top + 16 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('Configuracoes');
          }}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.botaoEngrenagemFace,
                pressed && styles.botaoEngrenagemFacePressionada,
              ]}
            >
              <SymbolView
                name="gearshape.fill"
                size={16}
                tintColor="#5B5240"
                fallback={<Ionicons name="settings-outline" size={16} color="#5B5240" />}
              />
            </View>
          )}
        </Pressable>

        {/* Título + saldo ficam presos perto do topo, um pouco abaixo da
            engrenagem (não na mesma altura dela) — não descem junto quando
            a grade de botões abaixo se centraliza no espaço sobrando (ver
            `areaBotoes`). */}
        <View style={[styles.cabecalhoTopo, { paddingTop: insets.top + 56 }]}>
          {/* Marca discreta: o broto em linha (IconeBroto) + o nome, em
              fonte limpa (Poppins) — no lugar do "BROTO" em letras
              cartoon com relevo de moeda que existia antes. O relevo/fonte
              de jogo continuam vivos no menu de botões logo abaixo; aqui
              em cima é só a assinatura do app, mais sóbria. */}
          <View style={styles.tituloContainer}>
            <IconeBroto size={22} color={COR_MARCA} />
            <Text accessibilityRole="header" style={styles.title}>Broto</Text>
          </View>
          {/* O saldo e seu rótulo são lidos juntos ("Valor disponível: R$ 0,00");
              o rótulo visual fica escondido do leitor pra não ser repetido. */}
          <Text
            accessibilityLabel={`Valor disponível: ${formatarReal(saldoAtual)}`}
            style={[styles.saldoAtual, saldoAtual < 0 && styles.saldoNegativo]}
          >
            {formatarReal(saldoAtual)}
          </Text>
          <Text {...DECORATIVO} style={styles.subtitle}>Valor Disponível</Text>
        </View>

        {/* `flex: 1` + `justifyContent: 'center'`: ocupa todo o espaço que
            sobra entre o bloco fixo de cima e o chão, e centraliza a grade
            de botões NESSE espaço — o título/saldo não participam dessa
            centralização, só a grade. */}
        <View style={styles.areaBotoes}>
          {/* Linha de destaque: lançar uma transação e ver o simulador são
              as duas ações mais usadas, então ganham a linha de cima, maior
              que o resto do menu (mesma proporção do antigo botão "+ Nova
              transação" sozinho). O restante (menos frequente/mais
              "utilitário") desce pra uma grade mais discreta abaixo. */}
          <View style={styles.linhaPrincipal}>
            <BotaoMenu
              simbolo="plus.circle.fill"
              iconeAndroid="add-circle"
              cor={CORES_MENU_INICIAL.novaTransacao}
              label="Nova transação"
              onPress={() => navigation.navigate('NovaTransacao')}
              tamanho="grande"
            />
            <BotaoMenu
              simbolo="binoculars.fill"
              iconeAndroid="telescope"
              cor={CORES_MENU_INICIAL.simulador}
              label="Simulador"
              onPress={() => navigation.navigate('Simulador')}
              tamanho="grande"
            />
          </View>

          {/* Menu de jogo: sem cartão nenhum por baixo — cada ação é o
              próprio botão colorido, 2 por linha, do jeito que menu de
              jogo mobile costuma ser (ex: tela inicial de app de jogo
              casual), não uma lista de configurações. */}
          <View style={styles.menuGrid}>
            <View style={styles.menuLinha}>
              <BotaoMenu
                simbolo="list.bullet.rectangle.fill"
                iconeAndroid="list-outline"
                cor={CORES_MENU_INICIAL.extrato}
                label="Ver extrato"
                onPress={() => navigation.navigate('Extrato')}
              />
              <BotaoMenu
                simbolo="arrow.triangle.2.circlepath"
                iconeAndroid="sync-circle"
                cor={CORES_MENU_INICIAL.atualizarSaldo}
                label="Atualizar saldo"
                onPress={() => navigation.navigate('AtualizarSaldo')}
              />
            </View>
            <View style={styles.menuLinha}>
              <BotaoMenu
                simbolo="tag.fill"
                iconeAndroid="pricetags"
                cor={CORES_MENU_INICIAL.categorias}
                label="Categorias"
                onPress={() => navigation.navigate('Categorias')}
              />
              <BotaoMenu
                simbolo="chart.bar.fill"
                iconeAndroid="stats-chart"
                cor={CORES_MENU_INICIAL.resumo}
                label="Ver resumo"
                onPress={() => navigation.navigate('Resumo')}
              />
            </View>
          </View>
        </View>

        {/* "Situação atual" — SEMPRE visível (não mais gated por ter uma
            meta de economia ativa; metas/parcelas continuam entrando na
            conta, só deixaram de decidir SE o card aparece — pedido
            explícito do usuário). Projeta o saldo ACUMULADO a partir de
            hoje e julga pelo PIOR PONTO da trajetória, não por uma soma
            solta de renda/despesa — é o conserto de um bug relatado: um
            salário do fim do mês (dia 30) é o dinheiro que paga as contas
            do mês SEGUINTE, e uma conta "por mês" tratava ele como sobra
            livre. Ver o comentário completo em logic/orcamentoMensal.ts. */}
        <View style={styles.painelMoldura}>
          <View style={styles.painelBase}>
            <View style={styles.painelFace}>
              <View style={styles.painelBrilho} pointerEvents="none" />
              <Text accessibilityRole="header" style={styles.orcamentoRotulo}>SITUAÇÃO ATUAL</Text>
              <View
                style={styles.orcamentoTrilho}
                accessible
                accessibilityRole="progressbar"
                accessibilityLabel="Quanto do seu dinheiro disponível já está comprometido até o pior momento previsto"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(situacaoAtual.percentual * 100) }}
              >
                <View
                  style={[
                    styles.orcamentoPreenchimento,
                    { width: `${Math.round(situacaoAtual.percentual * 100)}%` },
                  ]}
                >
                  <View style={styles.orcamentoPreenchimentoBrilho} pointerEvents="none" />
                </View>
              </View>
              {/* Sem legenda de "X gastos de Y disponíveis" de propósito: a
                  janela de 12 meses (ver logic/orcamentoMensal.ts) faz
                  esses totais somarem dezenas de milhares de reais — um
                  número gigante, sem uso prático, e que contradiz
                  visualmente o "Valor Disponível" (o saldo de HOJE) logo
                  acima. A barra continua só como proporção visual; o único
                  número que importa é o que a mensagem abaixo já dá,
                  sempre pequeno e amarrado a um mês real específico. */}
              <Text style={styles.orcamentoMensagem}>{situacaoAtual.mensagem}</Text>
              {situacaoAtual.nivel === 'negativo' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rever gastos"
                  style={styles.orcamentoConviteBotaoMoldura}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('RevisarGastos', {
                      reducaoNecessaria: situacaoAtual.falta,
                      mes: situacaoAtual.piorData.slice(0, 7),
                    });
                  }}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.orcamentoConviteBotaoFace,
                        { paddingBottom: pressed ? 0 : ALTURA_BASE_PEQUENA },
                      ]}
                    >
                      <View style={styles.orcamentoConviteBotaoBrilho} pointerEvents="none" />
                      <Text style={styles.orcamentoConviteBotaoTexto}>Rever gastos</Text>
                    </View>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* Curiosidade educativa, sorteada uma vez por abertura do app (ver
            useEffect acima) — preenche com conteúdo de verdade o espaço que
            antes era chão/mascote. Visual "de painel estático" (contorno +
            base 3D fixa + brilho), mesmo molde do AvisoAposentadoriaModal —
            reforça o clima de jogo sem competir com o menu de ações nem
            virar mais um quadrado branco de texto miúdo. Fica de fora se a
            curiosidade ainda não foi sorteada (config ainda carregando). */}
        {curiosidade && (
          <View style={styles.painelMoldura}>
            <View style={styles.painelBase}>
              <View style={styles.painelFace}>
                <View style={styles.painelBrilho} pointerEvents="none" />
                <View style={styles.curiosidadeCabecalho}>
                  <View style={styles.curiosidadeSelo}>
                    <SymbolView
                      name="lightbulb.fill"
                      size={11}
                      tintColor="#FFFFFF"
                      fallback={<Ionicons name="bulb" size={11} color="#FFFFFF" />}
                    />
                  </View>
                  <Text style={styles.curiosidadeRotulo}>CURIOSIDADE</Text>
                </View>
                <Text style={styles.curiosidadeTexto}>{curiosidade}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Marca d'água bem discreta no rodapé — o mesmo broto do topo,
            bem pequeno e translúcido, só pra fechar a tela sem deixar o
            espaço embaixo do cartão totalmente vazio, sem virar cenário. */}
        <View style={styles.marcaRodape}>
          <IconeBroto size={16} color={COR_MARCA} />
        </View>
      </View>
    </ScrollView>
  );
}

// Um botão do "menu de jogo": um bloco colorido só (a própria cor JÁ É o
// selo — não precisa mais de um selinho separado dentro de um cartão
// neutro), ícone branco grande em cima, nome embaixo. Trocado de "linha de
// lista" (ícone pequeno + texto + seta, parecido com Ajustes da Apple) pra
// isso porque o usuário achou que aquele estilo destoava do resto da tela
// (moeda, brilho de despesa) — um menu de BOTÕES coloridos, tipo tela
// inicial de jogo mobile, combina mais com a proposta gameficada do app.
//
// Ícone é SF Symbol (o pacote de ícones nativo do próprio iOS — os mesmos
// usados em Ajustes, Mail etc.). `SFSymbol` (do pacote
// `sf-symbols-typescript`) é o tipo de "qualquer nome de símbolo que
// existe de verdade no catálogo da Apple" — um nome errado vira erro de
// compilação. `iconeAndroid`/`fallback` é só uma rede de segurança pro
// Android (SF Symbols não existe lá — nem web).
// Altura (em px) da faixa mais escura que sobra embaixo do botão "de pé" —
// mesma ideia do BotaoPrimario (ver comentário lá), só que os valores mudam
// conforme o tamanho do botão.
const ALTURA_BASE_PEQUENA = 3;
const ALTURA_BASE_GRANDE = 4;

function BotaoMenu({
  simbolo,
  iconeAndroid,
  cor,
  label,
  onPress,
  tamanho = 'pequeno',
}: {
  simbolo: SFSymbol;
  iconeAndroid: keyof typeof Ionicons.glyphMap;
  cor: string;
  label: string;
  onPress: () => void;
  // 'grande' é só pra linha de destaque (Nova transação/Simulador) — mesma
  // proporção que o antigo botão "+ Nova transação" sozinho tinha.
  tamanho?: 'grande' | 'pequeno';
}) {
  const grande = tamanho === 'grande';
  // A "base" (moldura) é sempre uma versão mais escura da própria cor do
  // botão — cada botão tem uma cor diferente, então isso não dá pra
  // resolver com uma constante fixa no StyleSheet, precisa calcular aqui.
  const corBase = interpolarCor(cor, '#000000', 0.3);
  const alturaBase = grande ? ALTURA_BASE_GRANDE : ALTURA_BASE_PEQUENA;
  const paddingTopFace = grande ? 14 : 8;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.botaoMenuMoldura,
        grande && styles.botaoMenuMolduraGrande,
        { backgroundColor: corBase },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      {({ pressed }) => (
        // `paddingBottom` dinâmico é o que revela (ou esconde, pressionado)
        // a faixa mais escura da `moldura` embaixo — mesma técnica do
        // BotaoPrimario, ver comentário lá.
        <View
          style={[
            styles.botaoMenuFace,
            { backgroundColor: cor, paddingTop: paddingTopFace, paddingBottom: pressed ? 0 : alturaBase },
          ]}
        >
          <View style={styles.botaoMenuBrilho} pointerEvents="none" />
          <SymbolView
            name={simbolo}
            size={grande ? 20 : 16}
            tintColor="#FFFFFF"
            fallback={<Ionicons name={iconeAndroid} size={grande ? 20 : 16} color="#FFFFFF" />}
          />
          <Text style={[styles.botaoMenuTexto, grande && styles.botaoMenuTextoGrande]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // `flexGrow: 1` é o que resolve o bug de "tela curta": sem isso, quando o
  // conteúdo (o cabeçalho) é mais baixo que a tela, o ScrollView só ocupa o
  // espaço do próprio conteúdo — sobrava uma faixa da cor de fundo normal
  // embaixo do chão (que não ficava colado na borda de verdade) e o céu não
  // preenchia o resto. Com `flexGrow: 1`, o conteúdo cresce até preencher a
  // tela INTEIRA sempre que sobrar espaço — é o padrão clássico de "rodapé
  // grudado embaixo" do React Native.
  scrollContent: {
    flexGrow: 1,
  },
  // `flex: 1` faz o `mundo` crescer pra ocupar a tela inteira (ou mais,
  // se o conteúdo precisar de scroll) — é o que faz o gradiente de fundo
  // (`StyleSheet.absoluteFill` dentro dele, ver JSX) cobrir tudo, inclusive
  // o respiro de baixo (`paddingBottom` dinâmico, ver JSX) reservado pra
  // área segura do aparelho.
  mundo: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  // Título + saldo: fica em fluxo normal, um pouco abaixo da engrenagem —
  // não participa de nenhuma centralização, só a grade de botões abaixo
  // (`areaBotoes`) faz isso.
  cabecalhoTopo: {
    alignItems: 'center',
    gap: 8,
  },
  // Ocupa o espaço que sobra entre o `cabecalhoTopo` e o chão e centraliza
  // a grade de botões NESSE espaço — antes o `justifyContent: 'center'`
  // estava no `mundo` inteiro, o que também empurrava título/saldo pra
  // baixo (não era a intenção: só a grade de botões deveria se mover pra
  // preencher o vazio que sobrou quando o botão de Backup saiu daqui).
  // `paddingBottom` desloca o ponto de centralização pra cima — os botões
  // ficam um pouco acima do meio exato do espaço, não colados nele. Menor
  // do que já foi (era 120): o respiro que sobrava embaixo agora é ocupado
  // de propósito pelo cartão de curiosidade (ver JSX), não fica mais vazio.
  areaBotoes: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  // Ícone + nome lado a lado — no lugar do antigo "BROTO" em letras
  // cartoon com relevo de moeda (ver comentário no JSX).
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 26,
    // Carregada uma vez, no topo do app (ver App.tsx) — garantido já
    // disponível antes de qualquer tela montar.
    fontFamily: 'Poppins_700Bold',
    color: COR_MARCA,
  },
  saldoAtual: {
    fontSize: 36,
    fontWeight: '700',
    color: COR_MARCA,
    marginTop: 8,
  },
  saldoNegativo: {
    color: colors.danger,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  // Botão redondo pequeno e sutil no canto superior direito — acesso a
  // Configurações. Cor neutra (não uma das cores vivas do menu) de
  // propósito: é uma ação diferente das outras (manutenção, não uso do dia
  // a dia), não deve competir visualmente com elas. `position: absolute`
  // ancorado no `mundo` (ver JSX).
  botaoEngrenagemMoldura: {
    position: 'absolute',
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  botaoEngrenagemFace: {
    flex: 1,
    // Cinza-areia claro (mesmo tom neutro do gradiente de fundo, só mais
    // escuro) — no lugar do círculo marrom sólido de antes, combina melhor
    // com o fundo neutro desta versão da tela.
    backgroundColor: '#DAD2BE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pressionado só escurece a face em vez de afundar/cortar a forma — é a
  // diferença que evita a "linha estranha" que o efeito de base 3D
  // desenhava embaixo do círculo pequeno.
  botaoEngrenagemFacePressionada: {
    backgroundColor: interpolarCor('#DAD2BE', '#000000', 0.15),
  },
  // Linha de destaque: "Nova transação" e "Simulador" lado a lado, maiores
  // que o resto do menu — são as duas ações mais usadas do app, ganham
  // prioridade visual. `marginTop` maior que o `gap` do `menuGrid` abaixo
  // reforça essa separação (destaque vs. utilitário).
  linhaPrincipal: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  // Grade do menu de jogo: sem fundo/borda nenhum aqui — o gradiente de
  // fundo continua visível por trás, entre um botão e outro.
  // `paddingHorizontal` próprio (não do `cabecalho`, que não tem nenhum)
  // porque só a grade precisa desse respiro das bordas — o resto do
  // cabeçalho (título, saldo, linha de destaque) já se autocentraliza.
  menuGrid: {
    width: '100%',
    marginTop: 12,
    paddingHorizontal: 24,
    gap: 12,
  },
  menuLinha: {
    flexDirection: 'row',
    gap: 12,
  },
  // A "moldura" de cada botão: contorno escuro grosso + corte arredondado
  // (mais "bloco de jogo pixel" que pílula lisa) + a cor mais escura do
  // próprio botão como fundo (ver `corBase` no componente) — o `face` (a
  // cor de verdade, mais clara) cobre quase tudo, sobrando só uma faixa
  // embaixo (o "chão" 3D). `flex: 1` faz os 2 botões de cada linha
  // dividirem o espaço igualmente.
  botaoMenuMoldura: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  // Versão maior, só pra linha de destaque (Nova transação/Simulador) —
  // contorno um pouco mais grosso e cantos um pouco mais arredondados,
  // acompanhando o tamanho maior do botão.
  botaoMenuMolduraGrande: {
    borderRadius: 10,
    borderWidth: 2.5,
  },
  // A cor de verdade do botão mora aqui — `paddingTop`/`paddingBottom`
  // (ver JSX) controlam a altura da faixa escura que sobra embaixo (a
  // "base" 3D) e somem quando pressionado, simulando o bloco afundando até
  // encostar no contorno.
  botaoMenuFace: {
    position: 'relative',
    alignItems: 'center',
    gap: 3,
  },
  // Tira sólida de brilho no topo — mais "pixelada"/crua que um degradê
  // suave, combina com o resto do visual de botão de jogo retrô.
  botaoMenuBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  // Poppins (não mais Bungee) — mesma revisão de tom do resto da tela:
  // fonte de jogo cartoon só sobrevive no selo da curiosidade, um toque de
  // marca, não no texto corrido dos botões.
  botaoMenuTexto: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 10,
    textAlign: 'center',
  },
  botaoMenuTextoGrande: {
    fontSize: 13,
  },
  // Mesmo molde "de painel estático" do AvisoAposentadoriaModal.tsx
  // (contorno grosso + base 3D fixa que não some, já que não é um botão +
  // brilho no topo) — reaproveitado tanto no cartão de curiosidade quanto
  // no de orçamento (ver JSX), sem copiar o componente inteiro (são bem
  // menores e ficam soltos no Dashboard, não dentro de um Modal). Nome
  // genérico (`painel...`, não `curiosidade...`) de propósito, já que
  // agora serve aos dois cartões.
  painelMoldura: {
    marginTop: 12,
    marginHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
  },
  painelBase: {
    backgroundColor: colors.textMuted,
    paddingBottom: 4,
  },
  painelFace: {
    position: 'relative',
    backgroundColor: colors.surface,
    padding: 12,
    gap: 6,
  },
  painelBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  curiosidadeCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Selo redondo com o ícone de lâmpada — mesma cor do botão "Simulador"
  // (colors.secondary), o dourado do app já associado a "descobrir algo"
  // (ver aviso de sobra + botão de Simular quanto renderia, em
  // SimuladorScreen.tsx).
  curiosidadeSelo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fonte de jogo só no RÓTULO (o "selo" da curiosidade) — o texto da
  // curiosidade em si usa fonte normal e legível logo abaixo, mesma
  // separação já usada nos outros cartões desta rodada de UX (ver
  // AvisoAposentadoriaModal/blocoTaxas em NovaSimulacaoScreen.tsx):
  // gameficado no toque de marca, sério no conteúdo.
  curiosidadeRotulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    color: '#B8860B',
  },
  curiosidadeTexto: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  // Rótulo verde (não dourado, como o da curiosidade) — combina com a
  // barra abaixo, que usa a mesma cor viva do menu (`novaTransacao`).
  orcamentoRotulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 11,
    letterSpacing: 0.5,
    color: CORES_MENU_INICIAL.novaTransacao,
  },
  // A "trilha" da barra — um sulco raso, não outro painel de jogo (esse
  // elemento não é clicável, não precisa do contorno grosso dos botões).
  orcamentoTrilho: {
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  // O preenchimento em si — mesma cor viva do botão "Nova transação", pra
  // ligar visualmente "o que sobra pra gastar" com a ação de lançar uma
  // despesa nova. Sempe arredondado dos dois lados: com pouco preenchido
  // isso corta o canto direito por dentro do trilho (efeito esperado,
  // mesmo de qualquer barra de progresso).
  orcamentoPreenchimento: {
    position: 'relative',
    height: '100%',
    borderRadius: 7,
    backgroundColor: CORES_MENU_INICIAL.novaTransacao,
  },
  orcamentoPreenchimentoBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  // Mensagem discreta (ver avaliarSituacaoAtual) — mesmo tratamento sério e
  // legível do texto da curiosidade, nunca em tom de alarme.
  orcamentoMensagem: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  // Botão pequeno "de jogo" (mesma técnica de moldura+face+brilho dos
  // botões do menu, só que num tamanho pill, alinhado à esquerda) — o
  // convite pra rever gastos precisa parecer tão clicável quanto os
  // outros botões da tela, não um link de texto perdido.
  orcamentoConviteBotaoMoldura: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    backgroundColor: interpolarCor(CORES_MENU_INICIAL.novaTransacao, '#000000', 0.3),
  },
  orcamentoConviteBotaoFace: {
    position: 'relative',
    backgroundColor: CORES_MENU_INICIAL.novaTransacao,
    paddingTop: 9,
    paddingHorizontal: 14,
  },
  orcamentoConviteBotaoBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  orcamentoConviteBotaoTexto: {
    color: '#FFFFFF',
    fontFamily: 'Poppins_700Bold',
    fontSize: 12,
  },
  marcaRodape: {
    alignItems: 'center',
    marginTop: 16,
    opacity: 0.4,
  },
});
