// Usado só pelo botão destrutivo "Apagar todos os dados" em Configurações.
// Mesma ordem de restaurarBackup.ts (respeitando as foreign keys: quem
// referencia categoria precisa sumir antes dela) — mas sem reinserir nada
// depois, porque aqui a intenção É esvaziar o banco de verdade, não voltar
// a um estado anterior. Não mexe em `configuracoes` de propósito: é
// preferência de app (ver schema.ts), não dado financeiro do usuário — não
// faz sentido resetar o "Reduzir Movimento" da pessoa junto com o extrato.
// `conquistasDesbloqueadas` some junto: embora seja re-derivável dos
// lançamentos (ver logic/conquistas.ts), a data de "desde" já registrada
// ficaria presa a um extrato que não existe mais se não for limpa aqui.
// `metasReserva` continua na lista mesmo a feature de reserva de
// emergência tendo sido removida (ver ResumoScreen.tsx): é só pra apagar
// resíduo de instalações antigas que ainda tenham linha nessa tabela.
import { db } from './client';
import { categorias, transacoes, simulacoes, saldosIniciais, metasReserva, conquistasDesbloqueadas } from './schema';

export async function apagarTodosOsDados(): Promise<void> {
  await db.delete(transacoes);
  await db.delete(simulacoes);
  await db.delete(categorias);
  await db.delete(saldosIniciais);
  await db.delete(metasReserva);
  await db.delete(conquistasDesbloqueadas);
}
