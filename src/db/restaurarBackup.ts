// Grava um Backup (já validado por lerBackup, ver src/logic/backup.ts) de
// volta no banco. Fica em src/db/ (não em src/logic/) porque, diferente do
// resto da lógica de backup, isso TOCA no banco de verdade — não dá pra
// testar com Jest puro, só ao vivo no simulador/aparelho.
import { db } from './client';
import { categorias, transacoes, simulacoes, saldosIniciais, metasReserva } from './schema';
import type { Backup } from '../logic/backup';

// Restaurar SUBSTITUI tudo que existe hoje pelo conteúdo do backup — não
// tenta misturar (merge) com o que já está no aparelho. Decisão consciente:
// merge de verdade precisaria resolver conflito (o mesmo id existe dos dois
// lados com dados diferentes?), e isso é a mesma complexidade de sincronização
// automática que decidimos não fazer agora (ver conversa sobre backup manual
// vs. login em nuvem). "Restaurar" aqui significa "voltar pro estado exato
// de quando esse arquivo foi exportado", como restaurar um backup de
// qualquer app de verdade.
//
// Os ids originais são preservados (não passamos por `store.adicionar`, que
// sempre gera um id novo) porque `transacoes.categoriaId` e
// `simulacoes.categoriaId` apontam pro id exato da categoria no backup — sem
// preservar o id, essas referências quebrariam.
export async function restaurarBackup(backup: Backup): Promise<void> {
  // Apaga na ordem que respeita as foreign keys: quem referencia categoria
  // (transações, simulações) precisa sumir antes da própria categoria.
  await db.delete(transacoes);
  await db.delete(simulacoes);
  await db.delete(categorias);
  await db.delete(saldosIniciais);
  await db.delete(metasReserva);

  // E insere na ordem inversa: categoria (e saldo, que não depende de nada)
  // primeiro, quem referencia categoria depois — senão o PRAGMA foreign_keys
  // recusaria inserir uma transação apontando pra uma categoria que ainda
  // não existe. `.length > 0` evita um INSERT vazio, que o Drizzle rejeita.
  if (backup.categorias.length > 0) {
    await db.insert(categorias).values(backup.categorias);
  }
  if (backup.saldosIniciais.length > 0) {
    await db.insert(saldosIniciais).values(backup.saldosIniciais);
  }
  if (backup.transacoes.length > 0) {
    await db.insert(transacoes).values(backup.transacoes);
  }
  if (backup.simulacoes.length > 0) {
    await db.insert(simulacoes).values(backup.simulacoes);
  }
  if (backup.metasReserva.length > 0) {
    await db.insert(metasReserva).values(backup.metasReserva);
  }
}
