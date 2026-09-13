import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import SimuladorScreen from '../screens/SimuladorScreen';

export type RootStackParamList = {
  Dashboard: undefined;
  Simulador: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Dashboard">
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Simulador" component={SimuladorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
