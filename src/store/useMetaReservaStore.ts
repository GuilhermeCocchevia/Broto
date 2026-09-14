// Mesmo padrão de useSaldoInicialStore.ts: insert-only, nunca faz UPDATE.
// Cada linha é "nessa data, o usuário decidiu isso sobre a reserva de
// emergência" — ativar com um valor-alvo, ou recusar por enquanto.
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { db } from '../db/client';
import { metasReserva } from '../db/schema';
import type { MetaReserva } from '../types/models';

type MetaReservaState = {
  metas: MetaReserva[];
  carregando: boolean;
  carregar: () => Promise<void>;
  // `valorAlvo` só é usado quando `ativa` é true — quem chama com
  // `ativa: false` deve passar `valorAlvo: null` (ver tela).
  atualizar: (ativa: boolean, valorAlvo: number | null) => Promise<void>;
};

export const useMetaReservaStore = create<MetaReservaState>()((set, get) => ({
  metas: [],
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    const linhas = await db.select().from(metasReserva);
    set({ metas: linhas, carregando: false });
  },

  atualizar: async (ativa, valorAlvo) => {
    const id = randomUUID();
    const criadoEm = new Date().toISOString();
    await db.insert(metasReserva).values({ id, ativa, valorAlvo, criadoEm });
    await get().carregar();
  },
}));
