import { normalizarTexto } from './normalizarTexto';
import { colors } from '../theme/colors';
import type { Categoria, TipoTransacao } from '../types/models';

// Mesma paleta usada na tela de criar categoria manualmente — repetida aqui
// de propósito (é só uma lista de 7 cores, não vale criar um módulo
// compartilhado só pra isso ainda).
const PALETA_CORES = [
  colors.primary,
  colors.primaryDark,
  colors.secondary,
  colors.accent,
  colors.success,
  colors.danger,
  colors.warning,
];

// Escolhe uma cor pra uma categoria criada automaticamente, girando pela
// paleta conforme quantas categorias já existem — assim a 1ª, a 8ª e a 15ª
// categoria acabam com a mesma cor (a paleta só tem 7), mas nunca duas
// seguidas repetem. O usuário sempre pode trocar a cor depois editando a
// categoria.
export function escolherCorAutomatica(quantidadeCategoriasExistentes: number): string {
  return PALETA_CORES[quantidadeCategoriasExistentes % PALETA_CORES.length];
}

// Procura, entre as categorias já existentes, uma com esse nome (ignorando
// acento/maiúsculo) E esse tipo — duas categorias com o mesmo nome só são
// "a mesma" se também forem do mesmo tipo (ex: "Aluguel" recebido é receita,
// "Aluguel" pago é despesa; são categorias diferentes mesmo com nome igual).
export function encontrarCategoriaPorNome(
  categorias: Categoria[],
  nome: string,
  tipo: TipoTransacao,
): Categoria | null {
  const nomeNormalizado = normalizarTexto(nome);
  return (
    categorias.find(
      (categoria) => categoria.tipo === tipo && normalizarTexto(categoria.nome) === nomeNormalizado,
    ) ?? null
  );
}
