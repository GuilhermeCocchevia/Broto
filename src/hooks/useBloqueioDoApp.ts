// Decisão consciente de 2026-09-27 (ver Segundo Cérebro): pedir Face ID/
// Touch ID/PIN do aparelho toda vez que o Broto volta pra frente — protege
// contra "alguém pega o celular já destravado e abre o app", o cenário mais
// realista pra um app financeiro pessoal (o resto — arquivo em repouso —
// já é criptografado pelo próprio sistema operacional, contanto que o
// aparelho tenha algum código configurado).
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useConfiguracoesStore } from '../store/useConfiguracoesStore';

// Import tardio, dentro de try/catch: `expo-local-authentication` é módulo
// NATIVO (precisa de `expo run:ios`/`expo run:android`, não só recarregar o
// JS) — mesmo cuidado já usado com `react-native-webview` (ver
// GraficoApex.tsx): se o nativo ainda não existir no build instalado,
// `require` no topo do arquivo lançaria um erro que derrubaria o app
// inteiro. Sem o módulo, a trava simplesmente não ativa — "app calmo,
// nunca sem saída" vale também pra bug de ambiente, não só pra decisão de
// produto.
let LocalAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  LocalAuthentication = require('expo-local-authentication');
} catch {
  LocalAuthentication = null;
}

export function useBloqueioDoApp() {
  const bloqueioAtivo = useConfiguracoesStore((state) => state.bloqueioAtivo);
  const carregado = useConfiguracoesStore((state) => state.carregado);
  const carregarConfiguracoes = useConfiguracoesStore((state) => state.carregar);

  // Se o aparelho não tem NENHUM código/biometria configurada, não há o
  // que exigir — travar mesmo assim deixaria a pessoa sem nenhum jeito de
  // entrar no próprio app. `null` = ainda checando (é assíncrono).
  const [aparelhoProtegido, setAparelhoProtegido] = useState<boolean | null>(null);
  const [autenticado, setAutenticado] = useState(false);
  const [autenticando, setAutenticando] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

  useEffect(() => {
    let cancelado = false;
    async function verificar() {
      if (!LocalAuthentication) {
        if (!cancelado) setAparelhoProtegido(false);
        return;
      }
      try {
        const [temHardware, temCadastro] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);
        if (!cancelado) setAparelhoProtegido(temHardware && temCadastro);
      } catch {
        // Qualquer erro aqui (aparelho estranho, permissão negada) vira
        // "sem proteção disponível", nunca uma tela travada sem saída.
        if (!cancelado) setAparelhoProtegido(false);
      }
    }
    verificar();
    return () => {
      cancelado = true;
    };
  }, []);

  const autenticar = useCallback(async () => {
    if (!LocalAuthentication) return;
    setAutenticando(true);
    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Desbloquear o Broto',
        cancelLabel: 'Cancelar',
        // `false`: o PIN/senha do aparelho fica disponível como alternativa
        // desde o primeiro toque, não só depois de a biometria falhar
        // algumas vezes — rosto coberto ou dedo molhado não pode travar
        // quem só quer abrir o app.
        disableDeviceFallback: false,
      });
      if (resultado.success) setAutenticado(true);
    } finally {
      setAutenticando(false);
    }
  }, []);

  // Só o estado 'background' de VERDADE reseta a autenticação — 'inactive'
  // é só uma transição passageira (gesto de trocar de app, folha de
  // compartilhamento, um alerta do sistema) e não significa que a pessoa
  // saiu do app de fato; tratar como se tivesse saído pediria Face ID de
  // novo toda hora, à toa.
  useEffect(() => {
    function aoMudarEstado(proximoEstado: AppStateStatus) {
      if (proximoEstado === 'background') setAutenticado(false);
    }
    const assinatura = AppState.addEventListener('change', aoMudarEstado);
    return () => assinatura.remove();
  }, []);

  const precisaAutenticar =
    carregado && bloqueioAtivo && aparelhoProtegido === true && !autenticado;

  return { precisaAutenticar, autenticando, autenticar };
}
