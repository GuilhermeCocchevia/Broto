// Usado só pelo botão destrutivo "Apagar todos os dados" em Configurações.
// Mesma ordem de restaurarBackup.ts (respeitando as foreign keys: quem
// referencia categoria precisa sumir antes dela) — mas sem reinserir nada
// depois, porque aqui a intenção É esvaziar o banco de verdade, não voltar
// a um estado anterior. Não mexe em `configuracoes` de propósito: é
// preferência de app (ver schema.ts), não dado financeiro do usuário — não
// faz sentido resetar o "Reduzir Movimento" da pessoa junto com o extrato.
import { db } from './client';
import { categorias, transacoes, simulacoes, saldosIniciais, metasReserva } from './schema';

export async function apagarTodosOsDados(): Promise<void> {
  await db.delete(transacoes);
  await db.delete(simulacoes);
  await db.delete(categorias);
  await db.delete(saldosIniciais);
  await db.delete(metasReserva);
}
