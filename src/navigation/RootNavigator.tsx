import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';
import NovaCategoriaScreen from '../screens/NovaCategoriaScreen';
import NovaSimulacaoScreen from '../screens/NovaSimulacaoScreen';
import AtualizarSaldoScreen from '../screens/AtualizarSaldoScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Simulador: undefined;
  NovaTransacao: undefined;
  NovaCategoria: undefined;
  NovaSimulacao: undefined;
  AtualizarSaldo: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Simulador" component={SimuladorScreen} />
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
        <Stack.Screen
          name="AtualizarSaldo"
          component={AtualizarSaldoScreen}
          options={{ title: 'Atualizar saldo' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
