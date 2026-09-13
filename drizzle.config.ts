// Config do drizzle-kit — a ferramenta de linha de comando que lê src/db/schema.ts
// e gera os arquivos .sql de migração (as instruções CREATE TABLE de verdade).
// Isso roda só no seu computador (via `npx drizzle-kit generate`), nunca no celular.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  // driver 'expo' muda o formato de saída pra um jeito que dá pra importar
  // direto no app via metro bundler (ver src/db/migrations.ts).
  driver: 'expo',
});
