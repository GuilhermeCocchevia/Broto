import {
  SUGESTOES_RECEITA,
  textoBuscavelDaSugestao,
  type SugestaoCategoria,
} from './sugestoesCategorias';
import { normalizarTexto } from '../utils/normalizarTexto';

// Mesma lógica de filtro usada em NovaCategoriaScreen.tsx, isolada aqui pra
// testar sem precisar montar a tela inteira.
function buscar(lista: SugestaoCategoria[], texto: string): string[] {
  const buscaNormalizada = normalizarTexto(texto);
  return lista
    .filter((sugestao) => normalizarTexto(textoBuscavelDaSugestao(sugestao)).includes(buscaNormalizada))
    .map((sugestao) => sugestao.nome);
}

test('buscar "inss" encontra sugestões que não têm "INSS" escrito no nome', () => {
  const resultado = buscar(SUGESTOES_RECEITA, 'inss');

  expect(resultado).toContain('Aposentadoria por invalidez');
  expect(resultado).toContain('Auxílio-doença');
  expect(resultado.length).toBeGreaterThan(3);
});

test('buscar "beneficio" junta vários tipos de benefício numa lista só', () => {
  const resultado = buscar(SUGESTOES_RECEITA, 'beneficio');

  expect(resultado).toContain('Bolsa Família');
  expect(resultado).toContain('BPC/LOAS');
  expect(resultado).toContain('Pensão de militar');
  expect(resultado.length).toBeGreaterThan(5);
});

test('buscar "pensao" encontra todos os tipos de pensão', () => {
  const resultado = buscar(SUGESTOES_RECEITA, 'pensao');

  expect(resultado).toContain('Pensão alimentícia');
  expect(resultado).toContain('Pensão de militar');
  expect(resultado).toContain('Pensão por morte (INSS)');
});
