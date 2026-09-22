import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { BrilhoCeu } from '../components/CenaGameficada';
import { BrotinhoFala } from '../components/BrotinhoFala';
import { BotaoPrimario } from '../components/BotaoPrimario';
import { colors } from '../theme/colors';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';
import type { PoseBrotinho } from '../components/Brotinho';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Passo = {
  pose: PoseBrotinho;
  titulo: string;
  texto: string;
};

// Explica as 4 peças centrais do app (lançar, simular, ajustar, evoluir) em
// vez de pedir pra pessoa já cadastrar dados de verdade — é só uma
// apresentação rápida, não um formulário disfarçado. "Pular" fica sempre
// visível: mesma cautela de "nunca pressionar o usuário" usada em toda
// feature opcional do app (reserva de emergência, meta de economia).
const PASSOS: Passo[] = [
  {
    pose: 'neutro',
    titulo: 'Oi, eu sou o Brotinho!',
    texto: 'Vou te ajudar a cuidar do seu dinheiro — sem pressa, sem susto e sem cobrança.',
  },
  {
    pose: 'neutro',
    titulo: 'Seu dia a dia',
    texto: 'No Dashboard você vê quanto tem agora e lança suas receitas e despesas.',
  },
  {
    pose: 'pensativo',
    titulo: 'Antes de decidir',
    texto: 'No Simulador você testa uma compra ou uma meta ANTES de decidir de verdade — sem gastar nada.',
  },
  {
    pose: 'pensativo',
    titulo: 'Se não couber',
    texto: 'Se uma meta não couber no seu orçamento, eu te mostro exatamente quanto cortar e onde.',
  },
  {
    pose: 'comemorando',
    titulo: 'Toda conquista conta',
    texto: 'Sempre que você criar um hábito bom, eu comemoro com você — o progresso só soma, nunca cai.',
  },
];

export default function TutorialScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const atualizarTutorialConcluido = useConfiguracoesStore((state) => state.atualizarTutorialConcluido);
  const [indice, setIndice] = useState(0);

  const passo = PASSOS[indice];
  const ehUltimo = indice === PASSOS.length - 1;

  function concluir() {
    atualizarTutorialConcluido(true);
    // Duas formas de ter chegado aqui: (1) abertura automática no app vazio
    // (DashboardScreen fez `navigation.replace('Tutorial')` — a pilha só
    // tem o Tutorial, não tem pra onde voltar) ou (2) reaberto à mão em
    // Configurações (`navigate`, empilhado por cima) — nesse caso `voltar`
    // é o certo, pra não duplicar o Dashboard na pilha.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('Dashboard');
    }
  }

  function avancar() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (ehUltimo) {
      concluir();
    } else {
      setIndice((atual) => atual + 1);
    }
  }

  function pular() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    concluir();
  }

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <View style={styles.cabecalho}>
        <View style={styles.pontos}>
          {PASSOS.map((item, i) => (
            <View key={item.titulo} style={[styles.ponto, i === indice && styles.pontoAtivo]} />
          ))}
        </View>
        <Pressable onPress={pular} hitSlop={12}>
          <Text style={styles.pular}>Pular</Text>
        </Pressable>
      </View>

      <View style={styles.corpo}>
        <BrotinhoFala pose={passo.pose} titulo={passo.titulo} tamanhoBrotinho={120}>
          {passo.texto}
        </BrotinhoFala>
      </View>

      <View style={styles.rodape}>
        <BotaoPrimario label={ehUltimo ? 'Vamos começar!' : 'Próximo'} onPress={avancar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pontos: {
    flexDirection: 'row',
    gap: 6,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    // `primaryLight` tem quase o mesmo brilho do fundo creme (baixo
    // contraste, os pontinhos "sumiam") — uma sombra bem leve da cor do
    // texto contrasta em qualquer fundo do app.
    backgroundColor: 'rgba(62, 39, 35, 0.18)',
  },
  pontoAtivo: {
    backgroundColor: colors.primary,
    width: 20,
  },
  pular: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  corpo: {
    flex: 1,
    justifyContent: 'center',
  },
  rodape: {
    width: '100%',
  },
});
