// O Brotinho "falando" — usado nas conquistas (ConquistaDesbloqueadaModal) e
// no tutorial inicial (TutorialScreen): o personagem ao lado de um balão de
// fala com o texto. Mesmo molde "de painel de jogo" do resto do app
// (contorno grosso + base 3D + brilho no topo, ver AvisoAposentadoriaModal/
// AvisoPreenchimento), só que com uma pontinha (o "rabicho" do balão)
// apontando pro personagem — pra ficar claro que é ELE falando, não só mais
// um aviso do sistema.
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { Brotinho, type PoseBrotinho } from './Brotinho';

const ALTURA_BASE = 5;

export function BrotinhoFala({
  pose,
  tamanhoBrotinho = 72,
  titulo,
  children,
}: {
  pose: PoseBrotinho;
  tamanhoBrotinho?: number;
  titulo?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.linha}>
      <Brotinho pose={pose} size={tamanhoBrotinho} />
      <View style={styles.balaoMoldura}>
        {/* O rabicho: um quadrado girado 45°, desenhado ATRÁS do corpo do
            balão (por isso vem primeiro aqui) e deslocado pra fora da borda
            esquerda — só a pontinha escapa por baixo do balão, criando o
            "bico" que aponta pro personagem. `balaoMoldura` precisa de
            `overflow: visible` (ver estilo) pra essa pontinha não ser
            cortada; o resto do balão (cantos arredondados, brilho) continua
            recortado normalmente dentro de `balaoFace`, que fica por cima. */}
        <View style={styles.rabicho} pointerEvents="none" />
        <View style={styles.balaoBase}>
          <View style={styles.balaoFace}>
            <View style={styles.balaoBrilho} pointerEvents="none" />
            {titulo && <Text accessibilityRole="header" style={styles.titulo}>{titulo}</Text>}
            <Text style={styles.texto}>{children}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    // 'center' (não 'flex-start'): o personagem é mais alto que uma
    // mensagem curta de 1-2 linhas (ex: celebração de conquista) — alinhado
    // ao centro, o par sempre parece equilibrado, não importa se o texto é
    // curto (conquista) ou mais longo (passo do tutorial).
    alignItems: 'center',
    gap: 10,
  },
  // O balão precisa de espaço à esquerda pra caber o rabicho (que "vaza" um
  // pouco pra fora da moldura) sem cortar o contorno.
  balaoMoldura: {
    flex: 1,
    marginTop: 8,
    marginLeft: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    overflow: 'visible',
  },
  balaoBase: {
    borderRadius: 12,
    backgroundColor: colors.textMuted,
    paddingBottom: ALTURA_BASE,
    overflow: 'visible',
  },
  balaoFace: {
    position: 'relative',
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 14,
    gap: 4,
    overflow: 'hidden',
  },
  balaoBrilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  // Quadrado rotacionado 45° com a MESMA borda do resto do painel — desenhar
  // com `borderWidth` (não duas camadas sobrepostas) evita qualquer aresta
  // crua onde o quadrado encontra o balão.
  rabicho: {
    position: 'absolute',
    top: 22,
    left: -8,
    width: 16,
    height: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  titulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 13,
    color: colors.primaryDark,
  },
  texto: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.text,
  },
});
