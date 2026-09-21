import { calcularEscalaDoGrafico } from './escalaGrafico';

const ALTURA = 180;
const PROPORCAO = 1.5;

test('série com saldo positivo mantém o comportamento de sempre (pico ocupa a altura toda)', () => {
  const escala = calcularEscalaDoGrafico([1000, 800, 1200], ALTURA, PROPORCAO);
  expect(escala).toEqual({ maxValue: 1200, mostNegativeValue: 0, altura: ALTURA });
});

test('série mista: o lado negativo real é usado, limitado a 1,5x o pico', () => {
  expect(calcularEscalaDoGrafico([1000, -500], ALTURA, PROPORCAO).mostNegativeValue).toBe(-500);
  expect(calcularEscalaDoGrafico([1000, -5000], ALTURA, PROPORCAO).mostNegativeValue).toBe(-1500);
});

test('sem nenhum valor positivo: a altura total continua sendo a de sempre (sem vazio em cima)', () => {
  // Hoje R$0 e uma queda até -1480,80 (caso real reportado).
  const escala = calcularEscalaDoGrafico([0, -123.4, -500, -1480.8], ALTURA, PROPORCAO);
  const parteNegativa = (escala.altura * -escala.mostNegativeValue) / escala.maxValue;

  expect(escala.altura + parteNegativa).toBeCloseTo(ALTURA);
  // O espaço acima do zero é só uma folga pequena, não os 180px de antes.
  expect(escala.altura).toBeLessThan(ALTURA * 0.2);
});

test('sem nenhum valor positivo: não achata a queda (piso é o valor real mais fundo)', () => {
  const escala = calcularEscalaDoGrafico([0, -500, -1480.8], ALTURA, PROPORCAO);
  expect(escala.mostNegativeValue).toBe(-1480.8);
});

test('tudo zero cai no caminho normal (nada a escalar)', () => {
  expect(calcularEscalaDoGrafico([0, 0, 0], ALTURA, PROPORCAO)).toEqual({
    maxValue: 100,
    mostNegativeValue: 0,
    altura: ALTURA,
  });
});
