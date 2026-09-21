import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';
import { formatarReal } from '../utils/formatarReal';
import type { MesProjetado } from '../logic/projecao';
import { formatarMesBr } from '../utils/formatarDataBr';

// Uma linha de mês projetado (entradas, saídas, saldo acumulado) — extraída
// daqui (em vez de ficar direta no `.map()` de quem usa) porque o brilho
// embaixo da linha precisa de um id de gradiente PRÓPRIO por instância
// (`useId`, regra dos hooks: não dá pra chamar dentro de um `.map()`
// solto). Compartilhada entre a lista geral do Simulador e a tela de
// detalhe de uma simulação específica — mesmo padrão de "nuvenzinha de
// luz" do extrato do Dashboard (ver ItemLista.tsx), só que a cor aqui é a
// saúde do SALDO daquele mês (verde → amarelo → vermelho conforme se
// aproxima de zero — ver `corDoSaldo` em corPorValor.ts), não a gravidade
// de uma despesa isolada.
export function LinhaMesProjetado({ item, cor }: { item: MesProjetado; cor: string }) {
  const idGradiente = useId();
  return (
    <View style={styles.linha}>
      <Text style={styles.mes}>{formatarMesBr(item.mes)}</Text>
      <View style={styles.valores}>
        <Text style={styles.entradas}>+{formatarReal(item.entradas)}</Text>
        <Text style={styles.saidas}>-{formatarReal(item.saidas)}</Text>
        <Text style={styles.saldo}>{formatarReal(item.saldo)}</Text>
      </View>
      <Svg width={220} height={20} viewBox="0 0 220 20" style={styles.brilhoLinha} pointerEvents="none">
        <Defs>
          <RadialGradient id={idGradiente} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={cor} stopOpacity={0.45} />
            <Stop offset="0.55" stopColor={cor} stopOpacity={0.2} />
            <Stop offset="1" stopColor={cor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="110" cy="10" rx="110" ry="10" fill={`url(#${idGradiente})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // `position: relative` + `overflow: hidden` contêm o brilho (`brilhoLinha`,
  // ver JSX) dentro da própria linha, sem vazar por cima da linha vizinha.
  linha: {
    position: 'relative',
    overflow: 'hidden',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  brilhoLinha: {
    position: 'absolute',
    left: '50%',
    marginLeft: -110,
    bottom: -6,
  },
  mes: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  valores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  entradas: {
    color: colors.success,
    fontSize: 13,
  },
  saidas: {
    color: colors.danger,
    fontSize: 13,
  },
  saldo: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
