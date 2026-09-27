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
  frequencia: text('frequencia', { enum: ['unica', 'mensal', 'anual'] }).notNull(),
  dataFim: text('data_fim'),
});

export const simulacoes = sqliteTable('simulacoes', {
  id: text('id').primaryKey(),
  descricao: text('descricao').notNull(),
  // `.default('compra')` preserva o comportamento de toda simulação
  // cadastrada antes desse campo existir (só existia "compra" na época).
  // 'rendimento' e 'aposentadoria' foram adicionados depois de 'economia'
  // sem precisar de migration nenhuma: essa coluna já era TEXT puro
  // (SQLite não tem constraint de enum de verdade, ver comentário em
  // `categorias` acima) — ampliar esse array só afeta o TypeScript, não o
  // banco.
  tipo: text('tipo', { enum: ['compra', 'economia', 'rendimento', 'aposentadoria'] })
    .notNull()
    .default('compra'),
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
  // Só usado por 'rendimento'/'aposentadoria': um valor guardado à parte
  // (ex: dinheiro que a pessoa já tem aplicado em outro lugar), que entra
  // na conta de juros compostos junto dos aportes mensais, mas não é um
  // aporte recorrente — mesmo `.default(0)` de sempre, preserva o
  // comportamento de antes desse campo existir (nenhum investimento
  // inicial) tanto pra simulações antigas quanto pra 'compra'/'economia'
  // (que nunca usam esse campo).
  aporteInicial: real('aporte_inicial').notNull().default(0),
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

// Insert-only, mesmo padrão de saldosIniciais/metasReserva: cada linha é "o
// usuário desbloqueou essa conquista nesse momento". Sem FK (a conquista não
// referencia nada) e sem índice único em `chave` — o código já garante não
// desbloquear a mesma conquista duas vezes antes de inserir (ver
// useConquistasStore.ts), mesma filosofia de `resolverOuCriarCategoria`, que
// também checa antes de inserir em vez de confiar numa constraint do banco.
// Fica de fora do backup/restauração de propósito (ver backup.ts): é só um
// registro de "já comemoramos essa" — inteiramente RE-DERIVÁVEL a qualquer
// momento a partir de transacoes/simulacoes (ver logic/conquistas.ts), então
// não é dado que precise ser preservado com o mesmo cuidado do dinheiro real.
export const conquistasDesbloqueadas = sqliteTable('conquistas_desbloqueadas', {
  id: text('id').primaryKey(),
  chave: text('chave').notNull(),
  desbloqueadaEm: text('desbloqueada_em').notNull(),
});

// Diferente de tudo acima: é o ÚNICO lugar do banco que NÃO é insert-only —
// preferência de app (não dado financeiro) não precisa de histórico, é só
// "o estado atual". Sempre uma linha só, com `id` fixo (ver
// `ID_CONFIGURACOES` em useConfiguracoesStore.ts) — a store faz upsert
// (insere na primeira vez, atualiza depois) em vez de inserir de novo a
// cada mudança.
export const configuracoes = sqliteTable('configuracoes', {
  id: text('id').primaryKey(),
  // Liga/desliga as animações contínuas (nuvens, Brotinho andando) —
  // complementa (não substitui) o "Reduzir Movimento" do sistema
  // operacional: o app respeita os dois, ver useReduzirMovimento.ts.
  reduzirAnimacoes: integer('reduzir_animacoes', { mode: 'boolean' }).notNull().default(false),
  // "Não mostrar esta janela novamente" no modal de avisos da Aposentadoria
  // (ver AvisoAposentadoriaModal.tsx) — precisa persistir de verdade entre
  // sessões (não é um estado só da tela), por isso mora aqui junto das
  // outras preferências, não num useState solto.
  naoMostrarAvisoAposentadoria: integer('nao_mostrar_aviso_aposentadoria', { mode: 'boolean' })
    .notNull()
    .default(false),
  // Índice (dentro de curiosidadesInvestimento.ts) da última curiosidade
  // mostrada no Dashboard — guardado só pra não repetir a mesma na próxima
  // abertura do app (ver escolherProximaCuriosidade em logic/curiosidades.ts).
  // `null` (nunca definido) é o estado de quem abre o app pela primeira vez
  // depois dessa coluna existir.
  curiosidadeIndice: integer('curiosidade_indice'),
  // "Já viu (ou pulou) o tutorial inicial?" — mesmo padrão de
  // naoMostrarAvisoAposentadoria: precisa persistir de verdade, senão o
  // tutorial reabriria sozinho toda vez que o app é aberto de novo. Ver
  // TutorialScreen.tsx e o useEffect em DashboardScreen.tsx que decide
  // quando abrir automaticamente.
  tutorialConcluido: integer('tutorial_concluido', { mode: 'boolean' }).notNull().default(false),
  // Pede Face ID/Touch ID/PIN do aparelho toda vez que o app volta pra
  // frente — decisão consciente de 2026-09-27 (ver Segundo Cérebro):
  // proteger contra "alguém pega o celular destravado e abre o app", o
  // cenário mais realista pra um app financeiro pessoal. Default `true`
  // (a pessoa já escolheu essa proteção; é opt-OUT, não opt-in) — ver
  // useBloqueioDoApp.ts pra quando o aparelho não tem nenhum código/
  // biometria configurada (nesse caso a trava simplesmente não ativa,
  // não há o que exigir).
  bloqueioAtivo: integer('bloqueio_ativo', { mode: 'boolean' }).notNull().default(true),
});

// Mesmo padrão singleton-upsert de `configuracoes` (uma linha só, id fixo)
// — é o cache das taxas públicas de referência (Selic, CDI, Tesouro
// RendA+) usadas nas simulações de Rendimento/Aposentadoria. Não é dado
// financeiro do usuário (não segue o padrão insert-only de
// `saldosIniciais`/`simulacoes`): é só "a última vez que o app buscou essas
// taxas públicas", atualizado só quando o usuário toca em "Atualizar
// taxas" (ver useTaxasReferenciaStore.ts) — nunca em segundo plano.
export const taxasReferencia = sqliteTable('taxas_referencia', {
  id: text('id').primaryKey(),
  selicMetaAnual: real('selic_meta_anual'),
  cdiAnualizadoAnual: real('cdi_anualizado_anual'),
  // JSON serializado: [{ vencimento: 'AAAA-MM-DD', taxaAnual: number }] —
  // lista variável de vencimentos do Tesouro RendA+, não vale a pena virar
  // tabela própria só pra isso.
  tesouroRendaMaisJson: text('tesouro_renda_mais_json'),
  atualizadoEm: text('atualizado_em'),
});
