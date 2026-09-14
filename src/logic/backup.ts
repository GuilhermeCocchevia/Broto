// Lógica pura do backup: monta o objeto que vira o arquivo exportado, e lê
// de volta um arquivo importado validando que ele faz sentido. Não toca em
// arquivo nem em banco aqui — só formato de dado, por isso é fácil de testar
// isolado (ver backup.test.ts). Quem escreve/lê o arquivo de verdade e quem
// grava no banco fica em telas/db, que dependem do dispositivo de verdade.
import type { Categoria, Transacao, Simulacao, SaldoInicial } from '../types/models';

// Número da versão do FORMATO do backup (não da versão do app). Se um dia o
// formato precisar mudar de forma incompatível (ex: renomear um campo), essa
// versão sobe e `lerBackup` pode decidir como migrar ou recusar arquivos
// antigos — sem isso, um backup de uma versão futura ou muito antiga do app
// podia ser lido errado silenciosamente.
export const VERSAO_BACKUP_ATUAL = 1;

export type Backup = {
  versao: number;
  // Data em que o backup foi gerado — não é usada por nenhum cálculo, é só
  // informativo (ex: mostrar "backup de 14/09/2026" pro usuário antes de
  // confirmar a importação).
  exportadoEm: string;
  categorias: Categoria[];
  transacoes: Transacao[];
  simulacoes: Simulacao[];
  saldosIniciais: SaldoInicial[];
};

// Monta o backup a partir do estado atual das 4 tabelas. `exportadoEm` e
// `versao` são decididos aqui, não por quem chama — mesma ideia de
// `criadoEm` nas stores: é sempre "agora" e "a versão atual do app", não uma
// escolha da tela.
export function montarBackup(dados: {
  categorias: Categoria[];
  transacoes: Transacao[];
  simulacoes: Simulacao[];
  saldosIniciais: SaldoInicial[];
}): Backup {
  return {
    versao: VERSAO_BACKUP_ATUAL,
    exportadoEm: new Date().toISOString(),
    ...dados,
  };
}

// Resultado de tentar ler um arquivo de backup: ou deu certo e vem o backup
// já validado, ou deu errado e vem uma mensagem que dá pra mostrar direto pro
// usuário (não é um erro técnico cru).
export type ResultadoLeituraBackup = { sucesso: true; backup: Backup } | { sucesso: false; erro: string };

// Lê o TEXTO de um arquivo (já lido do disco por quem chamou) e valida se é
// um backup de verdade antes de confiar nele. Importar um arquivo qualquer
// (ou de uma versão incompatível) não pode quebrar o app silenciosamente —
// por isso cada checagem tem uma mensagem específica, em vez de um `try/catch`
// genérico só.
export function lerBackup(texto: string): ResultadoLeituraBackup {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return { sucesso: false, erro: 'Esse arquivo não é um backup válido (não é um JSON legível).' };
  }

  if (typeof json !== 'object' || json === null) {
    return { sucesso: false, erro: 'Esse arquivo não é um backup válido.' };
  }

  const possivelBackup = json as Partial<Backup>;

  if (possivelBackup.versao !== VERSAO_BACKUP_ATUAL) {
    return {
      sucesso: false,
      erro: `Esse backup é de uma versão do app que este aparelho não reconhece (versão ${String(possivelBackup.versao)}).`,
    };
  }

  if (
    !Array.isArray(possivelBackup.categorias) ||
    !Array.isArray(possivelBackup.transacoes) ||
    !Array.isArray(possivelBackup.simulacoes) ||
    !Array.isArray(possivelBackup.saldosIniciais)
  ) {
    return { sucesso: false, erro: 'Esse arquivo não é um backup válido (faltam dados esperados).' };
  }

  return {
    sucesso: true,
    backup: {
      versao: possivelBackup.versao,
      exportadoEm: possivelBackup.exportadoEm ?? '',
      categorias: possivelBackup.categorias,
      transacoes: possivelBackup.transacoes,
      simulacoes: possivelBackup.simulacoes,
      saldosIniciais: possivelBackup.saldosIniciais,
    },
  };
}
