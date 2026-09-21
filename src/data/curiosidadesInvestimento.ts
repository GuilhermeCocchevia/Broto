// Banco de curiosidades educativas sobre investimentos, mostradas uma por
// vez no Dashboard (ver DashboardScreen.tsx + logic/curiosidades.ts) — o
// objetivo é puramente educativo, nunca uma recomendação: só fatos públicos
// sobre como cada produto funciona, mesma linha já usada nos avisos de
// risco da Aposentadoria (ver AvisoAposentadoriaModal.tsx).
//
// Regra importante, reportada pelo próprio usuário testando: toda
// curiosidade aqui precisa se conectar com algo que o Simulador realmente
// oferece (Tesouro Selic, Tesouro RendA+, CDI, juros compostos, IR
// regressivo, custódia B3, Tabela Price) OU ser um conceito geral que não
// dependa de um produto específico (diversificação, inflação, renda fixa
// vs. risco). Nada de citar sigla que o app não deixa a pessoa explorar
// (LCI, LCA, CDB, FGC, ações, dividendos, FII...) — sem seguimento dentro
// do app, vira só decoreba solta, não educação de verdade.
//
// Começa com uma lista curta de propósito (fácil de testar/revisar) — dá
// pra ir adicionando mais frases aqui com o tempo, sem mexer em mais nada:
// quanto maior a lista, mais difícil repetir a mesma curiosidade em pouco
// tempo (ver escolherProximaCuriosidade em logic/curiosidades.ts).
export const curiosidadesInvestimento: string[] = [
  'Você sabia que o Tesouro Selic é considerado o investimento mais seguro e líquido do Brasil, podendo ser resgatado a qualquer momento sem perder o valor investido?',
  'Você sabia que títulos indexados à inflação, como o Tesouro RendA+ (o mesmo usado aqui na Aposentadoria), pagam uma taxa fixa ACIMA do IPCA — por isso são tão usados para objetivos de longuíssimo prazo?',
  'Você sabia que o CDI é a taxa que os bancos usam para emprestar dinheiro entre si, e serve de referência para a maioria dos investimentos de renda fixa no Brasil?',
  'Você sabia que, na renda fixa, o Imposto de Renda segue uma tabela regressiva? Quanto mais tempo o dinheiro fica investido, menor a alíquota — pode cair de 22,5% até 15%.',
  'Você sabia que a Poupança tem rendimento isento de Imposto de Renda, mas historicamente rende menos que o Tesouro Selic na maioria dos anos?',
  "Você sabia que 'renda fixa' não significa 'sem risco'? Significa que a regra de rendimento (uma taxa ou um índice) já é conhecida desde o início — diferente da renda variável, onde o retorno é incerto.",
  'Você sabia que diversificação significa distribuir o dinheiro entre investimentos diferentes, pra reduzir o impacto de um problema específico em qualquer um deles?',
  'Você sabia que juros compostos significam ganhar juros sobre os juros anteriores, não só sobre o valor investido? É isso que faz um valor pequeno crescer muito mais em prazos longos.',
  'Você sabia que a taxa de custódia da B3 cobra 0,20% ao ano sobre o valor investido no Tesouro Direto, mas é isenta pro Tesouro Selic até R$10 mil por CPF?',
  'Você sabia que o Tesouro RendA+ foi criado pelo Tesouro Nacional especificamente pra complementar a aposentadoria, devolvendo o valor investido em parcelas mensais a partir do vencimento escolhido?',
  'Você sabia que a inflação reduz o poder de compra do dinheiro parado com o tempo? Por isso, investimentos que rendem acima dela preservam (ou aumentam) o valor real do que você guarda.',
  'Você sabia que liquidez é a facilidade de transformar um investimento em dinheiro sem perder valor? O Tesouro Selic tem liquidez diária, mas o Tesouro RendA+ pode perder valor se vendido antes do vencimento, dependendo do preço de mercado do dia.',
  'Você sabia que a maioria dos parcelamentos no Brasil (inclusive no cartão de crédito) usa a Tabela Price, onde toda parcela tem o mesmo valor, mas a proporção entre juros e amortização muda mês a mês?',
  'Você sabia que juros de parcelamento funcionam como os juros compostos de um investimento — só que jogando contra você? Por isso comparar o custo total parcelado com o preço à vista muda bastante a decisão.',
];
