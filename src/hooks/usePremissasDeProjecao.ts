import { useMemo } from 'react';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { montarPremissas, type PremissasDeProjecao } from '../logic/premissasDeProjecao';
import { mesAtualLocal } from '../utils/dataLocal';

// As premissas da projeção (ver premissasDeProjecao.ts) a partir do que está
// nas stores — um lugar só pras telas que avaliam simulações, em vez de cada
// uma refazer saldo atual, renda esperada e estimativa de gastos. Só LÊ as
// stores: quem chama continua responsável por carregá-las (useEffect com
// `carregar`, como em toda tela do app).
export function usePremissasDeProjecao(): PremissasDeProjecao {
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);

  return useMemo(
    () => montarPremissas(transacoes, saldosIniciais, mesAtualLocal()),
    [transacoes, saldosIniciais],
  );
}
