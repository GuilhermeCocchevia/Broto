import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';
import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Simulador: undefined;
  NovaTransacao: undefined;
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
