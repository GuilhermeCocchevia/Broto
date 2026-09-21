// "Reduzir movimento" de verdade tem DUAS fontes, e o app precisa respeitar
// as duas: a configuração do PRÓPRIO SISTEMA (iOS: Ajustes > Acessibilidade
// > Movimento > Reduzir Movimento — várias pessoas já deixam isso ligado o
// tempo todo, em qualquer app, por enjoo/sensibilidade a movimento) e a
// preferência DENTRO do app (ver Configurações > Acessibilidade), pra quem
// quer só as animações do Broto especificamente mais paradas, sem mexer no
// aparelho inteiro. Ativando QUALQUER uma das duas já é o suficiente.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';

export function useReduzirMovimento(): boolean {
  const reduzirAnimacoesDoApp = useConfiguracoesStore((state) => state.reduzirAnimacoes);
  const [reduzirMovimentoDoSistema, setReduzirMovimentoDoSistema] = useState(false);

  useEffect(() => {
    // `isReduceMotionEnabled` responde o valor JÁ ATUAL na hora que a tela
    // monta; o listener (`reduceMotionChanged`) cobre o caso do usuário
    // mudar essa configuração enquanto o app já está aberto (ex: foi em
    // Ajustes num split-screen, ou voltou do centro de controle).
    AccessibilityInfo.isReduceMotionEnabled().then(setReduzirMovimentoDoSistema);
    const assinatura = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduzirMovimentoDoSistema,
    );
    return () => assinatura.remove();
  }, []);

  return reduzirAnimacoesDoApp || reduzirMovimentoDoSistema;
}
