import { useMemo } from 'react';
import { useCategoriasStore } from '../store/useCategoriasStore';
import type { Categoria } from '../types/models';

// Mapa categoria.id -> Categoria, pra achar a cor/nome de qualquer item em
// O(1) no render, em vez de `categorias.find(...)` (O(n)) dentro de cada
// linha da lista. Extraído porque a mesma conta já se repetia em mais de
// uma tela (Dashboard, Simulador).
export function useCategoriaPorId(): Map<string, Categoria> {
  const categorias = useCategoriasStore((state) => state.categorias);
  return useMemo(() => {
    const mapa = new Map<string, Categoria>();
    for (const categoria of categorias) {
      mapa.set(categoria.id, categoria);
    }
    return mapa;
  }, [categorias]);
}
