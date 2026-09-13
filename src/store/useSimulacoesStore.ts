// Mesmo padrão de useCategoriasStore.ts, agora para simulações de compra futura.
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { db } from '../db/client';
import { simulacoes } from '../db/schema';
import type { Simulacao } from '../types/models';

type NovaSimulacao = Omit<Simulacao, 'id' | 'criadoEm'>;

type SimulacoesState = {
  simulacoes: Simulacao[];
  carregando: boolean;
  carregar: () => Promise<void>;
  adicionar: (nova: NovaSimulacao) => Promise<void>;
};

export const useSimulacoesStore = create<SimulacoesState>()((set, get) => ({
  simulacoes: [],
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    const linhas = await db.select().from(simulacoes);
    set({ simulacoes: linhas, carregando: false });
  },

  adicionar: async (nova) => {
    const id = randomUUID();
    // `criadoEm` não vem de quem chama `adicionar` — é a store quem decide isso,
    // porque é sempre "agora", não uma escolha da tela. `new Date().toISOString()`
    // gera algo como '2026-09-13T15:30:00.000Z', que também ordena certinho como
    // string (mesma ideia do campo `data` em Transacao).
    const criadoEm = new Date().toISOString();
    await db.insert(simulacoes).values({ id, criadoEm, ...nova });
    await get().carregar();
  },
}));
