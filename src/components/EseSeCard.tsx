import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { OpcaoBotao } from './OpcaoBotao';
import { formatarReal } from '../utils/formatarReal';
import { descreverEseSe } from '../logic/cenariosDeProjecao';
import type { Cenarios } from '../hooks/useCenarios';

// Cortes de gasto oferecidos sempre; se o "corte necessário" pra meta caber
// não for um deles, entra um botão extra com ele ("o necessário").
const CORTES_PADRAO = [0, 10, 20, 30];

function rotuloDoCorte(percentual: number, ehONecessario: boolean): string {
  if (percentual === 0) return 'Como está';
  return `−${percentual}%${ehONecessario ? ' (o necessário)' : ''}`;
}

// "E se eu gastar menos?" — o usuário experimenta reduzir o gasto do dia a dia
// e o veredito e o gráfico da tela mudam na hora. Tom de exploração, nunca de
// cobrança: é uma simulação, não uma meta imposta. Mesmo cartão levantado dos
// outros blocos da tela; os botões são os mesmos chips do resto do app.
export function EseSeCard({
  cenarios,
  reducaoPct,
  onChange,
  gastoDoDiaADia,
}: {
  cenarios: Cenarios;
  reducaoPct: number;
  onChange: (percentual: number) => void;
  // Gasto do dia a dia estimado por mês (ver PremissasDeProjecao) — a base do "quanto economizo".
  gastoDoDiaADia: number;
}) {
  const { corteNecessario } = cenarios;

  // Sem gasto do dia a dia não há o que cortar; e se tudo cabe folgado (e o
  // usuário não está brincando com o corte), o cartão só atrapalharia.
  const temAlgoAResolver = !cenarios.base.viavel || !cenarios.pesado.viavel;
  if (gastoDoDiaADia <= 0 || (!temAlgoAResolver && reducaoPct === 0)) return null;

  const necessarioForaDoPadrao =
    corteNecessario !== null && corteNecessario > 0 && !CORTES_PADRAO.includes(corteNecessario);
  const cortes = necessarioForaDoPadrao
    ? [...CORTES_PADRAO, corteNecessario].sort((a, b) => a - b)
    : CORTES_PADRAO;

  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>E SE EU GASTAR MENOS?</Text>
      <Text style={styles.subtitulo}>
        Seu gasto do dia a dia é de cerca de {formatarReal(gastoDoDiaADia)} por mês. Experimente reduzir e
        veja o resultado acima.
      </Text>
      <View style={styles.opcoes}>
        {cortes.map((percentual) => (
          <OpcaoBotao
            key={percentual}
            label={rotuloDoCorte(percentual, percentual === corteNecessario && necessarioForaDoPadrao)}
            selecionado={reducaoPct === percentual}
            onPress={() => onChange(percentual)}
          />
        ))}
      </View>
      <Text style={styles.resultado}>
        {descreverEseSe({
          reducaoPct,
          corteNecessario,
          motivoSemSolucao: cenarios.motivoSemSolucao,
          gastoDoDiaADia,
          esperado: cenarios.esperado,
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cartao: {
    width: '100%',
    borderRadius: 14,
    padding: 16,
    gap: 10,
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
  subtitulo: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultado: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '600',
  },
});
