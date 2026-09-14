// Listas de nomes comuns de categoria, pra sugerir enquanto o usuário digita
// (ver NovaCategoriaScreen.tsx). É só um ponto de partida pra padronizar o
// nome de categorias parecidas ("Salário" vs "salario" vs "Meu salário") —
// o usuário sempre pode digitar um nome que não está aqui, isso é só uma
// lista de sugestões, nunca uma lista fechada.

export type SugestaoCategoria = {
  // O que aparece no chip e vira o nome da categoria se o usuário tocar nele.
  nome: string;
  // Palavras extras que também devem "achar" essa sugestão na busca, além
  // do próprio nome — sem isso, digitar "INSS" nunca encontraria
  // "Aposentadoria por invalidez" (o nome de exibição não tem "INSS"
  // escrito), e digitar "benefício" nunca juntaria todos os tipos de
  // benefício do governo numa lista só.
  apelidos?: string[];
};

// Junta o nome + os apelidos numa string só, pronta pra comparar com o que
// o usuário digitou — usada em NovaCategoriaScreen.tsx pra filtrar.
export function textoBuscavelDaSugestao(sugestao: SugestaoCategoria): string {
  return [sugestao.nome, ...(sugestao.apelidos ?? [])].join(' ');
}

export const SUGESTOES_RECEITA: SugestaoCategoria[] = [
  // Trabalho
  { nome: 'Salário CLT', apelidos: ['salario', 'trabalho', 'clt'] },
  { nome: 'Salário PJ', apelidos: ['salario', 'trabalho', 'pessoa juridica'] },
  { nome: '13º salário', apelidos: ['decimo terceiro', 'salario'] },
  { nome: 'Férias', apelidos: ['salario'] },
  { nome: 'Hora extra', apelidos: ['salario', 'trabalho'] },
  { nome: 'Comissão', apelidos: ['trabalho', 'vendas'] },
  { nome: 'Bônus', apelidos: ['plr', 'participacao nos lucros', 'trabalho'] },
  { nome: 'Freelance', apelidos: ['trabalho autonomo', 'bico', 'pj'] },
  { nome: 'Renda extra', apelidos: ['bico'] },

  // Aposentadoria e INSS
  {
    nome: 'Aposentadoria por tempo de contribuição',
    apelidos: ['inss', 'aposentadoria', 'beneficio', 'previdencia'],
  },
  {
    nome: 'Aposentadoria por idade',
    apelidos: ['inss', 'aposentadoria', 'beneficio', 'previdencia'],
  },
  {
    nome: 'Aposentadoria por invalidez',
    apelidos: ['inss', 'aposentadoria', 'beneficio', 'previdencia', 'invalidez', 'incapacidade'],
  },
  {
    nome: 'Auxílio-doença',
    apelidos: ['inss', 'beneficio', 'previdencia', 'incapacidade temporaria', 'afastamento'],
  },
  { nome: 'Auxílio-acidente', apelidos: ['inss', 'beneficio', 'previdencia', 'acidente'] },
  { nome: 'Salário-maternidade', apelidos: ['inss', 'beneficio', 'previdencia', 'maternidade'] },
  {
    nome: 'BPC/LOAS',
    apelidos: [
      'inss',
      'beneficio',
      'previdencia',
      'assistencia social',
      'idoso',
      'deficiencia',
      'loas',
      'bpc',
      'prestacao continuada',
    ],
  },

  // Pensões
  { nome: 'Pensão por morte (INSS)', apelidos: ['inss', 'beneficio', 'previdencia', 'pensao'] },
  { nome: 'Pensão alimentícia', apelidos: ['pensao'] },
  {
    nome: 'Pensão de militar',
    apelidos: ['pensao', 'militar', 'beneficio', 'forcas armadas', 'exercito'],
  },
  { nome: 'Pensão especial', apelidos: ['pensao', 'beneficio'] },

  // Benefícios sociais / governo
  {
    nome: 'Bolsa Família',
    apelidos: ['beneficio', 'auxilio brasil', 'governo', 'assistencia social'],
  },
  { nome: 'Auxílio Gás', apelidos: ['beneficio', 'vale-gas', 'governo', 'assistencia social'] },
  { nome: 'Auxílio Emergencial', apelidos: ['beneficio', 'governo', 'assistencia social'] },
  { nome: 'Seguro-desemprego', apelidos: ['beneficio', 'governo'] },
  { nome: 'Abono salarial (PIS/PASEP)', apelidos: ['beneficio', 'pis', 'pasep', 'governo'] },
  { nome: 'Saque do FGTS', apelidos: ['fgts', 'governo'] },

  // Investimentos e patrimônio
  { nome: 'Aluguel recebido', apelidos: ['imovel'] },
  { nome: 'Dividendos', apelidos: ['investimentos', 'acoes', 'bolsa de valores'] },
  { nome: 'Juros sobre capital próprio', apelidos: ['jcp', 'investimentos'] },
  { nome: 'Rendimento de investimentos', apelidos: ['cdb', 'tesouro direto', 'poupanca', 'renda fixa'] },
  { nome: 'Venda de imóvel', apelidos: ['venda'] },
  { nome: 'Venda de veículo', apelidos: ['venda'] },
  { nome: 'Venda de produtos', apelidos: ['venda'] },

  // Outros
  { nome: 'Restituição de imposto de renda', apelidos: ['imposto de renda', 'ir'] },
  { nome: 'Reembolso', apelidos: [] },
  { nome: 'Cashback', apelidos: [] },
  { nome: 'Prêmio', apelidos: ['sorteio', 'loteria'] },
  { nome: 'Presente recebido', apelidos: ['doacao'] },
  { nome: 'Herança', apelidos: [] },
];

