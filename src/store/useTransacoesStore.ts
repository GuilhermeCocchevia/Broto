// Mesmo padrão de useCategoriasStore.ts, agora para transações reais.
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { transacoes } from '../db/schema';
import type { Transacao } from '../types/models';

type NovaTransacao = Omit<Transacao, 'id'>;

type TransacoesState = {
  transacoes: Transacao[];
  carregando: boolean;
  carregar: () => Promise<void>;
  adicionar: (nova: NovaTransacao) => Promise<void>;
  atualizar: (id: string, dados: NovaTransacao) => Promise<void>;
  remover: (id: string) => Promise<void>;
};

export const useTransacoesStore = create<TransacoesState>()((set, get) => ({
  transacoes: [],
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    const linhas = await db.select().from(transacoes);
    set({ transacoes: linhas, carregando: false });
  },

  adicionar: async (nova) => {
    const id = randomUUID();
    // Se `categoriaId` apontar pra uma categoria que não existe, o SQLite recusa
    // essa linha (INSERT falha) — é o `PRAGMA foreign_keys = ON` do client.ts
    // fazendo esse trabalho, não uma checagem manual aqui.
    await db.insert(transacoes).values({ id, ...nova });
    await get().carregar();
  },

  atualizar: async (id, dados) => {
    await db.update(transacoes).set(dados).where(eq(transacoes.id, id));
    await get().carregar();
  },

  remover: async (id) => {
    await db.delete(transacoes).where(eq(transacoes.id, id));
    await get().carregar();
  },
}));
