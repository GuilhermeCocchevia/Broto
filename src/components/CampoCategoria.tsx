import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { OpcaoBotao } from './OpcaoBotao';
import { CampoTexto } from './CampoTexto';
import { normalizarTexto } from '../utils/normalizarTexto';
import { encontrarCategoriaPorNome } from '../utils/resolverOuCriarCategoria';
import {
  SUGESTOES_RECEITA,
  SUGESTOES_DESPESA,
  textoBuscavelDaSugestao,
} from '../data/sugestoesCategorias';
import type { Categoria, TipoTransacao } from '../types/models';

const MAXIMO_SUGESTOES = 12;

// Três estados possíveis do campo, em vez de depender de onFocus/onBlur com
// timer (a primeira versão fazia isso, e tinha um bug real: apagar o texto
// e digitar de novo deixava as sugestões escondidas pra sempre — a causa
// era confiar em EVENTO DE FOCO pra decidir visibilidade, o que é frágil:
// o foco pode "piscar" por causa de mudanças de layout, sem o usuário ter
// saído do campo de verdade).
//
// - 'inicial': acabou de aparecer na tela (ou o valor veio de fora, ex:
//   modo edição pré-preenchido) — não mostra sugestão nenhuma até o
//   usuário efetivamente digitar algo.
// - 'digitando': o usuário está editando o texto agora — mostra sugestões
//   filtradas pelo texto atual. Sempre que o texto muda por digitação,
//   volta pra esse estado, não importa o que era antes.
// - 'confirmado': o usuário tocou numa sugestão — esconde a lista (o texto
//   já é exatamente o que ele quis).
type EstadoCampo = 'inicial' | 'digitando' | 'confirmado';

// Campo único que junta "escolher categoria existente" e "criar categoria
// nova" — antes disso eram dois passos em duas telas diferentes: primeiro
// criar a categoria em "Categorias", depois voltar aqui pra escolher ela.
// Agora o usuário só digita; se o nome bater com uma categoria que já
// existe, ela é reaproveitada (quem usa esse campo decide isso no salvar,
// comparando o texto com as categorias existentes — ver
// resolverOuCriarCategoria.ts); se não bater com nada, uma categoria nova é
// criada na hora, automaticamente, com esse nome.
export function CampoCategoria({
  tipo,
  categorias,
  valor,
  onChangeValor,
}: {
  tipo: TipoTransacao;
  categorias: Categoria[];
  valor: string;
  onChangeValor: (texto: string) => void;
}) {
  const [estado, setEstado] = useState<EstadoCampo>('inicial');

  const categoriasDoTipo = useMemo(
    () => categorias.filter((categoria) => categoria.tipo === tipo),
    [categorias, tipo],
  );

  // Duas fontes de sugestão misturadas numa lista só: primeiro as
  // categorias que o usuário já criou (prioridade, porque são as mais
  // prováveis de ser o que ele quer), depois as sugestões padrão pra quem
  // ainda não tem nada parecido — sem repetir uma sugestão padrão cujo nome
  // já vire uma categoria existente (evita dois chips pra "a mesma coisa").
  const sugestoes = useMemo(() => {
    const textoNormalizado = normalizarTexto(valor);
    if (!textoNormalizado) return [];

    const existentesFiltradas = categoriasDoTipo.filter((categoria) =>
      normalizarTexto(categoria.nome).includes(textoNormalizado),
    );

    const listaPadrao = tipo === 'receita' ? SUGESTOES_RECEITA : SUGESTOES_DESPESA;
    const padraoFiltradas = listaPadrao
      .filter((sugestao) => normalizarTexto(textoBuscavelDaSugestao(sugestao)).includes(textoNormalizado))
      .filter((sugestao) => !encontrarCategoriaPorNome(categoriasDoTipo, sugestao.nome, tipo))
      .map((sugestao) => ({ nome: sugestao.nome, jaExiste: false }));

    const combinadas = [
      ...existentesFiltradas.map((categoria) => ({ nome: categoria.nome, jaExiste: true })),
      ...padraoFiltradas,
    ];

    return combinadas.slice(0, MAXIMO_SUGESTOES);
  }, [valor, categoriasDoTipo, tipo]);

  const mostrarSugestoes = estado === 'digitando' && sugestoes.length > 0;

  // As sugestões aparecem sozinhas conforme a pessoa digita — quem usa leitor
  // de tela não VÊ a lista surgir. Um aviso curto diz que existem e quantas
  // são (só quando a quantidade muda, pra não repetir a cada letra igual).
  const quantidadeDeSugestoes = mostrarSugestoes ? sugestoes.length : 0;
  useEffect(() => {
    if (quantidadeDeSugestoes > 0) {
      AccessibilityInfo.announceForAccessibility(
        `${quantidadeDeSugestoes} ${quantidadeDeSugestoes === 1 ? 'sugestão' : 'sugestões'} de categoria abaixo do campo`,
      );
    }
  }, [quantidadeDeSugestoes]);

  // O aviso "vai criar categoria nova" só aparece depois de uma escolha
  // confirmada (tocou num chip de categoria que ainda não existia) — não
  // aparece só de digitar, pra não piscar uma mensagem a cada letra antes
  // do usuário terminar de decidir o que quer.
  const confirmouCategoriaNova =
    estado === 'confirmado' &&
    valor.trim().length > 0 &&
    !encontrarCategoriaPorNome(categoriasDoTipo, valor, tipo);

  return (
    <View>
      <CampoTexto
        value={valor}
        onChangeText={(texto) => {
          onChangeValor(texto);
          setEstado('digitando');
        }}
        placeholder="Ex: Alimentação, Salário..."
        accessibilityLabel="Categoria"
        accessibilityHint="Digite o nome; aparecem sugestões, ou uma categoria nova é criada ao salvar"
      />

      {mostrarSugestoes && (
        <View style={styles.opcoes}>
          {sugestoes.map((sugestao) => (
            <OpcaoBotao
              key={sugestao.nome}
              label={sugestao.jaExiste ? sugestao.nome : `+ ${sugestao.nome}`}
              acessibilidadeLabel={
                sugestao.jaExiste ? `Usar a categoria ${sugestao.nome}` : `Criar a categoria ${sugestao.nome}`
              }
              selecionado={false}
              onPress={() => {
                onChangeValor(sugestao.nome);
                setEstado('confirmado');
              }}
            />
          ))}
        </View>
      )}

      {confirmouCategoriaNova && (
        <Text style={styles.aviso}>Vai criar a categoria &quot;{valor.trim()}&quot; automaticamente.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  opcoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  aviso: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
});
