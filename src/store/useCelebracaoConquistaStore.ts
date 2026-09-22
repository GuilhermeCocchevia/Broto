// Fila de conquistas RECÉM desbloqueadas, esperando pra aparecer no modal de
// celebração (ver ConquistaDesbloqueadaModal.tsx) — estado só de sessão, não
// vai pro banco (diferente de useConquistasStore, que é o registro
// permanente). Fila (não um valor único) porque mais de uma conquista pode
// desbloquear no mesmo instante — ex: a primeira transação lançada já
// completa "mes-completo" também, se já existia uma receita antes.
import { create } from 'zustand';
import type { ChaveConquista } from '../logic/conquistas';

type CelebracaoState = {
  fila: ChaveConquista[];
  enfileirar: (chave: ChaveConquista) => void;
  // Remove a que está sendo mostrada (a da frente) depois que o usuário fecha o modal.
  avancar: () => void;
};

export const useCelebracaoConquistaStore = create<CelebracaoState>()((set) => ({
  fila: [],
  enfileirar: (chave) => set((state) => ({ fila: [...state.fila, chave] })),
  avancar: () => set((state) => ({ fila: state.fila.slice(1) })),
}));
