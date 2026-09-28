import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme/colors';
import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';
import NovaCategoriaScreen from '../screens/NovaCategoriaScreen';
import NovaSimulacaoScreen from '../screens/NovaSimulacaoScreen';
import DetalheSimulacaoScreen from '../screens/DetalheSimulacaoScreen';
import CompararSimulacoesScreen from '../screens/CompararSimulacoesScreen';
import AtualizarSaldoScreen from '../screens/AtualizarSaldoScreen';
import CategoriasScreen from '../screens/CategoriasScreen';
import ExtratoScreen from '../screens/ExtratoScreen';
import RevisarGastosScreen from '../screens/RevisarGastosScreen';
import ResumoScreen from '../screens/ResumoScreen';
import BackupScreen from '../screens/BackupScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import TutorialScreen from '../screens/TutorialScreen';
import ConquistasScreen from '../screens/ConquistasScreen';
import type { TipoSimulacao } from '../types/models';

export type RootStackParamList = {
  Dashboard: undefined;
  Simulador: undefined;
  Categorias: undefined;
  Extrato: undefined;
  // `reducaoNecessaria`: quanto cortar, mostrado no topo da lista quando o
  // usuário chega pelo botão "rever gastos" (ver BotaoRevisarGastos). `mes`
  // ('AAAA-MM'): qual mês listar — ausente = mês atual (ver
  // RevisarGastosScreen.tsx); o card "Situação atual" do Dashboard passa o
  // mês do PIOR ponto da projeção, não necessariamente o corrente.
  RevisarGastos: { reducaoNecessaria?: number; mes?: string } | undefined;
  Resumo: undefined;
  Backup: undefined;
  Configuracoes: undefined;
  // `id` presente = editar aquele registro; ausente = criar um novo.
  // O `?` em `{ id?: string } | undefined` permite tanto navigate('NovaTransacao')
  // (sem parâmetro nenhum) quanto navigate('NovaTransacao', { id: '...' }).
  NovaTransacao: { id?: string } | undefined;
  NovaCategoria: { id?: string } | undefined;
  // `tipoSugerido`/`valorMensalSugerido`/`aporteInicialSugerido`: só usados
  // pelo aviso de sobra do Simulador (ver SimuladorScreen.tsx), pra abrir o
  // formulário de 'rendimento' já preenchido (reserva de emergência com a
  // sobra mensal, investimento inicial sugerido, Selic, 12 meses) — sempre
  // ausentes ao criar uma simulação do zero pelo "+ nova simulação".
  // (`tipoSugerido` sozinho, sem valor, só pré-seleciona o tipo — ex: o
  // convite de meta de economia do Dashboard.)
  NovaSimulacao:
    | {
        id?: string;
        tipoSugerido?: TipoSimulacao;
        valorMensalSugerido?: number;
        aporteInicialSugerido?: number;
      }
    | undefined;
  DetalheSimulacao: { id: string };
  CompararSimulacoes: undefined;
  AtualizarSaldo: undefined;
  Tutorial: undefined;
  Conquistas: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Dashboard"
        // Sem isso, o cabeçalho nativo usa o material branco/translúcido
        // padrão do sistema — que destoa da cor de fundo do resto do app
        // (creme) e fica parecendo um pedaço "não estilizado" colado em
        // cima da tela, mesmo respeitando o notch corretamente por baixo
        // dos panos. Aplicado aqui uma vez só (`screenOptions`, não em
        // cada `Stack.Screen`) pra toda tela com cabeçalho nativo herdar
        // a mesma cor — a única exceção é o Dashboard, que já é
        // `headerShown: false` de propósito (ver comentário abaixo).
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          // Mesma fonte "de jogo" do título Broto no Dashboard — antes cada
          // cabeçalho nativo usava a fonte padrão do sistema, preta/quase-
          // preta (`colors.text`), destoando completamente do resto do app
          // já gameficado (usuário reportou como "feio, fora de padrão").
          // Verde (`primaryDark`) em vez de dourado: o dourado só funciona
          // com a sombra em camadas do título do Dashboard — sozinho, num
          // texto menor, ficaria sem contraste no fundo creme.
          headerTitleStyle: { fontFamily: 'Bungee_400Regular', color: colors.primaryDark },
          headerLargeTitleStyle: { fontFamily: 'Bungee_400Regular', color: colors.primaryDark },
          headerTintColor: colors.primaryDark,
          // A linha/sombra fina que o iOS desenha embaixo do cabeçalho só
          // fazia sentido separando um branco de um branco quase-branco —
          // contra o creme do corpo ela ficava um traço escuro solto.
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          // A causa real do título pequeno parecendo "colado à esquerda"
          // (nas telas SEM headerLargeTitle — os formulários de criar/
          // editar): o botão de voltar mostra o nome da tela anterior por
          // extenso (ex: "Dashboard") — no visual novo do iOS (pílula
          // grande), isso ocupa espaço demais e empurra o título pra longe
          // do centro de verdade, mesmo com `headerTitleAlign: 'center'`.
          // 'minimal' deixa só a setinha, sem o texto — é o próprio jeito
          // que a Apple documenta pra resolver exatamente isso.
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {/* Sem cabeçalho nativo aqui de propósito: é a tela inicial (não
            precisa de botão de voltar), e o cenário gameficado quer ir até
            a borda de verdade da tela, por trás do notch — um cabeçalho
            nativo por cima reservaria uma faixa branca ali e quebraria
            esse efeito. */}
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        {/* `headerLargeTitle` é o padrão "Título Grande" do iOS (Mail,
            Ajustes, Música...) — título grande e à esquerda que encolhe
            suave quando rola a tela. Só tem efeito no iOS (Android ignora
            a opção); usado só nas telas de "navegar/ver", não nos
            formulários de criar/editar (esses continuam com título
            pequeno e centralizado, igual uma folha modal da Apple). */}
        <Stack.Screen
          name="Simulador"
          component={SimuladorScreen}
          options={{ headerLargeTitle: true }}
        />
        <Stack.Screen
          name="Categorias"
          component={CategoriasScreen}
          options={{ title: 'Categorias', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="Extrato"
          component={ExtratoScreen}
          options={{ title: 'Extrato', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="RevisarGastos"
          component={RevisarGastosScreen}
          options={{ title: 'Rever gastos', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="Resumo"
          component={ResumoScreen}
          options={{ title: 'Resumo', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="Backup"
          component={BackupScreen}
          options={{ title: 'Backup', headerLargeTitle: true }}
        />
        <Stack.Screen
          name="NovaTransacao"
          component={NovaTransacaoScreen}
          options={{ title: 'Nova transação' }}
        />
        <Stack.Screen
          name="NovaCategoria"
          component={NovaCategoriaScreen}
          options={{ title: 'Nova categoria' }}
        />
        <Stack.Screen
          name="NovaSimulacao"
          component={NovaSimulacaoScreen}
          options={{ title: 'Nova simulação' }}
        />
        {/* Título dinâmico (o nome da própria simulação) — ver
            navigation.setOptions em DetalheSimulacaoScreen.tsx. Título
            pequeno/centralizado (sem headerLargeTitle): é uma tela de
            "detalhe" de um item específico, mesma família da
            NovaTransacao, não uma tela de "navegar" tipo Simulador. */}
        <Stack.Screen name="DetalheSimulacao" component={DetalheSimulacaoScreen} />
        <Stack.Screen
          name="CompararSimulacoes"
          component={CompararSimulacoesScreen}
          options={{ title: 'Comparar simulações' }}
        />
        <Stack.Screen
          name="AtualizarSaldo"
          component={AtualizarSaldoScreen}
          options={{ title: 'Atualizar saldo' }}
        />
        <Stack.Screen
          name="Configuracoes"
          component={ConfiguracoesScreen}
          options={{ title: 'Configurações' }}
        />
        {/* Sem cabeçalho nativo (igual Dashboard) — o próprio Tutorial
            desenha seu cabeçalho (pontinhos de progresso + "Pular"), um
            cabeçalho nativo por cima seria redundante e ainda mostraria uma
            seta de voltar que não faz sentido aqui. */}
        <Stack.Screen
          name="Tutorial"
          component={TutorialScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Conquistas"
          component={ConquistasScreen}
          options={{ title: 'Conquistas', headerLargeTitle: true }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
