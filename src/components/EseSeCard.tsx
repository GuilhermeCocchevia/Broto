import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { OpcaoBotao } from './OpcaoBotao';
import { formatarReal } from '../utils/formatarReal';
import { descreverEseSe, listarItensDoDiaADiaPorCategoria } from '../logic/cenariosDeProjecao';
import { formatarMesBr } from '../utils/formatarDataBr';
import type { Cenarios, FocoDoCorte } from '../hooks/useCenarios';
import type { EstimativaDeGastos } from '../logic/estimativaDeGastos';
import type { Categoria } from '../types/models';

// Cortes de gasto oferecidos sempre; se o "corte necessário" pra meta caber
// não for um deles, entra um botão extra com ele ("o necessário").
const CORTES_PADRAO = [0, 10, 20, 30];

// Quantas categorias entram como chip de foco — as maiores primeiro; com
// muitas categorias pequenas, virar uma parede de botões atrapalharia mais
// do que ajudaria (a de menor valor sempre dá pra achar por "Rever gastos").
const MAX_CATEGORIAS_NO_FOCO = 4;

// Valor mensal dentro do chip, sem centavos (é uma estimativa, centavos
// passariam falsa precisão e deixariam o chip largo demais).
function reaisInteiros(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function rotuloDoCorte(percentual: number, ehONecessario: boolean): string {
  if (percentual === 0) return 'Como está';
  return `−${percentual}%${ehONecessario ? ' (o necessário)' : ''}`;
}

// "E se eu gastar menos?" — o usuário experimenta reduzir o gasto do dia a dia
// (tudo, ou só uma categoria) e o veredito e o gráfico da tela mudam na hora.
// Tom de exploração, nunca de cobrança: é uma simulação, não uma meta imposta.
// Mesmo cartão levantado dos outros blocos da tela; os botões são os mesmos
// chips do resto do app.
export function EseSeCard({
  cenarios,
  reducaoPct,
  onChange,
  estimativa,
  foco,
  onChangeFoco,
  categoriaPorId,
  gastoDoDiaADia,
  mesAtual,
}: {
  cenarios: Cenarios;
  reducaoPct: number;
  onChange: (percentual: number) => void;
  // Pra montar a lista de categorias que dá pra focar o corte (ver
  // listarItensDoDiaADiaPorCategoria) — cada categoria pode ter as duas
  // origens (variável + recorrente na prática) somadas numa coisa só.
  estimativa: EstimativaDeGastos;
  foco: FocoDoCorte;
  onChangeFoco: (foco: FocoDoCorte) => void;
  categoriaPorId: Map<string, Categoria>;
  // Gasto do dia a dia estimado por mês (ver PremissasDeProjecao) — a base do "quanto economizo" quando o foco é geral.
  gastoDoDiaADia: number;
  // Mês de hoje ('AAAA-MM'): o gasto dele já aconteceu, então o corte só vale dali em diante.
  mesAtual: string;
}) {
  const corteNecessario = cenarios.corteNoFoco;

  const itensPorCategoria = useMemo(() => listarItensDoDiaADiaPorCategoria(estimativa), [estimativa]);

  // Categoria em foco (se houver) — se ela sumiu do dia a dia por algum
  // motivo (ex: transação editada enquanto a tela estava aberta), trata como
  // geral em vez de mostrar um cartão com uma categoria fantasma.
  const categoriaEmFoco =
    foco.tipo === 'categoria' ? itensPorCategoria.find((item) => item.categoriaId === foco.categoriaId) : undefined;
  const emFocoDeCategoria = foco.tipo === 'categoria' && categoriaEmFoco !== undefined;
  const nomeCategoria = emFocoDeCategoria ? categoriaPorId.get(foco.categoriaId as string)?.nome : undefined;
  const gastoDoFoco = emFocoDeCategoria ? categoriaEmFoco!.valorMensal : gastoDoDiaADia;

  // Sem gasto (no foco atual) não há o que cortar; e se tudo cabe folgado (e o
  // usuário não está brincando com o corte), o cartão só atrapalharia.
  const temAlgoAResolver = !cenarios.base.viavel || !cenarios.pesado.viavel;
  if (gastoDoFoco <= 0 || (!temAlgoAResolver && reducaoPct === 0 && !emFocoDeCategoria)) return null;

  const necessarioForaDoPadrao =
    corteNecessario !== null && corteNecessario > 0 && !CORTES_PADRAO.includes(corteNecessario);
  const cortes = necessarioForaDoPadrao
    ? [...CORTES_PADRAO, corteNecessario].sort((a, b) => a - b)
    : CORTES_PADRAO;

  // Só oferece o seletor de categoria quando há mais de uma pra escolher —
  // com uma só, "focar nela" e "geral" dariam o mesmo resultado.
  const categoriasParaFoco = itensPorCategoria.slice(0, MAX_CATEGORIAS_NO_FOCO);
  const temSeletorDeCategoria = categoriasParaFoco.length > 1;

  return (
    <View style={styles.cartao}>
      <Text style={styles.titulo}>E SE EU GASTAR MENOS?</Text>
      <Text style={styles.subtitulo}>
        {nomeCategoria
          ? `Seu gasto em ${nomeCategoria} é de cerca de ${formatarReal(gastoDoFoco)} por mês. Experimente reduzir e veja o resultado acima.`
          : `Seu gasto do dia a dia é de cerca de ${formatarReal(gastoDoDiaADia)} por mês. Experimente reduzir e veja o resultado acima.`}
      </Text>

      {temSeletorDeCategoria && (
        <>
          <Text style={styles.legenda}>ONDE CORTAR</Text>
          <View style={styles.opcoes}>
            <OpcaoBotao
              label={`Tudo · ${reaisInteiros(gastoDoDiaADia)}`}
              selecionado={foco.tipo === 'geral'}
              onPress={() => onChangeFoco({ tipo: 'geral' })}
            />
            {categoriasParaFoco.map((item) => (
              <OpcaoBotao
                key={item.categoriaId}
                label={`${categoriaPorId.get(item.categoriaId)?.nome ?? 'Categoria'} · ${reaisInteiros(item.valorMensal)}`}
                selecionado={foco.tipo === 'categoria' && foco.categoriaId === item.categoriaId}
                onPress={() => onChangeFoco({ tipo: 'categoria', categoriaId: item.categoriaId })}
              />
            ))}
          </View>
          <Text style={styles.legenda}>QUANTO CORTAR</Text>
        </>
      )}

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
          motivoSemSolucao: cenarios.motivoNoFoco,
          gastoDoDiaADia: gastoDoFoco,
          esperado: cenarios.esperado,
          nomeCategoria,
          corteGeral: cenarios.corteNecessario,
        })}
      </Text>
      {reducaoPct > 0 && cenarios.esperado.meses.some((mes) => mes.mes === mesAtual) && (
        <Text style={styles.nota}>
          O corte vale a partir do mês seguinte: {formatarMesBr(mesAtual)} já está com os gastos lançados e não muda.
        </Text>
      )}
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
  legenda: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginTop: 2,
  },
  nota: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
  },
  resultado: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '600',
  },
});
