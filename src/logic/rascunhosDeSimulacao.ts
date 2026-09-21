import type { TipoSimulacao } from '../types/models';

// Os campos do formulário de simulação que pertencem a UM tipo (compra,
// meta de economia, rendimento, aposentadoria). O formulário é um só, mas
// cada tipo guarda o seu próprio rascunho: preencher "Rendimento" (inclusive
// o autopreenchimento com a sobra do mês) não pode vazar pros outros tipos
// quando a pessoa troca de aba — antes todos compartilhavam os mesmos campos.
export type RascunhoDeSimulacao = {
  descricao: string;
  valor: number;
  parcelasTexto: string;
  dataAlvoTexto: string;
  taxaJurosTexto: string;
  direcaoInvestimento: 'meta' | 'aporte';
  aporteInicial: number;
  categoriaTexto: string;
};

export type RascunhosPorTipo = Partial<Record<TipoSimulacao, RascunhoDeSimulacao>>;

// Rascunho em branco — o ponto de partida de um tipo que ainda não foi
// preenchido. `hoje` ('AAAA-MM-DD') só existe porque o seletor de data
// precisa de uma data válida pra abrir.
export function criarRascunhoVazio(hoje: string): RascunhoDeSimulacao {
  return {
    descricao: '',
    valor: 0,
    parcelasTexto: '1',
    dataAlvoTexto: hoje,
    taxaJurosTexto: '',
    direcaoInvestimento: 'meta',
    aporteInicial: 0,
    categoriaTexto: '',
  };
}

// Devolve um NOVO mapa com o rascunho salvo (nunca muta o anterior).
export function guardarRascunho(
  rascunhos: RascunhosPorTipo,
  tipo: TipoSimulacao,
  rascunho: RascunhoDeSimulacao,
): RascunhosPorTipo {
  return { ...rascunhos, [tipo]: rascunho };
}

// O rascunho guardado do tipo, ou um em branco se essa aba nunca foi
// preenchida.
export function obterRascunho(
  rascunhos: RascunhosPorTipo,
  tipo: TipoSimulacao,
  hoje: string,
): RascunhoDeSimulacao {
  return rascunhos[tipo] ?? criarRascunhoVazio(hoje);
}
