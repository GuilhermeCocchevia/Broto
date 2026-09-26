import { categoriaCostumaSerAnual } from './categoriaCostumaSerAnual';

test('impostos e cobranças típicas do ano são reconhecidos, ignorando acento e caixa', () => {
  for (const nome of ['IPVA', 'iptu', 'Licenciamento do veículo', 'Matrícula escolar', 'Anuidade do cartão', 'Seguro do carro']) {
    expect(categoriaCostumaSerAnual(nome)).toBe(true);
  }
});

test('13º salário é reconhecido, mas número 13 dentro de outro número não', () => {
  expect(categoriaCostumaSerAnual('13º salário')).toBe(true);
  expect(categoriaCostumaSerAnual('Décimo terceiro')).toBe(true);
  expect(categoriaCostumaSerAnual('Plano 130')).toBe(false);
});

test('seguro-desemprego (benefício em parcelas) e categorias comuns não são sugeridos', () => {
  expect(categoriaCostumaSerAnual('Seguro-desemprego')).toBe(false);
  expect(categoriaCostumaSerAnual('Supermercado')).toBe(false);
  expect(categoriaCostumaSerAnual('')).toBe(false);
});
