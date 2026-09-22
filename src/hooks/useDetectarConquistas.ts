// Roda toda vez que transacoes/simulacoes mudam (Zustand re-renderiza quem
// usa o seletor): recalcula quais conquistas o estado atual dos dados já
// cumpre (ver avaliarConquistasElegiveis) e, pras que ainda não estavam
// salvas em useConquistasStore, marca como desbloqueada E enfileira pra
// celebração (ver useCelebracaoConquistaStore). Chamado uma vez só, no topo
// do app (ver App.tsx) — não em cada tela, senão a mesma conquista tentaria
// desbloquear de novo a cada navegação.
import { useEffect } from 'react';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useConquistasStore } from '../store/useConquistasStore';
import { useCelebracaoConquistaStore } from '../store/useCelebracaoConquistaStore';
import { avaliarConquistasElegiveis } from '../logic/conquistas';
import { mesAtualLocal } from '../utils/dataLocal';

export function useDetectarConquistas() {
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const conquistasCarregadas = useConquistasStore((state) => state.carregado);
  const carregarConquistas = useConquistasStore((state) => state.carregar);
  const desbloqueadas = useConquistasStore((state) => state.desbloqueadas);
  const desbloquear = useConquistasStore((state) => state.desbloquear);
  const enfileirar = useCelebracaoConquistaStore((state) => state.enfileirar);

  // Diferente de toda outra store do app (cada uma carregada pela TELA que
  // precisa dela): esta roda uma vez só, no topo do app (ver
  // ConquistasGlobais.tsx), então precisa carregar a própria store sozinha
  // — nenhuma tela garante isso por padrão (ConquistasScreen também
  // carrega, mas só quando o usuário visita aquela tela).
  useEffect(() => {
    carregarConquistas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sem transação/simulação nenhuma carregada ainda, ou a própria store de
    // conquistas ainda não leu o banco: não avalia nada — evitaria "reabrir"
    // uma conquista já vista só porque os dados ainda não chegaram (ver
    // mesmo cuidado em obterSaldoAtual/calcularRendaFixaMedia com listas
    // vazias no boot do app).
    if (!conquistasCarregadas) return;

    const elegiveis = avaliarConquistasElegiveis(transacoes, simulacoes, mesAtualLocal());
    const chavesJaSalvas = new Set(desbloqueadas.map((d) => d.chave));
    for (const chave of elegiveis) {
      if (chavesJaSalvas.has(chave)) continue;
      desbloquear(chave);
      enfileirar(chave);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacoes, simulacoes, conquistasCarregadas, desbloqueadas, desbloquear, enfileirar]);
}
