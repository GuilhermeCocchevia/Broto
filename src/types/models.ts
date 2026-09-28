// Tipos que representam os dados do app: categorias, transações reais e simulações futuras.
// Ainda não tem banco por trás disso — são só os "formatos" que vamos usar em todo o código.

// Isto é uma "union de literais de string": o tipo só aceita esses dois valores exatos,
// nada de qualquer string. O TypeScript te barra em tempo de compilação se você digitar
// tipo: 'Receita' (maiúsculo) ou 'entrada' por engano.
// Poderíamos ter usado `enum` (recurso do TS), mas union de string é mais simples aqui:
// não gera código extra no JS final e funciona igual com autocomplete.
export type TipoTransacao = 'receita' | 'despesa';

// Uma transação pode ser única (aconteceu uma vez), mensal (se repete todo mês,
// tipo assinatura de streaming ou salário) ou anual (se repete todo ano, no
// mesmo mês e dia da `data` — IPVA, IPTU, seguro, matrícula, 13º salário).
export type Frequencia = 'unica' | 'mensal' | 'anual';

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
  // SQL não tem "undefined" — uma coluna sempre existe na linha, só que pode
  // guardar NULL. Por isso aqui é `string | null` (sempre presente) e não um
  // campo opcional com `?`: é o mesmo formato que volta quando lemos do banco.
  // null = repete pra sempre (sem data pra parar, tipo salário).
  dataFim: string | null;
};

// 'compra' = parcelamento de uma compra hipotética (comportamento original).
// 'economia' = meta de guardar dinheiro (ex: "juntar pra uma viagem").
// 'rendimento' = a mesma ideia de 'economia' (guardar um valor por mês),
// mas também simula esse valor RENDENDO a uma taxa — o usuário pode digitar
// livremente, ou usar uma taxa pública de referência (Selic/CDI, buscada
// sob demanda — ver taxasReferencia.ts) só como ponto de partida.
// 'aposentadoria' = mesma mecânica de 'rendimento', mas focada em
// longuíssimo prazo, com referência ao Tesouro RendA+ Aposentadoria Extra
// (o título que o próprio Tesouro Nacional desenhou pra isso) e avisos de
// risco obrigatórios na tela (iliquidez, vencimento real, IR). Em nenhum
// dos dois casos o app recomenda uma taxa nem um investimento específico,
// só faz a conta com o número escolhido.
// As quatro usam EXATAMENTE os mesmos campos por baixo
// (valorTotal/parcelas/taxaJurosMensal), só muda como a tela pergunta/mostra
// pra pessoa (ver NovaSimulacaoScreen.tsx) e a cor/marcador na lista (ver
// SimuladorScreen.tsx). Pra projeção de saldo (calcularSaldoProjetado), as
// quatro são idênticas: dinheiro compromissado some do disponível todo mês,
// não importa se é parcela de dívida, contribuição pra uma meta ou aporte
// de investimento — o efeito no "quanto sobra" é o mesmo; só o painel de
// rendimento projetado (exclusivo de 'rendimento'/'aposentadoria') usa
// `taxaJurosMensal` pra algo além dessa conta.
export type TipoSimulacao = 'compra' | 'economia' | 'rendimento' | 'aposentadoria';

export type Simulacao = {
  id: string;
  descricao: string;
  tipo: TipoSimulacao;
  // Pra 'compra': valor total da compra (ex: uma TV de R$1000).
  // Pra 'economia'/'rendimento'/'aposentadoria': valor total da meta (ex:
  // R$3000 pra uma viagem, ou R$3600 se a pessoa pretende guardar
  // R$300/mês por 12 meses).
  valorTotal: number;
  // Pra 'compra': número de parcelas (1 = à vista).
  // Pra 'economia'/'rendimento'/'aposentadoria': em quantos meses a pessoa
  // quer atingir a meta/fazer os aportes (pra 'aposentadoria', isso é
  // calculado a partir do vencimento real escolhido, ver
  // NovaSimulacaoScreen.tsx — não é um campo novo, é só a forma de
  // PREENCHER este mesmo campo).
  parcelas: number;
  // Data da primeira parcela (compra) ou do início da contribuição
  // (economia/rendimento/aposentadoria) — a partir dela é que o dashboard
  // projeta o impacto nos meses seguintes.
  dataInicio: string;
  categoriaId: string;
  // Taxa de juros AO MÊS, como fração (0.02 = 2% ao mês) — não em porcentagem
  // inteira, pra usar direto na fórmula de juros compostos sem converter toda
  // vez. 0 = sem juros (parcelamento "normal", divide igual — era o único
  // comportamento que existia antes desse campo existir; qualquer simulação
  // antiga no banco recebe 0 automaticamente, ver migration). Sempre 0 pra
  // 'economia' (meta de guardar dinheiro não tem juros). Pra
  // 'rendimento'/'aposentadoria', esse MESMO campo muda de sentido: não é
  // custo de parcelamento, é a taxa de rendimento esperada do valor
  // guardado (ver calcularValorFuturoComAportes/calcularValorFuturoLiquido
  // em projecao.ts/custosRendaFixa.ts) — o usuário quem informa (ou escolhe
  // de uma taxa pública de referência), o app nunca sugere um número.
  taxaJurosMensal: number;
  // Só usado por 'rendimento'/'aposentadoria' — sempre 0 pra 'compra'/
  // 'economia'. Um valor que a pessoa já tem guardado (fora do fluxo mensal
  // de aportes) e quer incluir na simulação: entra na conta de juros
  // compostos igual aos aportes mensais (ver
  // calcularValorFuturoComAportes/calcularValorFuturoLiquido), mas sai do
  // saldo projetado só UMA vez, no primeiro mês da simulação — não é
  // dividido entre os meses como o aporte recorrente (ver
  // calcularSaidaEfetivaNoMes em projecao.ts).
  aporteInicial: number;
  // Quando a simulação foi criada (não confundir com dataInicio da compra em si).
  // Serve pra ordenar "simulações recentes" numa lista, por exemplo.
  criadoEm: string;
};

// "Quanto eu tenho agora?" — não é uma entidade que se edita, é um registro
// insert-only: toda vez que o usuário atualiza o saldo, cria uma linha nova
// com data de agora, e o app sempre usa a mais recente como "o saldo atual".
// Mesma ideia de nunca fazer UPDATE que já usamos em todo o resto do app.
export type SaldoInicial = {
  id: string;
  valor: number;
  criadoEm: string;
};

// Insert-only, mesma ideia de SaldoInicial: cada linha é "o usuário
// desbloqueou essa conquista nesse momento" (ver logic/conquistas.ts pro
// catálogo de conquistas e a lógica que decide quais já foram alcançadas).
// `chave` é `string` solta aqui (não a union ChaveConquista) de propósito:
// models.ts não depende de nenhum catálogo específico, só do FORMATO da
// linha — a validação de "é uma chave conhecida?" mora em conquistas.ts.
export type ConquistaDesbloqueada = {
  id: string;
  chave: string;
  desbloqueadaEm: string;
};
