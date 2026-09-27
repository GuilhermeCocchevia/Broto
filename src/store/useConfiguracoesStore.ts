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
  tutorialConcluido: boolean;
  bloqueioAtivo: boolean;
  carregando: boolean;
  // Diferente de `carregando: false` (que também é o valor ANTES de
  // `carregar()` ser chamado pela primeira vez) — `carregado` só vira
  // `true` depois que a primeira leitura de verdade termina.
  // BloqueioDoApp.tsx depende dessa distinção: decidir se mostra a trava
  // ANTES do banco responder deixaria a tela passar batido no valor
  // inicial (que é só um palpite razoável, não o dado real) por um
  // instante — mesma cautela já usada em useConquistasStore.
  carregado: boolean;
  carregar: () => Promise<void>;
  atualizarReduzirAnimacoes: (valor: boolean) => Promise<void>;
  atualizarNaoMostrarAvisoAposentadoria: (valor: boolean) => Promise<void>;
  atualizarCuriosidadeIndice: (indice: number) => Promise<void>;
  atualizarTutorialConcluido: (valor: boolean) => Promise<void>;
  atualizarBloqueioAtivo: (valor: boolean) => Promise<void>;
};

export const useConfiguracoesStore = create<ConfiguracoesState>()((set) => ({
  reduzirAnimacoes: false,
  naoMostrarAvisoAposentadoria: false,
  curiosidadeIndice: null,
  tutorialConcluido: false,
  // Mesmo padrão "opt-out" do valor default no schema (ver schema.ts): até
  // o banco responder, assume que a trava está ativa — é o palpite mais
  // seguro (nunca mostrar dado sem querer), e bate com o default real de
  // quem nunca abriu Configurações pra mudar isso.
  bloqueioAtivo: true,
  carregando: false,
  carregado: false,

  carregar: async () => {
    set({ carregando: true });
    const linha = await db.query.configuracoes.findFirst();
    set({
      reduzirAnimacoes: linha?.reduzirAnimacoes ?? false,
      naoMostrarAvisoAposentadoria: linha?.naoMostrarAvisoAposentadoria ?? false,
      curiosidadeIndice: linha?.curiosidadeIndice ?? null,
      tutorialConcluido: linha?.tutorialConcluido ?? false,
      bloqueioAtivo: linha?.bloqueioAtivo ?? true,
      carregando: false,
      carregado: true,
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

  atualizarTutorialConcluido: async (valor) => {
    set({ tutorialConcluido: valor });
    await db
      .insert(configuracoes)
      .values({ id: ID_CONFIGURACOES, tutorialConcluido: valor })
      .onConflictDoUpdate({ target: configuracoes.id, set: { tutorialConcluido: valor } });
  },

  atualizarBloqueioAtivo: async (valor) => {
    set({ bloqueioAtivo: valor });
    await db
      .insert(configuracoes)
      .values({ id: ID_CONFIGURACOES, bloqueioAtivo: valor })
      .onConflictDoUpdate({ target: configuracoes.id, set: { bloqueioAtivo: valor } });
  },
}));
