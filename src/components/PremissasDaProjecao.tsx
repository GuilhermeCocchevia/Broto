import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { formatarReal } from '../utils/formatarReal';
import { textoDaConfianca, type PremissasDeProjecao } from '../logic/premissasDeProjecao';

// Quantos nomes de gastos recorrentes listar antes de resumir em "e mais N".
const MAXIMO_NOMES = 3;

// "Como calculei" — mostra o que o app assumiu pra chegar no veredito, pro
// usuário poder conferir e entender (em vez de confiar num número sem
// explicação). Mesmo cartão levantado do veredito; tom sempre descritivo, sem
// cor de alerta (mesmo quando a sobra é negativa — o veredito acima já diz).
export function PremissasDaProjecao({ premissas }: { premissas: PremissasDeProjecao }) {
  const { estimativa } = premissas;
  const nomes = estimativa.recorrentesNaPratica.map((r) => r.descricao);
  const nomesMostrados = nomes.slice(0, MAXIMO_NOMES).join(', ');
  const nomesRestantes = nomes.length - MAXIMO_NOMES;

  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>COMO CALCULEI</Text>

      <Linha rotulo="Renda esperada" valor={`${formatarReal(premissas.rendaEsperada)}/mês`} />
      <Linha rotulo="Despesas fixas" valor={`${formatarReal(premissas.despesasFixas)}/mês`} />
      <Linha rotulo="Gasto do dia a dia (estimado)" valor={`${formatarReal(premissas.gastoDoDiaADia)}/mês`} />
      <View style={styles.divisor} />
      <Linha rotulo="Sobra por mês, antes da simulação" valor={`${formatarReal(premissas.sobraTipica)}/mês`} destaque />

      {nomes.length > 0 && (
        <Text style={styles.nota}>
          Inclui gastos que se repetem todo mês: {nomesMostrados}
          {nomesRestantes > 0 ? ` e mais ${nomesRestantes}` : ''}.
        </Text>
      )}
      <Text style={styles.nota}>{textoDaConfianca(estimativa)}</Text>
    </View>
  );
}

function Linha({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <View style={styles.linha}>
      <Text style={[styles.rotulo, destaque && styles.textoDestaque]}>{rotulo}</Text>
      <Text style={[styles.valor, destaque && styles.textoDestaque]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  titulo: {
    fontFamily: 'Bungee_400Regular',
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.primaryDark,
  },
  linha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  rotulo: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  valor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  textoDestaque: {
    color: colors.text,
    fontWeight: '700',
  },
  divisor: {
    height: 1,
    backgroundColor: colors.background,
  },
  nota: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
});
