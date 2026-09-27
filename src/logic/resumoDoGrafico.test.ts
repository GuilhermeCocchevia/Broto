import { resumirGraficoParaLeitor } from './resumoDoGrafico';
import type { MesProjetado } from './projecao';

const mes = (m: string, saldo: number): MesProjetado => ({ mes: m, entradas: 0, saidas: 0, saldo });
const semEspacoEspecial = (texto: string) => texto.replace(/\s/g, ' ');

test('resume de onde parte, aonde chega e o ponto mais baixo, com meses por extenso', () => {
  const texto = semEspacoEspecial(
    resumirGraficoParaLeitor(0, [mes('2026-10', -100), mes('2026-11', -500), mes('2026-12', -300)]),
  );
  expect(texto).toContain('próximos 3 meses');
  expect(texto).toContain('Hoje: R$ 0,00');
  expect(texto).toContain('Em dezembro de 2026: -R$ 300,00, caindo em relação a hoje');
  expect(texto).toContain('Ponto mais baixo entre os meses: -R$ 500,00 em novembro de 2026');
});

test('tendência: subindo, estável e caindo', () => {
  expect(resumirGraficoParaLeitor(100, [mes('2026-10', 500)])).toContain('subindo');
  expect(resumirGraficoParaLeitor(100, [mes('2026-10', 100)])).toContain('estável');
  expect(resumirGraficoParaLeitor(100, [mes('2026-10', 50)])).toContain('caindo');
});

test('cita o cenário de +20% no dia a dia só quando ele existe', () => {
  const base = [mes('2026-10', 1000)];
  expect(resumirGraficoParaLeitor(0, base)).not.toContain('20%');
  const comPesado = semEspacoEspecial(resumirGraficoParaLeitor(0, base, [mes('2026-10', -200)]));
  expect(comPesado).toContain('Com 20% a mais de gasto no dia a dia, o saldo final seria -R$ 200,00');
});

test('um mês só fala no singular; sem meses, avisa que não há dados', () => {
  expect(resumirGraficoParaLeitor(0, [mes('2026-10', 1)])).toContain('próximos 1 mês.');
  expect(resumirGraficoParaLeitor(0, [])).toBe('Gráfico do saldo sem dados para mostrar.');
});
