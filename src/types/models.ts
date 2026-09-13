// Tipos que representam os dados do app: categorias, transações reais e simulações futuras.
// Ainda não tem banco por trás disso — são só os "formatos" que vamos usar em todo o código.

// Isto é uma "union de literais de string": o tipo só aceita esses dois valores exatos,
// nada de qualquer string. O TypeScript te barra em tempo de compilação se você digitar
// tipo: 'Receita' (maiúsculo) ou 'entrada' por engano.
// Poderíamos ter usado `enum` (recurso do TS), mas union de string é mais simples aqui:
// não gera código extra no JS final e funciona igual com autocomplete.
export type TipoTransacao = 'receita' | 'despesa';

// Uma transação pode ser única (aconteceu uma vez) ou mensal (se repete todo mês,
// tipo assinatura de streaming ou salário).
export type Frequencia = 'unica' | 'mensal';

export type Categoria = {
  id: string;
  nome: string;
  tipo: TipoTransacao;
  // Cor em hex (ex: '#4CAF50') pra usar nos ícones/gráficos do dashboard gameficado.
  cor: string;
};

export type Transacao = {
  id: string;
  descricao: string;
  valor: number;
  // Data no formato ISO 'AAAA-MM-DD', ex: '2026-09-13'.
  // Guardamos como string (não como objeto Date) porque é isso que o SQLite entende
  // nativamente, e string ISO ordena certinho em ordem alfabética = ordem cronológica.
  data: string;
  tipo: TipoTransacao;
  categoriaId: string;
  frequencia: Frequencia;
  // O `?` marca campo opcional: só faz sentido existir quando frequencia === 'mensal'.
  // undefined = repete pra sempre (sem data pra parar, tipo salário).
  dataFim?: string;
};

export type Simulacao = {
  id: string;
  descricao: string;
  // Valor total da compra simulada, ex: uma TV de R$1000.
  valorTotal: number;
  // Número de parcelas. 1 = à vista, pagou tudo de uma vez.
  parcelas: number;
  // Data da primeira parcela — a partir dela é que o dashboard projeta o impacto
  // nos meses seguintes.
  dataInicio: string;
  categoriaId: string;
  // Quando a simulação foi criada (não confundir com dataInicio da compra em si).
  // Serve pra ordenar "simulações recentes" numa lista, por exemplo.
  criadoEm: string;
};
