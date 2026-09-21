// Diferente das outras stores (insert-only): preferência de app é só "o
// estado atual", não um histórico de decisões — por isso aqui é upsert
// (insere a primeira vez, atualiza depois) numa linha SÓ, com id fixo.
import { create } from 'zustand';
import { db } from '../db/client';
import { configuracoes } from '../db/schema';

// Fixo de propósito — sempre a MESMA linha, nunca uma nova. Não precisa
// ser um UUID de verdade (não há risco de colisão com nada), só precisa
// ser estável.
const ID_CONFIGURACOES = 'unica';

type ConfiguracoesState = {
  reduzirAnimacoes: boolean;
  naoMostrarAvisoAposentadoria: boolean;
  curiosidadeIndice: number | null;
  carregando: boolean;
  carregar: () => Promise<void>;
  atualizarReduzirAnimacoes: (valor: boolean) => Promise<void>;
  atualizarNaoMostrarAvisoAposentadoria: (valor: boolean) => Promise<void>;
  atualizarCuriosidadeIndice: (indice: number) => Promise<void>;
};

export const useConfiguracoesStore = create<ConfiguracoesState>()((set) => ({
  reduzirAnimacoes: false,
  naoMostrarAvisoAposentadoria: false,
  curiosidadeIndice: null,
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    const linha = await db.query.configuracoes.findFirst();
    set({
      reduzirAnimacoes: linha?.reduzirAnimacoes ?? false,
      naoMostrarAvisoAposentadoria: linha?.naoMostrarAvisoAposentadoria ?? false,
      curiosidadeIndice: linha?.curiosidadeIndice ?? null,
      carregando: false,
    });
  },

  atualizarReduzirAnimacoes: async (valor) => {
    // Otimista: atualiza a tela na hora, sem esperar o banco confirmar —
    // é só uma preferência de UI, não tem risco real de "perder" o toque
    // se o app fechar no meio (na pior hipótese volta pro valor antigo,
    // sem consequência nenhuma).
    set({ reduzirAnimacoes: valor });
    await db
      .insert(configuracoes)
      .values({ id: ID_CONFIGURACOES, reduzirAnimacoes: valor })
      .onConflictDoUpdate({ target: configuracoes.id, set: { reduzirAnimacoes: valor } });
  },

  atualizarNaoMostrarAvisoAposentadoria: async (valor) => {
    set({ naoMostrarAvisoAposentadoria: valor });
    await db
      .insert(configuracoes)
      .values({ id: ID_CONFIGURACOES, naoMostrarAvisoAposentadoria: valor })
      .onConflictDoUpdate({ target: configuracoes.id, set: { naoMostrarAvisoAposentadoria: valor } });
  },

  atualizarCuriosidadeIndice: async (indice) => {
    set({ curiosidadeIndice: indice });
    await db
      .insert(configuracoes)
      .values({ id: ID_CONFIGURACOES, curiosidadeIndice: indice })
      .onConflictDoUpdate({ target: configuracoes.id, set: { curiosidadeIndice: indice } });
  },
}));
