// Mesmo padrão das outras stores, mas sem "editar": atualizar o saldo é
// sempre inserir uma linha nova (ver comentário em src/types/models.ts).
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { db } from '../db/client';
import { saldosIniciais } from '../db/schema';
import type { SaldoInicial } from '../types/models';

type SaldoInicialState = {
  saldosIniciais: SaldoInicial[];
  carregando: boolean;
  carregar: () => Promise<void>;
  atualizar: (valor: number) => Promise<void>;
};

export const useSaldoInicialStore = create<SaldoInicialState>()((set, get) => ({
  saldosIniciais: [],
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    const linhas = await db.select().from(saldosIniciais);
    set({ saldosIniciais: linhas, carregando: false });
  },

  atualizar: async (valor) => {
    const id = randomUUID();
    const criadoEm = new Date().toISOString();
    await db.insert(saldosIniciais).values({ id, valor, criadoEm });
    await get().carregar();
  },
}));
