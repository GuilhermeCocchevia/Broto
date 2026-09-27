import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { DECORATIVO } from '../utils/acessibilidade';

// Largura da tela — pra nuvem começar/terminar sempre bem fora da área
// visível, não importa o aparelho.
const LARGURA_TELA = Dimensions.get('window').width;

// Duas peças de um mesmo "mundo" de jogo, pra usar em telas diferentes:
// `CenaCeu` é um fundo BEM discreto (baixa opacidade) pra ficar atrás de
// conteúdo de verdade (número, botão) sem atrapalhar a leitura — a ideia
// aqui não é chamar atenção, é só dar um clima. `CenaChao` é o oposto: uma
// faixa vivida, cor forte, pensada como uma "recompensa" visual que só
// aparece quando o usuário rola a tela até lá embaixo — igual descobrir o
// chão de um jogo de plataforma. Nenhuma das duas usa imagem — tudo é
// View com cor de fundo/borda, o mesmo truque de sempre.

// Nuvem "de mentirinha": uma base tipo pílula + 2 bolhas por cima, andando
// devagar da esquerda pra direita pra sempre. `useNativeDriver: true` faz a
// animação inteira rodar na thread nativa de UI (não na JS, que fica livre
// pro resto do app) — o custo real disso é próximo de zero, mesmo com
// várias nuvens ao mesmo tempo. `duracaoMs`/`atrasoInicialMs` diferentes por
// nuvem evitam que todas andem "grudadas" em fila, dando uma sensação mais
// natural de vento (cada uma no seu próprio ritmo).
function Nuvem({
  style,
  escala = 1,
  duracaoMs,
  atrasoInicialMs = 0,
  reduzirMovimento = false,
}: {
  style?: object;
  escala?: number;
  duracaoMs: number;
  atrasoInicialMs?: number;
  // Com "Reduzir Movimento" ativo (do sistema ou de Configurações > Acessi-
  // bilidade — ver useReduzirMovimento.ts), a nuvem para de andar e fica
  // parada num ponto visível — não simplesmente escondida (continua
  // decorando a cena, só sem o movimento contínuo que pode incomodar
  // sensibilidade a movimento).
  reduzirMovimento?: boolean;
}) {
  // Começa 120px fora da tela à esquerda; a "virada" de volta a esse ponto
  // some junto (a `View` que envolve o céu no Dashboard corta com
  // `overflow:hidden`), então o pulo de reiniciar o loop nunca aparece. Com
  // movimento reduzido, começa já num ponto visível em vez de fora da tela
  // (não tem animação que a traga pra dentro depois).
  const posicaoX = useRef(new Animated.Value(reduzirMovimento ? LARGURA_TELA * 0.4 : -120))
    .current;

  useEffect(() => {
    if (reduzirMovimento) return;
    const animacao = Animated.sequence([
      Animated.delay(atrasoInicialMs),
      // `Animated.loop` reseta `posicaoX` pro valor inicial (-120) sozinho
      // antes de cada repetição — não precisa fazer isso na mão.
      Animated.loop(
        Animated.timing(posicaoX, {
          toValue: LARGURA_TELA + 120,
          duration: duracaoMs,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]);
    animacao.start();
    // Some se a tela desmontar no meio da animação (ex: usuário navegou
    // embora) — sem isso o loop continuaria tentando animar um valor de uma
    // tela que não existe mais mais.
    return () => animacao.stop();
  }, [posicaoX, duracaoMs, atrasoInicialMs, reduzirMovimento]);

  return (
    <Animated.View
      style={[
        styles.nuvemContainer,
        style,
        { transform: [{ scale: escala }, { translateX: posicaoX }] },
      ]}
    >
      <View style={styles.nuvemBase} />
      <View style={styles.nuvemBolhaEsquerda} />
      <View style={styles.nuvemBolhaDireita} />
    </Animated.View>
  );
}

// Distância (em px) que o Brotinho anda pra cada lado do centro do chão, e
// quanto tempo leva pra cruzar essa distância — usado tanto no passeio
// quanto (implicitamente) no tamanho da faixa de chão, que precisa ser
// larga o bastante pra caber o passeio inteiro sem cortar.
const DISTANCIA_PASSEIO = 70;
const DURACAO_TRAVESSIA_MS = 4200;

// Folha arredondada e caída (não mais uma ponta afiada) — desenhada com um
// `Path` SVG de curvas (`react-native-svg`, já é dependência do app pro
// gráfico do Simulador, não é lib nova): estreita no ponto onde "nasce" do
// caule, larga e redonda na ponta, como uma folha de brotinho de verdade —
// inspirada numa referência que o usuário mandou. A nervura central (a
// linha mais escura no meio) é só um traço por cima, reforça a leitura de
// "folha" em vez de "gota". `espelhada` reaproveita o MESMO desenho pros
// dois lados — só inverte horizontalmente, não precisa duplicar os pontos.
function Folha({ espelhada = false }: { espelhada?: boolean }) {
  return (
    <Svg
      width={12}
      height={18}
      viewBox="0 0 12 18"
      style={espelhada ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d="M6,18 C1.5,15 0,9 1.5,4.5 C2.8,1 4.8,0 6,0 C7.2,0 9.2,1 10.5,4.5 C12,9 10.5,15 6,18 Z"
        fill={colors.cenaGrama}
        stroke={colors.cenaGramaEscura}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path
        d="M6,15 L6,2.5"
        stroke={colors.cenaGramaEscura}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}

// O mascote do app: um brotinho verde — corpo fino e alto (um caule, não
// mais uma bolinha), 2 folhas arredondadas e caídas no topo (ver `Folha`),
// 2 bracinhos finos rente ao corpo e 2 olhinhos simples. Caminha de um
// lado pro outro do chão sem parar.
//
// Quatro animações, cada uma cuidando de uma coisa:
// - `posicaoX`: vai e volta (ping-pong) entre -DISTANCIA e +DISTANCIA, com
//   uma pausa curta e um pouco aleatória em cada ponta antes de virar (ver
//   `andarUmaPerna` abaixo) — sem isso o passeio vira um metrônomo, fica
//   óbvio que é um loop mecânico.
// - `viradoParaEsquerda`: um "interruptor" (1 ou -1) que espelha o corpo
//   (`scaleX`) na hora exata que o sentido muda, pra parecer que ele virou
//   de verdade, não que anda de costas.
// - `escalaCorpo`: NÃO é uma animação própria — é `posicaoX` reaproveitado
//   via `.interpolate()` (achata um pouco no meio do trajeto, volta ao
//   normal nas pontas). Um "squash" bem sutil que sugere peso/impulso sem
//   precisar desenhar perna nenhuma.
// - `passinho`: um bobble vertical bem pequeno e contínuo, simulando o
//   "sobe e desce" de passos, independente de pra que lado ele anda.
function Brotinho({ reduzirMovimento = false }: { reduzirMovimento?: boolean }) {
  const posicaoX = useRef(new Animated.Value(-DISTANCIA_PASSEIO)).current;
  const viradoParaEsquerda = useRef(new Animated.Value(1)).current;
  const passinho = useRef(new Animated.Value(0)).current;

  // Achata levemente (0.95) na metade do caminho, volta a 1 nas pontas —
  // `interpolate` não cria nenhuma animação nova, só "lê" `posicaoX` de um
  // jeito diferente, então continua rodando na thread nativa junto com ela.
  const escalaCorpo = posicaoX.interpolate({
    inputRange: [-DISTANCIA_PASSEIO, 0, DISTANCIA_PASSEIO],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    // Com movimento reduzido, o Broto fica parado bem no meio do chão (nem
    // passeio, nem bobble de passinho) — continua visível, só sem o
    // movimento contínuo.
    if (reduzirMovimento) return;

    // Sem isso, se a tela desmontar no meio de uma perna do passeio (ex:
    // usuário navegou embora), o `.start(callback)` pendente ainda dispara
    // e agenda a PRÓXIMA perna sozinho — um loop "fantasma" que nunca para
    // de verdade, só porque `Animated.loop().stop()` não existe mais aqui
    // (trocamos por uma corrente de `.start(callback)` pra poder sortear
    // uma pausa diferente a cada volta, ver abaixo).
    let cancelado = false;

    function andarUmaPerna(destino: number, proximoSentido: number) {
      Animated.timing(posicaoX, {
        toValue: destino,
        duration: DURACAO_TRAVESSIA_MS,
        // `Easing.out` acelera rápido no começo e desacelera suave no
        // fim — parece menos "robótico" que o `inOut` simétrico de antes.
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || cancelado) return;
        // Espelha o corpo já virado pro próximo lado, mas só DEPOIS de
        // uma pausinha — como se o Broto "pensasse" antes de voltar.
        viradoParaEsquerda.setValue(proximoSentido);
        const pausaMs = 150 + Math.random() * 150;
        Animated.delay(pausaMs).start(({ finished: pausaTerminou }) => {
          if (!pausaTerminou || cancelado) return;
          andarUmaPerna(-destino, -proximoSentido);
        });
      });
    }
    andarUmaPerna(DISTANCIA_PASSEIO, -1);

    const passinhos = Animated.loop(
      Animated.sequence([
        Animated.timing(passinho, {
          toValue: -3,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(passinho, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    passinhos.start();

    return () => {
      cancelado = true;
      passinhos.stop();
    };
  }, [posicaoX, viradoParaEsquerda, passinho, reduzirMovimento]);

  return (
    <Animated.View
      style={[
        styles.brotinhoContainer,
        {
          transform: [
            { translateX: posicaoX },
            { translateY: passinho },
            { scaleX: viradoParaEsquerda },
          ],
        },
      ]}
    >
      <View style={styles.brotinhoFolhaEsquerda}>
        <Folha />
      </View>
      <View style={styles.brotinhoFolhaDireita}>
        <Folha espelhada />
      </View>
      <Animated.View style={[styles.brotinhoCorpo, { transform: [{ scaleY: escalaCorpo }] }]}>
        <View style={styles.brotinhoOlhos}>
          <View style={styles.brotinhoOlho} />
          <View style={styles.brotinhoOlho} />
        </View>
      </Animated.View>
      <View style={[styles.brotinhoBraco, styles.brotinhoBracoEsquerdo]} />
      <View style={[styles.brotinhoBraco, styles.brotinhoBracoDireito]} />
    </Animated.View>
  );
}

// Fundo de céu bem discreto (opacidade baixa) — pensado pra ficar atrás do
// título/saldo/botões, sem competir com eles. `pointerEvents="none"`
// garante que essa camada nunca "rouba" um toque que era pra ir num botão
// desenhado por cima dela.
export function CenaCeu({
  style,
  reduzirMovimento = false,
}: {
  style?: object;
  reduzirMovimento?: boolean;
}) {
  return (
    <View {...DECORATIVO} style={[styles.ceuContainer, style]} pointerEvents="none">
      <LinearGradient
        colors={[colors.cenaCeuTopo, colors.cenaCeuBase]}
        style={StyleSheet.absoluteFill}
      />
      {/* `left: 0` fixo — a posição horizontal de verdade agora vem inteira
          da animação (`translateX`), começando fora da tela à esquerda.
          `top` em pixel fixo (não porcentagem) de propósito: esse `View` de
          céu se estica pra cobrir cabeçalho + extrato inteiro (pra dar a
          sensação de "céu vai até onde a página vai" — ver DashboardScreen),
          que pode ficar bem alto com muita transação lançada. Se as nuvens
          usassem "top: 38%"/"68%" desse total, cairiam bem lá embaixo,
          escondidas atrás do cartão de menu e da lista — só a de cima
          (`top: 12`, já fixa) aparecia de verdade. Com pixel fixo, todas
          ficam dentro da faixa de céu aberto ANTES do cartão de menu, onde
          dá pra ver de verdade. */}
      <Nuvem
        style={{ top: 12, left: 0 }}
        escala={1}
        duracaoMs={40000}
        reduzirMovimento={reduzirMovimento}
      />
      <Nuvem
        style={{ top: 60, left: 0 }}
        escala={0.6}
        duracaoMs={30000}
        atrasoInicialMs={4000}
        reduzirMovimento={reduzirMovimento}
      />
      <Nuvem
        style={{ top: 130, left: 0 }}
        escala={0.8}
        duracaoMs={46000}
        atrasoInicialMs={14000}
        reduzirMovimento={reduzirMovimento}
      />
      <Nuvem
        style={{ top: 195, left: 0 }}
        escala={0.5}
        duracaoMs={36000}
        atrasoInicialMs={22000}
        reduzirMovimento={reduzirMovimento}
      />
    </View>
  );
}

// Brilho de continuidade pras telas "de leitura" (Simulador, Resumo,
// Categorias, Backup) — NÃO é a cena completa (sem nuvem, sem chão, sem
// canto de jogo): essas telas têm gráfico/tabela/lista pra ler com calma,
// a cena inteira ia competir com o dado em vez de só dar um clima. É só um
// brilho azul bem sutil no topo da tela, esmaecendo até virar transparente,
// pra lembrar a mesma paleta do Dashboard sem repetir o cenário inteiro.
export function BrilhoCeu({ style }: { style?: object }) {
  return (
    <LinearGradient
      {...DECORATIVO}
      colors={['rgba(94, 200, 242, 0.16)', 'rgba(94, 200, 242, 0)']}
      style={[styles.brilhoCeu, style]}
      pointerEvents="none"
    />
  );
}

// Faixa de chão com grama, cor cheia (sem transparência nenhuma) — o
// contraste de "discreto lá em cima, vivo aqui embaixo" é de propósito. Os
// canos que existiam aqui antes saíram (não ficaram legais visualmente);
// no lugar, o Brotinho (mascote do app) caminha de um lado pro outro —
// mais alinhado com a identidade do app do que um cenário genérico de
// plataforma.
//
// `alturaExtra` é o `insets.bottom` do aparelho (área da barrinha de
// gestos do iPhone) — soma na altura da faixa pra a terra continuar até a
// borda de VERDADE da tela, sem sobrar um respiro da cor de fundo normal
// embaixo dela. Quem não passa nada (`alturaExtra` default 0) continua
// funcionando igual antes.
export function CenaChao({
  alturaExtra = 0,
  reduzirMovimento = false,
}: {
  alturaExtra?: number;
  reduzirMovimento?: boolean;
}) {
  return (
    <View {...DECORATIVO} style={[styles.chaoContainer, { height: ALTURA_FAIXA_CHAO + alturaExtra }]}>
      <View style={styles.grama} />
      <Brotinho reduzirMovimento={reduzirMovimento} />
    </View>
  );
}

// Menor ainda que a versão anterior (era 96, depois 64) — o Brotinho agora
// fica em pé sobre a grama (fora do bloco de terra, ver `brotinhoContainer`
// acima), não precisa mais de espaço vertical reservado dentro da terra
// pra ele "caber" — sobrou só o necessário pra continuar parecendo um
// bloco de chão de verdade, não uma linha fina.
const ALTURA_FAIXA_CHAO = 40;

const styles = StyleSheet.create({
  ceuContainer: {
    opacity: 0.4,
  },
  brilhoCeu: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  nuvemContainer: {
    position: 'absolute',
    width: 64,
    height: 30,
  },
  nuvemBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.cenaNuvem,
  },
  nuvemBolhaEsquerda: {
    position: 'absolute',
    top: 0,
    left: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cenaNuvem,
  },
  nuvemBolhaDireita: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.cenaNuvem,
  },
  // Container centralizado no meio do chão — o passeio (`translateX`) anda
  // pra ambos os lados a partir desse centro, então o container em si só
  // precisa ficar parado bem no meio horizontalmente. `top` negativo (não
  // `bottom`) de propósito: o corpo precisa ficar em pé EM CIMA da faixa
  // verde de grama (que é sempre o topo do chão, ver `grama` abaixo), não
  // enterrado dentro da terra marrom — por isso ele sobe pra fora do
  // container, sobrepondo a grama por baixo. `top` (em vez de `bottom`)
  // também garante que ele fique sempre na mesma altura em relação à
  // grama, não importa quanto `alturaExtra` deixe o chão mais alto.
  brotinhoContainer: {
    position: 'absolute',
    top: -32,
    left: '50%',
    marginLeft: -16,
    width: 32,
    alignItems: 'center',
  },
  // Caule fino e alto (não mais uma bolinha) — mais perto da proporção de
  // um broto de verdade: bem mais alto que largo.
  brotinhoCorpo: {
    width: 16,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.cenaGrama,
    borderWidth: 2,
    borderColor: colors.cenaGramaEscura,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 9,
  },
  brotinhoOlhos: {
    flexDirection: 'row',
    gap: 4,
  },
  // Tracinho vertical (não mais bolinha) — olhar mais simples/quieto.
  brotinhoOlho: {
    width: 2,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.text,
  },
  // Bracinhos finos rente ao caule (bem mais perto do corpo que antes, e
  // com um ângulo bem mais suave) — mesma cor/borda do corpo, pra ler como
  // a mesma "planta", não uma peça separada.
  brotinhoBraco: {
    position: 'absolute',
    top: 18,
    width: 5,
    height: 13,
    borderRadius: 3,
    backgroundColor: colors.cenaGrama,
    borderWidth: 2,
    borderColor: colors.cenaGramaEscura,
  },
  brotinhoBracoEsquerdo: {
    left: 0,
    transform: [{ rotate: '12deg' }],
  },
  brotinhoBracoDireito: {
    right: 0,
    transform: [{ rotate: '-12deg' }],
  },
  // As duas folhas (ver `Folha`) em leque no topo do caule, uma pra cada
  // lado — cada `View` aqui só posiciona/gira o desenho SVG que vive
  // dentro dela. Ângulo mais aberto que os braços de propósito — é isso
  // que dá a sensação de "caída pros lados", não só "em pé".
  brotinhoFolhaEsquerda: {
    position: 'absolute',
    top: -15,
    left: -1,
    transform: [{ rotate: '-32deg' }],
  },
  brotinhoFolhaDireita: {
    position: 'absolute',
    top: -15,
    right: -1,
    transform: [{ rotate: '32deg' }],
  },
  chaoContainer: {
    height: ALTURA_FAIXA_CHAO,
    // Sem `marginTop` aqui — o respiro antes do chão agora mora DENTRO do
    // `mundo` (ver `listaContainer.paddingBottom` em DashboardScreen.tsx),
    // não como margem do próprio `CenaChao`. Isso é o que deixa o céu
    // cobrir esse respiro também (em vez de sobrar uma faixa da cor de
    // fundo normal entre o extrato e a grama) — o espaço em si continua do
    // mesmo tamanho, só mudou de dono.
    backgroundColor: colors.cenaTerra,
    // Sem `overflow: hidden` agora de propósito: o Brotinho fica em pé
    // sobre a grama com a maior parte do corpo/folhas ACIMA do topo desse
    // bloco (ver `brotinhoContainer`, `top` negativo) — cortar overflow
    // esconderia justamente a parte que faz ele parecer "em cima", não
    // "dentro" do chão.
  },
  grama: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: colors.cenaGrama,
    borderBottomWidth: 3,
    borderBottomColor: colors.cenaGramaEscura,
  },
});
