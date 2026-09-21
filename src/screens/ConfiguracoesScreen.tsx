import { useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { BrilhoCeu } from '../components/CenaGameficada';
import { colors } from '../theme/colors';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { apagarTodosOsDados } from '../db/apagarTodosOsDados';
import type { RootStackParamList } from '../navigation/RootNavigator';
import appJson from '../../app.json';

// Tela alcançada pela engrenagem sutil do Dashboard — separada do menu de
// jogo de propósito: aqui é manutenção/acessibilidade/privacidade, não uma
// ação do dia a dia, então segue um estilo mais "de Ajustes" (cartões
// neutros, sem cor viva) em vez do menu colorido gameficado.
export default function ConfiguracoesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const reduzirAnimacoes = useConfiguracoesStore((state) => state.reduzirAnimacoes);
  const atualizarReduzirAnimacoes = useConfiguracoesStore(
    (state) => state.atualizarReduzirAnimacoes,
  );
  const carregarConfiguracoes = useConfiguracoesStore((state) => state.carregar);

  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);

  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

  function confirmarApagarTudo() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Mesmo padrão de confirmação destrutiva usado em Backup (restaurar) —
    // texto explícito do alcance real (dados financeiros, não a
    // preferência de acessibilidade) e sem desfazer.
    Alert.alert(
      'Apagar todos os dados',
      'Isso vai apagar TODAS as suas transações, categorias, simulações e atualizações de saldo deste aparelho. Essa ação não pode ser desfeita. Considere fazer um backup antes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar tudo',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await apagarTodosOsDados();
            await Promise.all([
              carregarCategorias(),
              carregarTransacoes(),
              carregarSimulacoes(),
              carregarSaldoInicial(),
            ]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  }

  return (
    <View style={styles.wrapper}>
      <BrilhoCeu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.conteudo}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Acessibilidade</Text>
          <View style={styles.linhaSwitch}>
            <View style={styles.linhaSwitchTexto}>
              <Text style={styles.itemTitulo}>Reduzir animações</Text>
              <Text style={styles.itemDescricao}>
                Para as nuvens e o Brotinho de andar na tela inicial. Se o seu aparelho já tem
                "Reduzir Movimento" ativado nos Ajustes do sistema, as animações já ficam
                paradas automaticamente, mesmo com esse interruptor desligado.
              </Text>
            </View>
            <Switch
              value={reduzirAnimacoes}
              onValueChange={(valor) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                atualizarReduzirAnimacoes(valor);
              }}
              trackColor={{ false: '#D9D0C6', true: colors.primary }}
            />
          </View>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Privacidade</Text>
          <Text style={styles.itemDescricao}>
            O AppBroto não tem login, não envia nada pra nenhum servidor e não usa nenhum tipo de
            rastreamento. Todos os seus dados (transações, categorias, simulações) ficam só neste
            aparelho, guardados localmente. A única forma de tirar dados daqui é você mesmo
            exportando um backup, na tela de Backup.
          </Text>
          <Text style={styles.itemDescricao}>
            Única exceção: nas simulações de Rendimento e Aposentadoria, se você tocar em
            "Atualizar" nas taxas de referência, o app busca — só nesse momento, nunca sozinho —
            taxas públicas (Selic e CDI do Banco Central, taxas do Tesouro Direto do Tesouro
            Nacional). Nenhum dado seu é enviado nesse processo: só números públicos são
            recebidos.
          </Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Dados e conta</Text>
          <Text style={styles.itemDescricao}>
            Como não existe login nem nuvem, "sua conta" é o próprio aparelho. Exporte um backup de
            vez em quando pra não depender só deste aparelho.
          </Text>
          <Pressable
            style={styles.botaoLinha}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Backup');
            }}
          >
            <Text style={styles.botaoLinhaTexto}>Ir para Backup</Text>
          </Pressable>
          <Pressable style={styles.botaoLinha} onPress={confirmarApagarTudo}>
            <Text style={styles.botaoLinhaTextoPerigo}>Apagar todos os dados</Text>
          </Pressable>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Sobre</Text>
          <Text style={styles.itemDescricao}>
            {appJson.expo.name} · versão {appJson.expo.version}
          </Text>
        </View>
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
    paddingTop: 16,
    gap: 16,
  },
  secao: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  linhaSwitchTexto: {
    flex: 1,
    gap: 4,
  },
  itemTitulo: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  itemDescricao: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
  botaoLinha: {
    paddingVertical: 10,
  },
  botaoLinhaTexto: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  botaoLinhaTextoPerigo: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
