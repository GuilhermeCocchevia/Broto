import { useMemo, useState } from 'react';
import {
  ajustarGastoDoDiaADia,
  calcularCorteNecessarioEmPercentual,
  explicarSemSolucao,
  FATOR_IMPREVISTOS,
  type Avaliador,
  type MotivoSemSolucao,
} from '../logic/cenariosDeProjecao';
import type { EstimativaDeGastos } from '../logic/estimativaDeGastos';
import type { ResultadoViabilidade } from '../logic/projecao';

export type Cenarios = {
  // Sem nenhum ajuste do "e se" — o que o app assume de verdade.
  base: ResultadoViabilidade;
  // Com o corte escolhido no "e se" (igual à `base` quando reducaoPct = 0).
  esperado: ResultadoViabilidade;
  // O esperado com 20% a mais de gasto do dia a dia (a linha tracejada).
  pesado: ResultadoViabilidade;
  corteNecessario: number | null;
  motivoSemSolucao: MotivoSemSolucao;
};

// Junta o que as telas de avaliação precisam pra mostrar os cenários: o
// estado do "e se" (quanto o usuário escolheu cortar) e os resultados
// derivados dele. `avaliar` é como a tela avalia UMA estimativa (uma ou várias
// simulações); null enquanto a simulação ainda não existe/carregou.
export function useCenarios(estimativa: EstimativaDeGastos, avaliar: Avaliador | null) {
  const [reducaoPct, setReducaoPct] = useState(0);

  const cenarios = useMemo<Cenarios | null>(() => {
    if (!avaliar) return null;
    const base = avaliar(estimativa);
    const corteNecessario = calcularCorteNecessarioEmPercentual(avaliar, estimativa);
    const fator = 1 - reducaoPct / 100;
    return {
      base,
      esperado: reducaoPct === 0 ? base : avaliar(ajustarGastoDoDiaADia(estimativa, fator)),
      pesado: avaliar(ajustarGastoDoDiaADia(estimativa, fator * FATOR_IMPREVISTOS)),
      corteNecessario,
      motivoSemSolucao: corteNecessario === null ? explicarSemSolucao(avaliar, estimativa) : 'fixos',
    };
  }, [avaliar, estimativa, reducaoPct]);

  return { cenarios, reducaoPct, setReducaoPct };
}
