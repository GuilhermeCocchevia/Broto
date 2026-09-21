import { criarRascunhoVazio, guardarRascunho, obterRascunho } from './rascunhosDeSimulacao';

const HOJE = '2026-09-20';

test('tipo que nunca foi preenchido abre em branco', () => {
  expect(obterRascunho({}, 'compra', HOJE)).toEqual(criarRascunhoVazio(HOJE));
});

test('rascunho guardado num tipo não aparece em nenhum outro', () => {
  const reserva = {
    ...criarRascunhoVazio(HOJE),
    descricao: 'Reserva de emergência',
    valor: 376.6,
    parcelasTexto: '12',
    taxaJurosTexto: '1.0794',
    direcaoInvestimento: 'aporte' as const,
    categoriaTexto: 'Aporte em investimentos',
  };

  const rascunhos = guardarRascunho({}, 'rendimento', reserva);

  expect(obterRascunho(rascunhos, 'rendimento', HOJE)).toEqual(reserva);
  for (const outro of ['compra', 'economia', 'aposentadoria'] as const) {
    expect(obterRascunho(rascunhos, outro, HOJE)).toEqual(criarRascunhoVazio(HOJE));
  }
});

test('voltar pra um tipo recupera exatamente o que estava nele', () => {
  const compra = { ...criarRascunhoVazio(HOJE), descricao: 'TV nova', valor: 2500 };
  const rendimento = { ...criarRascunhoVazio(HOJE), descricao: 'Reserva', valor: 300 };

  let rascunhos = guardarRascunho({}, 'compra', compra);
  rascunhos = guardarRascunho(rascunhos, 'rendimento', rendimento);

  expect(obterRascunho(rascunhos, 'compra', HOJE)).toEqual(compra);
  expect(obterRascunho(rascunhos, 'rendimento', HOJE)).toEqual(rendimento);
});

test('guardarRascunho não muta o mapa anterior', () => {
  const antes = {};
  guardarRascunho(antes, 'compra', criarRascunhoVazio(HOJE));
  expect(antes).toEqual({});
});
