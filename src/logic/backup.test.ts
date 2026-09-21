import { montarBackup, lerBackup, VERSAO_BACKUP_ATUAL } from './backup';
import type { Categoria } from '../types/models';

function criarCategoria(sobrescrever: Partial<Categoria>): Categoria {
  return { id: 'cat-1', nome: 'Mercado', tipo: 'despesa', cor: '#4CAF50', ...sobrescrever };
}

test('montarBackup inclui a versão atual e todas as tabelas passadas', () => {
  const categorias = [criarCategoria({})];
  const backup = montarBackup({
    categorias,
    transacoes: [],
    simulacoes: [],
    saldosIniciais: [],
  });

  expect(backup.versao).toBe(VERSAO_BACKUP_ATUAL);
  expect(backup.categorias).toBe(categorias);
  expect(typeof backup.exportadoEm).toBe('string');
});

test('lerBackup faz o caminho de ida e volta: monta, serializa, lê de novo, dados batem', () => {
  const categorias = [criarCategoria({})];
  const backup = montarBackup({
    categorias,
    transacoes: [],
    simulacoes: [],
    saldosIniciais: [],
  });

  const resultado = lerBackup(JSON.stringify(backup));

  expect(resultado.sucesso).toBe(true);
  if (resultado.sucesso) {
    expect(resultado.backup.categorias).toEqual(categorias);
    expect(resultado.backup.versao).toBe(VERSAO_BACKUP_ATUAL);
  }
});

test('lerBackup rejeita um texto que não é JSON', () => {
  const resultado = lerBackup('isso não é json nenhum {{{');

  expect(resultado.sucesso).toBe(false);
  if (!resultado.sucesso) {
    expect(resultado.erro).toMatch(/JSON/);
  }
});

test('lerBackup rejeita um JSON que não tem o formato de backup', () => {
  const resultado = lerBackup(JSON.stringify({ qualquerCoisa: 123 }));

  expect(resultado.sucesso).toBe(false);
});

test('lerBackup rejeita uma versão de backup diferente da atual', () => {
  const backup = montarBackup({
    categorias: [],
    transacoes: [],
    simulacoes: [],
    saldosIniciais: [],
  });
  const backupComVersaoErrada = { ...backup, versao: 999 };

  const resultado = lerBackup(JSON.stringify(backupComVersaoErrada));

  expect(resultado.sucesso).toBe(false);
  if (!resultado.sucesso) {
    expect(resultado.erro).toMatch(/versão/i);
  }
});

test('lerBackup rejeita um backup com uma tabela faltando', () => {
  const backup = montarBackup({
    categorias: [],
    transacoes: [],
    simulacoes: [],
    saldosIniciais: [],
  });
  const { categorias, ...backupIncompleto } = backup;

  const resultado = lerBackup(JSON.stringify(backupIncompleto));

  expect(resultado.sucesso).toBe(false);
});
