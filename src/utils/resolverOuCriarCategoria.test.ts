import { escolherCorAutomatica, encontrarCategoriaPorNome } from './resolverOuCriarCategoria';
import type { Categoria } from '../types/models';

function criarCategoria(sobrescrever: Partial<Categoria>): Categoria {
  return { id: 'categoria-teste', nome: 'Categoria', tipo: 'despesa', cor: '#000000', ...sobrescrever };
}

test('escolherCorAutomatica gira pela paleta sem repetir a cor seguinte', () => {
  const cor0 = escolherCorAutomatica(0);
  const cor1 = escolherCorAutomatica(1);
  expect(cor0).not.toBe(cor1);
});

test('escolherCorAutomatica repete a cor depois de dar a volta na paleta', () => {
  // A paleta tem 7 cores — a 0ª e a 7ª devem coincidir.
  expect(escolherCorAutomatica(0)).toBe(escolherCorAutomatica(7));
});

test('encontrarCategoriaPorNome encontra ignorando acento e maiúsculo/minúsculo', () => {
  const categorias = [criarCategoria({ nome: 'Alimentação', tipo: 'despesa' })];

  expect(encontrarCategoriaPorNome(categorias, 'alimentacao', 'despesa')).not.toBeNull();
  expect(encontrarCategoriaPorNome(categorias, 'ALIMENTAÇÃO', 'despesa')).not.toBeNull();
});

test('encontrarCategoriaPorNome não confunde categorias de tipos diferentes com o mesmo nome', () => {
  const categorias = [
    criarCategoria({ id: '1', nome: 'Aluguel', tipo: 'receita' }),
    criarCategoria({ id: '2', nome: 'Aluguel', tipo: 'despesa' }),
  ];

  expect(encontrarCategoriaPorNome(categorias, 'Aluguel', 'receita')?.id).toBe('1');
  expect(encontrarCategoriaPorNome(categorias, 'Aluguel', 'despesa')?.id).toBe('2');
});

test('encontrarCategoriaPorNome devolve null quando não existe nenhuma correspondente', () => {
  expect(encontrarCategoriaPorNome([], 'Qualquer coisa', 'despesa')).toBeNull();
});
