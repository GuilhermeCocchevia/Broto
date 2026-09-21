// Mesmo padrão singleton-upsert de useConfiguracoesStore.ts (uma linha só,
// id fixo) — aqui pro cache das taxas públicas de referência. `carregar()`
// só lê o que já está salvo (rápido, sem rede — chamado ao abrir a tela,
// igual toda store); `atualizar()` é a única ação que fala com a internet
// no app inteiro, e só roda quando o usuário toca "Atualizar" (nunca
// sozinha).
import { create } from 'zustand';
import { db } from '../db/client';
import { taxasReferencia } from '../db/schema';
import { buscarTaxasReferencia, type VencimentoRendaMais } from '../logic/taxasReferencia';

const ID_TAXAS_REFERENCIA = 'unica';

type TaxasReferenciaState = {
  selicMetaAnual: number | null;
  cdiAnualizadoAnual: number | null;
  tesouroRendaMais: VencimentoRendaMais[];
  atualizadoEm: string | null;
  atualizando: boolean;
  erro: string | null;
  carregar: () => Promise<void>;
  atualizar: () => Promise<void>;
};

export const useTaxasReferenciaStore = create<TaxasReferenciaState>()((set) => ({
  selicMetaAnual: null,
  cdiAnualizadoAnual: null,
  tesouroRendaMais: [],
  atualizadoEm: null,
  atualizando: false,
  erro: null,

  carregar: async () => {
    const linha = await db.query.taxasReferencia.findFirst();
    set({
      selicMetaAnual: linha?.selicMetaAnual ?? null,
      cdiAnualizadoAnual: linha?.cdiAnualizadoAnual ?? null,
      tesouroRendaMais: linha?.tesouroRendaMaisJson ? JSON.parse(linha.tesouroRendaMaisJson) : [],
      atualizadoEm: linha?.atualizadoEm ?? null,
    });
  },

  atualizar: async () => {
    set({ atualizando: true, erro: null });
    try {
      const resultado = await buscarTaxasReferencia();
      const atualizadoEm = new Date().toISOString();
      const dados = {
        selicMetaAnual: resultado.selicMetaAnual,
        cdiAnualizadoAnual: resultado.cdiAnualizadoAnual,
        tesouroRendaMaisJson: JSON.stringify(resultado.tesouroRendaMais),
        atualizadoEm,
      };
      await db
        .insert(taxasReferencia)
        .values({ id: ID_TAXAS_REFERENCIA, ...dados })
        .onConflictDoUpdate({ target: taxasReferencia.id, set: dados });
      set({
        selicMetaAnual: resultado.selicMetaAnual,
        cdiAnualizadoAnual: resultado.cdiAnualizadoAnual,
        tesouroRendaMais: resultado.tesouroRendaMais,
        atualizadoEm,
        atualizando: false,
      });
    } catch {
      // Falha em rede/parsing não apaga o que já estava cacheado — só
      // mostra o erro e mantém as últimas taxas conhecidas na tela. Sem
      // detalhe técnico aqui de propósito (diferente do padrão de
      // mensagemDeErro, feito pra erro de banco): "sem internet" ou "site
      // fora do ar" não ajuda o usuário a fazer nada diferente — só
      // confunde.
      set({ atualizando: false, erro: 'Não consegui buscar as taxas agora. Tente de novo mais tarde.' });
    }
  },
}));
