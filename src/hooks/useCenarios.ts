import { useMemo, useState } from 'react';
import { calcularCenarios, type Avaliador, type Cenarios, type FocoDoCorte } from '../logic/cenariosDeProjecao';
import type { EstimativaDeGastos } from '../logic/estimativaDeGastos';

export type { Cenarios, FocoDoCorte };

// Junta o que as telas de avaliação precisam pra mostrar os cenários: o
// estado do "e se" (quanto o usuário escolheu cortar, e de onde) e os
// resultados derivados dele (a conta em si mora em calcularCenarios, pura e
// testada). `avaliar` é como a tela avalia UMA estimativa (uma ou várias
// simulações); null enquanto a simulação ainda não existe/carregou.
export function useCenarios(estimativa: EstimativaDeGastos, avaliar: Avaliador | null) {
  const [reducaoPct, setReducaoPct] = useState(0);
  const [foco, setFoco] = useState<FocoDoCorte>({ tipo: 'geral' });

  // Trocar de foco com um corte em andamento deixaria o número anterior
  // (de outra categoria, ou do geral) parecendo aplicado ao novo foco —
  // volta pra "como está" sempre que o foco muda.
  function mudarFoco(novoFoco: FocoDoCorte) {
    setFoco(novoFoco);
    setReducaoPct(0);
  }

  const cenarios = useMemo<Cenarios | null>(
    () => (avaliar ? calcularCenarios(estimativa, avaliar, reducaoPct, foco) : null),
    [avaliar, estimativa, reducaoPct, foco],
  );

  return { cenarios, reducaoPct, setReducaoPct, foco, setFoco: mudarFoco };
}
