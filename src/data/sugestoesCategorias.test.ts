import {
  SUGESTOES_RECEITA,
  SUGESTOES_DESPESA,
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

test('buscar "veiculo" encontra manutenção de carro, moto e bicicleta juntas', () => {
  const resultado = buscar(SUGESTOES_DESPESA, 'veiculo');

  expect(resultado).toContain('Manutenção do carro');
  expect(resultado).toContain('Manutenção da moto');
  expect(resultado).toContain('Manutenção da bicicleta');
});

test('buscar "saude" encontra todos os tipos de gasto com saúde', () => {
  const resultado = buscar(SUGESTOES_DESPESA, 'saude');

  expect(resultado).toContain('Plano de saúde');
  expect(resultado).toContain('Dentista');
  expect(resultado).toContain('Psicólogo');
  expect(resultado.length).toBeGreaterThan(6);
});

test('buscar "abastecimento" encontra Combustível mesmo sem a palavra no nome', () => {
  const resultado = buscar(SUGESTOES_DESPESA, 'abastecimento');

  expect(resultado).toContain('Combustível');
});

test('buscar "chatgpt" encontra a categoria de assinatura de IA', () => {
  const resultado = buscar(SUGESTOES_DESPESA, 'chatgpt');

  expect(resultado).toContain('Assinatura de IA');
});

test('buscar "netflix" e "spotify" encontram tipos de streaming diferentes', () => {
  expect(buscar(SUGESTOES_DESPESA, 'netflix')).toContain('Streaming de vídeo');
  expect(buscar(SUGESTOES_DESPESA, 'spotify')).toContain('Streaming de música');
});

test('buscar "ingles" encontra aula de idiomas', () => {
  const resultado = buscar(SUGESTOES_DESPESA, 'ingles');

  expect(resultado).toContain('Aula de idiomas');
});
