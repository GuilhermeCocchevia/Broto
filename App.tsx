import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './src/db/client';
import migrations from './drizzle/migrations';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // useMigrations roda as migrações SQL (criar tabelas etc.) toda vez que o app abre.
  // Se já rodaram antes, ele percebe (guarda isso numa tabela de controle interna do
  // Drizzle) e não faz nada de novo — é seguro chamar sempre, sem duplicar tabelas.
  const { success, error } = useMigrations(db, migrations);

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text>Erro ao preparar o banco de dados: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Preparando o banco de dados...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
