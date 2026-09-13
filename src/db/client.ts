// Abre o arquivo de banco SQLite no dispositivo e envolve ele com o Drizzle,
// pra podermos usar `db.select()`, `db.insert()` etc. em vez de escrever SQL cru.
import { openDatabaseSync } from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// openDatabaseSync cria o arquivo 'broto.db' na primeira vez que roda, e reabre ele
// nas próximas — os dados sobrevivem entre execuções do app (diferente do que
// aconteceria se guardássemos tudo só em variável/estado).
const sqlite = openDatabaseSync('broto.db');

// Por padrão, o SQLite NÃO aplica as regras de foreign key (o `.references()`
// que colocamos em schema.ts) mesmo elas existindo na tabela — é preciso ligar
// essa checagem explicitamente por conexão. Sem essa linha, seria possível
// inserir uma transação com categoriaId de uma categoria que não existe.
sqlite.execSync('PRAGMA foreign_keys = ON;');

// Passar `{ schema }` é o que permite usar db.query.transacoes.findMany({ with: { categoria: true } })
// mais na frente — o Drizzle usa o schema pra saber como montar esses joins sozinho.
export const db = drizzle(sqlite, { schema });
