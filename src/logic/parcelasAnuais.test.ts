import { nomearParcela, redimensionarParcelas } from './parcelasAnuais';

test('redimensionarParcelas: crescendo, mantém o que já existia e copia a data do último pro resto', () => {
  const atual = [
    { data: '2026-11-30', valor: 1600 },
    { data: '2026-12-20', valor: 1400 },
  ];
  const maior = redimensionarParcelas(atual, 4);
  expect(maior).toEqual([
    { data: '2026-11-30', valor: 1600 },
    { data: '2026-12-20', valor: 1400 },
    { data: '2026-12-20', valor: 0 },
    { data: '2026-12-20', valor: 0 },
  ]);
  // As 2 primeiras são os MESMOS objetos (não recria o que já existia).
  expect(maior[0]).toBe(atual[0]);
  expect(maior[1]).toBe(atual[1]);
});

test('redimensionarParcelas: encolhendo, corta do fim e preserva o resto intacto', () => {
  const atual = [
    { data: '2026-11-30', valor: 1600 },
    { data: '2026-12-10', valor: 500 },
    { data: '2026-12-20', valor: 900 },
  ];
  const menor = redimensionarParcelas(atual, 2);
  expect(menor).toEqual([
    { data: '2026-11-30', valor: 1600 },
    { data: '2026-12-10', valor: 500 },
  ]);
  expect(menor[0]).toBe(atual[0]);
});

test('redimensionarParcelas: mesma quantidade devolve a mesma referência (não mexe à toa)', () => {
  const atual = [{ data: '2026-11-30', valor: 1600 }];
  expect(redimensionarParcelas(atual, 1)).toBe(atual);
});

test('redimensionarParcelas: crescendo a partir de vazio não quebra (data em branco)', () => {
  expect(redimensionarParcelas([], 2)).toEqual([
    { data: '', valor: 0 },
    { data: '', valor: 0 },
  ]);
});

test('nomearParcela: numera a partir de 1, não do índice 0', () => {
  expect(nomearParcela('13º salário', 0, 2)).toBe('13º salário (1/2)');
  expect(nomearParcela('13º salário', 1, 2)).toBe('13º salário (2/2)');
  expect(nomearParcela('IPTU', 9, 10)).toBe('IPTU (10/10)');
});
