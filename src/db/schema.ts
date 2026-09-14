// Schema do banco SQLite, escrito com Drizzle ORM.
// Isto é código TypeScript, mas o Drizzle usa ele pra GERAR as tabelas SQL de verdade
// (via `drizzle-kit generate`, que criamos depois). Repare que os campos espelham
// ../types/models.ts — aqui é "como isso vira tabela", lá era "como isso aparece no app".

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// sqliteTable(nome_da_tabela_no_banco, { colunas }).
// Cada coluna diz o tipo SQL (text, integer, real) e o nome real da coluna no banco
// como primeiro argumento — por convenção, banco usa snake_case (categoria_id) mesmo
// a propriedade JS sendo camelCase (categoriaId). O Drizzle faz essa ponte sozinho.
export const categorias = sqliteTable('categorias', {
  id: text('id').primaryKey(),
  nome: text('nome').notNull(),
  // `{ enum: [...] }` aqui NÃO cria uma restrição no banco (SQLite não tem tipo enum;
  // a coluna continua sendo TEXT puro). É só o Drizzle avisando o TypeScript qual é o
  // tipo do campo, pra você ganhar autocomplete e erro de compilação se digitar errado.
  // Se quiser barrar valor inválido de verdade, isso é feito na validação da store, não aqui.
  tipo: text('tipo', { enum: ['receita', 'despesa'] }).notNull(),
  cor: text('cor').notNull(),
});

export const transacoes = sqliteTable('transacoes', {
  id: text('id').primaryKey(),
  descricao: text('descricao').notNull(),
  // `real` = número de ponto flutuante no SQLite. Dinheiro em float pode gerar erro de
  // arredondamento (ex: 0.1 + 0.2 não dá exatamente 0.3) — pra um app financeiro sério
  // o ideal seria guardar em centavos (integer), mas por ora `real` já resolve.
  valor: real('valor').notNull(),
  data: text('data').notNull(),
  tipo: text('tipo', { enum: ['receita', 'despesa'] }).notNull(),
  // .references() cria uma foreign key: garante que categoriaId sempre aponta pra um
  // id que existe de verdade na tabela categorias. O banco recusa inserir uma
  // transação com categoria inexistente.
  categoriaId: text('categoria_id')
    .notNull()
    .references(() => categorias.id),
  frequencia: text('frequencia', { enum: ['unica', 'mensal'] }).notNull(),
  dataFim: text('data_fim'),
});

export const simulacoes = sqliteTable('simulacoes', {
  id: text('id').primaryKey(),
  descricao: text('descricao').notNull(),
  valorTotal: real('valor_total').notNull(),
  // `integer` mesmo — número de parcelas é sempre inteiro (não existe 3,5 parcelas).
  parcelas: integer('parcelas').notNull(),
  dataInicio: text('data_inicio').notNull(),
  categoriaId: text('categoria_id')
    .notNull()
    .references(() => categorias.id),
  // `.default(0)` faz duas coisas: em INSERTs novos que não passarem esse
  // campo, vira 0 sozinho; e na migration que ADICIONA essa coluna numa
  // tabela que já existe, toda simulação antiga também vira 0 (sem juros) —
  // preserva o comportamento de antes desse campo existir.
  taxaJurosMensal: real('taxa_juros_mensal').notNull().default(0),
  criadoEm: text('criado_em').notNull(),
});

// Sem FK, sem campos extras — cada linha é só "em tal momento, eu tinha esse
// valor". A store nunca faz UPDATE aqui, só INSERT; ler "o saldo atual" é
// sempre pegar a linha com o criadoEm mais recente.
export const saldosIniciais = sqliteTable('saldos_iniciais', {
  id: text('id').primaryKey(),
  valor: real('valor').notNull(),
  criadoEm: text('criado_em').notNull(),
});

// Mesmo padrão insert-only de saldosIniciais. `integer('ativa', { mode:
// 'boolean' })` é como o Drizzle guarda um boolean no SQLite — a coluna vira
// INTEGER (0 ou 1) por baixo, mas o TypeScript continua vendo `boolean`.
export const metasReserva = sqliteTable('metas_reserva', {
  id: text('id').primaryKey(),
  ativa: integer('ativa', { mode: 'boolean' }).notNull(),
  valorAlvo: real('valor_alvo'),
  criadoEm: text('criado_em').notNull(),
});
