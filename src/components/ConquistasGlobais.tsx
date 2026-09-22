// Roda em cima de TODO o app (ver App.tsx), não dentro de uma tela
// específica: uma conquista pode disparar enquanto o usuário está em
// qualquer lugar (Resumo, Simulador...), e o modal de celebração precisa
// aparecer não importa onde. Junta a detecção (useDetectarConquistas) com o
// modal que mostra a fila (useCelebracaoConquistaStore) — cada componente
// que usa esse hook/store de novo reavaliaria/desenharia duplicado, então
// fica centralizado aqui, montado uma vez só.
import { useCelebracaoConquistaStore } from '../store/useCelebracaoConquistaStore';
import { useDetectarConquistas } from '../hooks/useDetectarConquistas';
import { ConquistaDesbloqueadaModal } from './ConquistaDesbloqueadaModal';

export function ConquistasGlobais() {
  useDetectarConquistas();
  const fila = useCelebracaoConquistaStore((state) => state.fila);
  const avancar = useCelebracaoConquistaStore((state) => state.avancar);

  return <ConquistaDesbloqueadaModal chave={fila[0] ?? null} aoFechar={avancar} />;
}
