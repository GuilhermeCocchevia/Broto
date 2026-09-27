// Trava as props de acessibilidade dos componentes-base: se alguém remover o
// papel "button", o estado "selected" ou o rótulo falado, esses testes quebram.
// (Não substitui testar com o VoiceOver de verdade, mas pega regressão sem ele.)
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { BotaoPrimario } from './BotaoPrimario';
import { OpcaoBotao } from './OpcaoBotao';
import { ItemLista } from './ItemLista';
import { CampoData } from './CampoData';
import { CampoMoeda } from './CampoMoeda';
import { LinhaMesProjetado, CabecalhoDosMeses } from './LinhaMesProjetado';
import { rotuloFaladoDoCorte } from './EseSeCard';
import { DECORATIVO } from '../utils/acessibilidade';

// Renderiza e devolve os elementos "de verdade" (View/Text/TextInput nativos)
// que têm alguma prop de acessibilidade.
function renderizar(elemento: React.ReactElement) {
  let arvore!: renderer.ReactTestRenderer;
  act(() => {
    arvore = renderer.create(elemento);
  });
  const acessiveis = arvore.root.findAll(
    (no) =>
      typeof no.type === 'string' &&
      (no.props.accessibilityRole !== undefined ||
        no.props.accessibilityLabel !== undefined ||
        no.props.accessible === true),
  );
  return { arvore, acessiveis };
}

const primeiro = (acessiveis: renderer.ReactTestInstance[]) => acessiveis[0].props;

test('BotaoPrimario: é um botão com o texto como rótulo; desabilitado avisa o estado', () => {
  const ativo = primeiro(renderizar(<BotaoPrimario label="Salvar" onPress={() => {}} />).acessiveis);
  expect(ativo.accessibilityRole).toBe('button');
  expect(ativo.accessibilityLabel).toBe('Salvar');
  expect(ativo.accessibilityState).toEqual({ disabled: false });

  const desabilitado = primeiro(
    renderizar(<BotaoPrimario label="Salvando..." onPress={() => {}} desabilitado acessibilidadeHint="Aguarde" />)
      .acessiveis,
  );
  expect(desabilitado.accessibilityState).toEqual({ disabled: true });
  expect(desabilitado.accessibilityHint).toBe('Aguarde');
});

test('OpcaoBotao: chip é botão e diz se está selecionado; rótulo falado pode diferir do visual', () => {
  const marcado = primeiro(renderizar(<OpcaoBotao label="−10%" selecionado onPress={() => {}} acessibilidadeLabel="Reduzir 10%" />).acessiveis);
  expect(marcado.accessibilityRole).toBe('button');
  expect(marcado.accessibilityState).toEqual({ selected: true });
  expect(marcado.accessibilityLabel).toBe('Reduzir 10%');

  const naoMarcado = primeiro(renderizar(<OpcaoBotao label="Mensal" selecionado={false} onPress={() => {}} />).acessiveis);
  expect(naoMarcado.accessibilityLabel).toBe('Mensal');
  expect(naoMarcado.accessibilityState).toEqual({ selected: false });
});

test('ItemLista: a linha inteira é lida como UM elemento; só é "botão" se dá pra tocar', () => {
  const comToque = primeiro(
    renderizar(<ItemLista cor="#4CAF50" titulo="Aluguel" subtitulo="Moradia · 10/09/2026" valorTexto="-R$ 1.200,00" onPress={() => {}} />).acessiveis,
  );
  expect(comToque.accessible).toBe(true);
  expect(comToque.accessibilityRole).toBe('button');
  expect(comToque.accessibilityLabel).toBe('Aluguel. Moradia · 10/09/2026. -R$ 1.200,00');

  const semToque = primeiro(renderizar(<ItemLista cor="#4CAF50" titulo="Info" subtitulo="só leitura" />).acessiveis);
  expect(semToque.accessibilityRole).toBeUndefined();
  expect(semToque.accessibilityLabel).toBe('Info. só leitura');
});

test('CampoData: o campo fala a data por extenso e o estado aberto/fechado', () => {
  const { acessiveis } = renderizar(<CampoData valor="2026-09-26" onChangeValor={() => {}} atalhosRapidos acessibilidadeLabel="Data da 1ª parcela" />);
  const campo = acessiveis.find((n) => String(n.props.accessibilityLabel).startsWith('Data da 1ª parcela'))!;
  expect(campo.props.accessibilityLabel).toBe('Data da 1ª parcela: 26 de setembro de 2026');
  expect(campo.props.accessibilityRole).toBe('button');
  expect(campo.props.accessibilityState).toEqual({ expanded: false });
  const rotulos = acessiveis.map((n) => n.props.accessibilityLabel);
  expect(rotulos).toContain('Usar a data de hoje');
  expect(rotulos).toContain('Usar a data de ontem');
});

test('CampoMoeda: o campo tem nome (padrão e personalizado)', () => {
  const padrao = renderizar(<CampoMoeda valor={0} onChangeValor={() => {}} />).acessiveis;
  expect(primeiro(padrao).accessibilityLabel).toBe('Valor em reais');
  const custom = renderizar(<CampoMoeda valor={0} onChangeValor={() => {}} acessibilidadeLabel="Quanto você tem agora" />).acessiveis;
  expect(primeiro(custom).accessibilityLabel).toBe('Quanto você tem agora');
});

test('LinhaMesProjetado: cada mês é lido inteiro, por extenso; o cabeçalho da tabela é escondido do leitor', () => {
  const item = { mes: '2026-11', entradas: 5000, saidas: 6500, saldo: -1500 };
  const { acessiveis } = renderizar(<LinhaMesProjetado item={item} cor="#EF5350" />);
  const texto = String(acessiveis[0].props.accessibilityLabel).replace(/\s/g, ' ');
  expect(texto).toContain('novembro de 2026');
  expect(texto).toContain('entra R$ 5.000,00');
  expect(texto).toContain('sai R$ 6.500,00');
  expect(texto).toContain('sobra no mês -R$ 1.500,00');
  expect(texto).toContain('saldo acumulado -R$ 1.500,00');

  const { arvore } = renderizar(<CabecalhoDosMeses />);
  const escondido = arvore.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityElementsHidden === true);
  expect(escondido.length).toBeGreaterThan(0);
});

test('rotuloFaladoDoCorte: fala "reduzir", não "menos dez por cento"', () => {
  expect(rotuloFaladoDoCorte(0, false)).toBe('Manter os gastos como estão');
  expect(rotuloFaladoDoCorte(10, false)).toBe('Reduzir 10%');
  expect(rotuloFaladoDoCorte(5, true)).toBe('Reduzir 5%, o necessário pra caber');
});

test('DECORATIVO esconde do leitor de tela no iOS e no Android', () => {
  expect(DECORATIVO.accessibilityElementsHidden).toBe(true);
  expect(DECORATIVO.importantForAccessibility).toBe('no-hide-descendants');
});
