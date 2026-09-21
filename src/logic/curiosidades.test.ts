import { escolherProximaCuriosidade } from './curiosidades';

test('escolherProximaCuriosidade nunca repete o índice anterior (rodando várias vezes)', () => {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const indiceAnterior = tentativa % 5;
    const escolhido = escolherProximaCuriosidade(5, indiceAnterior);
    expect(escolhido).not.toBe(indiceAnterior);
  }
});

test('escolherProximaCuriosidade sempre devolve um índice dentro do intervalo válido', () => {
  for (let tentativa = 0; tentativa < 200; tentativa++) {
    const escolhido = escolherProximaCuriosidade(18, null);
    expect(escolhido).toBeGreaterThanOrEqual(0);
    expect(escolhido).toBeLessThan(18);
  }
});

test('escolherProximaCuriosidade com uma lista de 1 item só sempre devolve 0 (não trava)', () => {
  expect(escolherProximaCuriosidade(1, 0)).toBe(0);
  expect(escolherProximaCuriosidade(1, null)).toBe(0);
});

test('escolherProximaCuriosidade aceita indiceAnterior nulo (primeira vez que o app abre)', () => {
  const escolhido = escolherProximaCuriosidade(18, null);
  expect(escolhido).toBeGreaterThanOrEqual(0);
  expect(escolhido).toBeLessThan(18);
});
