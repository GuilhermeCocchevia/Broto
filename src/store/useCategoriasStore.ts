// Primeira store Zustand de verdade do projeto (até agora ele só estava instalado).
// `create` monta um hook (useCategoriasStore) que qualquer componente pode chamar
// pra ler o estado ou disparar as ações — sem precisar passar props de tela em tela.
import { create } from 'zustand';
import { randomUUID } from 'expo-crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { categorias } from '../db/schema';
import type { Categoria } from '../types/models';

type NovaCategoria = Omit<Categoria, 'id'>;

type CategoriasState = {
  categorias: Categoria[];
  carregando: boolean;
  carregar: () => Promise<void>;
  // Devolve o id da categoria criada — quem chama às vezes precisa dele na
  // hora (ex: criar uma transação pra uma categoria nova, os dois no mesmo
  // fluxo, sem esperar a tela recarregar pra descobrir o id).
  adicionar: (nova: NovaCategoria) => Promise<string>;
  atualizar: (id: string, dados: NovaCategoria) => Promise<void>;
  remover: (id: string) => Promise<void>;
};

// `create<CategoriasState>()` recebe uma função que devolve o estado inicial + as
// ações. `set` substitui parte do estado (parecido com o setState do React);
// `get` lê o estado atual de dentro de uma ação, sem precisar dele vir por parâmetro.
export const useCategoriasStore = create<CategoriasState>()((set, get) => ({
  categorias: [],
  carregando: false,

  carregar: async () => {
    set({ carregando: true });
    // db.select().from(categorias) é a query Drizzle equivalente a
    // "SELECT * FROM categorias" — mas com autocomplete e checagem de tipo.
    const linhas = await db.select().from(categorias);
    set({ categorias: linhas, carregando: false });
  },

  adicionar: async (nova) => {
    // randomUUID() gera um id único (ex: "3fa8...") pra identificar essa categoria
    // pra sempre no banco. Não dá pra deixar o SQLite gerar sozinho um número
    // incremental aqui porque usamos `text` como chave primária, não `integer`.
    const id = randomUUID();
    await db.insert(categorias).values({ id, ...nova });
    // Depois de inserir, recarrega a lista do banco — assim a tela sempre mostra
    // o que está salvo de verdade, não uma cópia otimista que pode divergir.
    await get().carregar();
    return id;
  },

  atualizar: async (id, dados) => {
    // `.where(eq(categorias.id, id))` é o WHERE id = ? — sem isso o UPDATE
    // mudaria a coluna em TODAS as linhas da tabela, não só nessa categoria.
    await db.update(categorias).set(dados).where(eq(categorias.id, id));
    await get().carregar();
  },

  remover: async (id) => {
    // Se alguma transação/simulação ainda referenciar essa categoria, o
    // PRAGMA foreign_keys barra esse DELETE (erro "FOREIGN KEY constraint
    // failed") — a tela precisa tratar esse erro, não é bug daqui.
    await db.delete(categorias).where(eq(categorias.id, id));
    await get().carregar();
  },
}));
