// Guarda quais conquistas o usuário já desbloqueou (insert-only, mesmo
// padrão de useSaldoInicialStore) — não decide QUAIS conquistas existem
// nem quando desbloquear uma nova (ver logic/conquistas.ts e
// hooks/useDetectarConquistas.ts); essa store só persiste o resultado.
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { db } from '../db/client';
import { conquistasDesbloqueadas } from '../db/schema';
import type { ConquistaDesbloqueada } from '../types/models';
import type { ChaveConquista } from '../logic/conquistas';

type ConquistasState = {
  desbloqueadas: ConquistaDesbloqueada[];
  carregando: boolean;
  // Diferente de `carregando: false` (que também é o valor ANTES de
  // `carregar()` ser chamado pela primeira vez, então não dá pra usar
  // sozinho como "já sei o que tem no banco") — `carregado` só vira `true`
  // depois que a primeira leitura de verdade termina. useDetectarConquistas
  // depende dessa distinção: avaliar contra `desbloqueadas` antes do banco
  // responder re-desbloquearia (e re-celebraria) tudo de novo a cada app
  // aberto, achando que nada tinha sido salvo ainda.
  carregado: boolean;
  carregar: () => Promise<void>;
  // Idempotente: chamar duas vezes com a mesma chave não duplica linha
  // nenhuma (checa o estado em memória antes de inserir) — importante
  // porque `useDetectarConquistas` roda de novo toda vez que
  // transacoes/simulacoes mudam, não só uma vez.
  desbloquear: (chave: ChaveConquista) => Promise<void>;
};

export const useConquistasStore = create<ConquistasState>()((set, get) => ({
  desbloqueadas: [],
  carregando: false,
  carregado: false,

  carregar: async () => {
    set({ carregando: true });
    const linhas = await db.select().from(conquistasDesbloqueadas);
    set({ desbloqueadas: linhas, carregando: false, carregado: true });
  },

  desbloquear: async (chave) => {
    if (get().desbloqueadas.some((d) => d.chave === chave)) return;
    const id = randomUUID();
    const desbloqueadaEm = new Date().toISOString();
    // Otimista (atualiza o estado antes do banco confirmar) — mesma
    // filosofia de useConfiguracoesStore: evita um respiro em que duas
    // chamadas simultâneas (ex: dois `useMemo` recalculando ao mesmo
    // tempo) ainda não viam a inserção anterior e desbloqueavam de novo.
    set((state) => ({ desbloqueadas: [...state.desbloqueadas, { id, chave, desbloqueadaEm }] }));
    await db.insert(conquistasDesbloqueadas).values({ id, chave, desbloqueadaEm });
  },
}));