export const SUGESTOES_DESPESA: SugestaoCategoria[] = [
  // Moradia
  { nome: 'Aluguel', apelidos: ['moradia', 'casa'] },
  { nome: 'Condomínio', apelidos: ['moradia'] },
  { nome: 'Financiamento imobiliário', apelidos: ['casa propria', 'moradia'] },
  { nome: 'IPTU', apelidos: ['imposto', 'moradia'] },
  { nome: 'Manutenção da casa', apelidos: ['moradia', 'reforma'] },
  // Contas
  { nome: 'Água', apelidos: ['conta'] },
  { nome: 'Luz', apelidos: ['conta', 'energia eletrica'] },
  { nome: 'Gás', apelidos: ['conta'] },
  { nome: 'Internet', apelidos: ['conta', 'wifi'] },
  { nome: 'Telefone', apelidos: ['conta', 'celular'] },
  { nome: 'Streaming', apelidos: ['assinatura'] },
  // Alimentação
  { nome: 'Supermercado', apelidos: ['mercado', 'alimentacao'] },
  { nome: 'Restaurante', apelidos: ['alimentacao'] },
  { nome: 'Delivery', apelidos: ['alimentacao', 'ifood'] },
  { nome: 'Lanche', apelidos: ['alimentacao'] },
  // Transporte
  { nome: 'Combustível', apelidos: ['gasolina', 'alcool', 'transporte'] },
  { nome: 'Transporte público', apelidos: ['onibus', 'metro', 'transporte'] },
  { nome: 'Aplicativo de transporte', apelidos: ['uber', '99', 'transporte'] },
  { nome: 'Manutenção do carro', apelidos: ['mecanico', 'transporte'] },
  { nome: 'Seguro do carro', apelidos: ['transporte'] },
  { nome: 'Estacionamento', apelidos: ['transporte'] },
  // Saúde
  { nome: 'Plano de saúde', apelidos: ['saude'] },
  { nome: 'Farmácia', apelidos: ['remedio', 'saude'] },
  { nome: 'Consulta médica', apelidos: ['medico', 'saude'] },
  { nome: 'Academia', apelidos: ['saude', 'exercicio'] },
  // Educação
  { nome: 'Mensalidade escolar', apelidos: ['escola', 'educacao'] },
  { nome: 'Faculdade', apelidos: ['universidade', 'educacao'] },
  { nome: 'Cursos', apelidos: ['educacao'] },
  { nome: 'Material escolar', apelidos: ['educacao'] },
  // Lazer
  { nome: 'Cinema', apelidos: ['lazer'] },
  { nome: 'Viagem', apelidos: ['lazer', 'ferias'] },
  { nome: 'Assinaturas', apelidos: ['lazer'] },
  { nome: 'Hobbies', apelidos: ['lazer'] },
  // Compras
  { nome: 'Roupas', apelidos: ['vestuario', 'compras'] },
  { nome: 'Eletrônicos', apelidos: ['compras'] },
  { nome: 'Presentes', apelidos: ['compras'] },
  // Financeiro
  { nome: 'Cartão de crédito', apelidos: ['fatura'] },
  { nome: 'Empréstimo', apelidos: [] },
  { nome: 'Financiamento', apelidos: [] },
  { nome: 'Juros', apelidos: [] },
  { nome: 'Taxa bancária', apelidos: ['tarifa'] },
  // Pets
  { nome: 'Pet shop', apelidos: ['pet', 'animal'] },
  { nome: 'Veterinário', apelidos: ['pet', 'animal'] },
  { nome: 'Ração', apelidos: ['pet', 'animal'] },
  // Filhos
  { nome: 'Mesada', apelidos: ['filhos'] },
  { nome: 'Itens infantis', apelidos: ['filhos', 'fraldas'] },
  // Outros
  { nome: 'Imposto de renda', apelidos: ['ir'] },
  { nome: 'Doação', apelidos: [] },
  { nome: 'Imprevistos', apelidos: [] },
];
