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
  { nome: 'Manutenção da casa', apelidos: ['moradia', 'reforma', 'reparo', 'conserto'] },
  {
    nome: 'Produtos de limpeza',
    apelidos: ['limpeza', 'limpeza domestica', 'detergente', 'desinfetante', 'material de limpeza'],
  },
  { nome: 'Móveis e decoração', apelidos: ['casa', 'mobilia', 'moradia'] },
  { nome: 'Eletrodomésticos', apelidos: ['casa', 'moradia'] },
  { nome: 'Seguro residencial', apelidos: ['casa', 'moradia', 'seguro'] },
  { nome: 'Diarista', apelidos: ['faxina', 'limpeza', 'domestica', 'moradia'] },

  // Contas
  { nome: 'Água', apelidos: ['conta'] },
  { nome: 'Luz', apelidos: ['conta', 'energia eletrica'] },
  { nome: 'Gás', apelidos: ['conta'] },
  { nome: 'Internet', apelidos: ['conta', 'wifi'] },
  { nome: 'Telefone', apelidos: ['conta', 'celular'] },
  { nome: 'TV por assinatura', apelidos: ['conta', 'tv a cabo', 'sky', 'claro tv'] },

  // Assinaturas e serviços digitais — "mundo moderno": cada uma dessas
  // categorias cobre várias marcas/apps parecidos (o apelido é o que muda
  // de pessoa pra pessoa, a categoria em si fica genérica).
  {
    nome: 'Streaming de vídeo',
    apelidos: ['netflix', 'amazon prime', 'disney', 'hbo max', 'streaming', 'assinatura'],
  },
  {
    nome: 'Streaming de música',
    apelidos: ['spotify', 'deezer', 'apple music', 'streaming', 'assinatura', 'musica'],
  },
  {
    nome: 'Assinatura de IA',
    apelidos: [
      'chatgpt',
      'claude',
      'gemini',
      'copilot',
      'inteligencia artificial',
      'ia',
      'assinatura',
    ],
  },
  {
    nome: 'Assinatura de jogos',
    apelidos: ['xbox game pass', 'playstation plus', 'jogos', 'games', 'assinatura'],
  },
  {
    nome: 'Armazenamento em nuvem',
    apelidos: ['icloud', 'google one', 'dropbox', 'nuvem', 'assinatura'],
  },
  {
    nome: 'Ferramentas e produtividade',
    apelidos: ['microsoft 365', 'google workspace', 'notion', 'office', 'assinatura', 'software'],
  },
  { nome: 'Livros e audiobooks', apelidos: ['kindle', 'audible', 'assinatura', 'leitura'] },

  // Alimentação
  { nome: 'Supermercado', apelidos: ['mercado', 'alimentacao'] },
  { nome: 'Padaria', apelidos: ['alimentacao', 'pao'] },
  { nome: 'Açougue', apelidos: ['alimentacao', 'carne'] },
  { nome: 'Feira', apelidos: ['alimentacao', 'hortifruti', 'frutas', 'verduras'] },
  { nome: 'Restaurante', apelidos: ['alimentacao'] },
  { nome: 'Delivery', apelidos: ['alimentacao', 'ifood'] },
  { nome: 'Lanche', apelidos: ['alimentacao', 'cafe'] },

  // Transporte
  {
    nome: 'Compra de carro',
    apelidos: ['veiculo', 'carro novo', 'carro usado', 'financiamento', 'financiamento de veiculo'],
  },
  {
    nome: 'Compra de moto',
    apelidos: [
      'veiculo',
      'motocicleta',
      'moto nova',
      'moto usada',
      'financiamento',
      'financiamento de veiculo',
    ],
  },
  { nome: 'Combustível', apelidos: ['gasolina', 'alcool', 'diesel', 'transporte', 'abastecimento'] },
  { nome: 'Transporte público', apelidos: ['onibus', 'metro', 'trem', 'transporte'] },
  { nome: 'Aplicativo de transporte', apelidos: ['uber', '99', 'transporte'] },
  {
    nome: 'Manutenção do carro',
    apelidos: ['mecanico', 'revisao', 'transporte', 'veiculo', 'carro'],
  },
  {
    nome: 'Manutenção da moto',
    apelidos: ['mecanico', 'revisao', 'transporte', 'veiculo', 'motocicleta', 'moto'],
  },
  {
    nome: 'Manutenção da bicicleta',
    apelidos: ['bike', 'transporte', 'veiculo', 'bicicleta'],
  },
  { nome: 'Seguro do carro', apelidos: ['transporte', 'veiculo', 'seguro'] },
  { nome: 'Seguro da moto', apelidos: ['transporte', 'veiculo', 'motocicleta', 'seguro'] },
  { nome: 'IPVA', apelidos: ['imposto', 'transporte', 'veiculo', 'carro', 'moto'] },
  { nome: 'Licenciamento do veículo', apelidos: ['imposto', 'transporte', 'veiculo', 'carro', 'moto', 'crlv', 'detran'] },
  { nome: 'Estacionamento', apelidos: ['transporte'] },
  { nome: 'Pedágio', apelidos: ['transporte'] },
  { nome: 'Multa de trânsito', apelidos: ['transporte', 'veiculo'] },
  { nome: 'Lavagem do carro', apelidos: ['transporte', 'veiculo', 'lava rapido'] },

  // Saúde
  { nome: 'Plano de saúde', apelidos: ['convenio medico', 'saude'] },
  { nome: 'Farmácia', apelidos: ['remedio', 'saude', 'drogaria'] },
  { nome: 'Consulta médica', apelidos: ['medico', 'saude'] },
  { nome: 'Exame médico', apelidos: ['saude', 'laboratorio', 'exame'] },
  { nome: 'Dentista', apelidos: ['odontologia', 'saude'] },
  { nome: 'Fisioterapia', apelidos: ['saude'] },
  { nome: 'Psicólogo', apelidos: ['terapia', 'saude mental', 'saude'] },
  { nome: 'Academia', apelidos: ['saude', 'exercicio', 'malhacao'] },
  { nome: 'Óculos e lentes', apelidos: ['otica', 'saude'] },
  { nome: 'Suplementos e vitaminas', apelidos: ['saude'] },

  // Higiene e beleza
  {
    nome: 'Higiene pessoal',
    apelidos: [
      'higiene',
      'produtos de higiene',
      'sabonete',
      'shampoo',
      'pasta de dente',
      'desodorante',
      'papel higienico',
    ],
  },
  {
    nome: 'Maquiagem e produtos estéticos',
    apelidos: ['beleza', 'maquiagem', 'cosmeticos', 'skincare', 'perfumaria'],
  },
  {
    nome: 'Cabeleireiro e salão de beleza',
    apelidos: ['beleza', 'cabelo', 'salao', 'manicure', 'pedicure', 'barbearia'],
  },

  // Educação
  { nome: 'Mensalidade escolar', apelidos: ['escola', 'educacao'] },
  { nome: 'Matrícula escolar', apelidos: ['escola', 'educacao', 'material escolar'] },
  { nome: 'Faculdade', apelidos: ['universidade', 'educacao'] },
  { nome: 'Cursos', apelidos: ['educacao', 'capacitacao'] },
  { nome: 'Aula de idiomas', apelidos: ['ingles', 'espanhol', 'idiomas', 'educacao'] },
  { nome: 'Aula de música', apelidos: ['instrumento', 'violao', 'piano', 'canto', 'educacao'] },
  {
    nome: 'Aula de esporte ou dança',
    apelidos: ['natacao', 'luta', 'danca', 'yoga', 'lutas', 'educacao'],
  },
  { nome: 'Autoescola', apelidos: ['carteira de motorista', 'cnh', 'educacao'] },
  { nome: 'Material escolar', apelidos: ['educacao'] },
  { nome: 'Livros', apelidos: ['educacao', 'leitura'] },

  // Lazer
  // "Lazer" genérico primeiro — pra quando nenhuma das opções mais
  // específicas abaixo encaixa direito, sem forçar o usuário a escolher
  // uma categoria errada só pra ter alguma.
  { nome: 'Lazer', apelidos: ['entretenimento', 'diversao', 'programa'] },
  { nome: 'Cinema', apelidos: ['lazer'] },
  { nome: 'Viagem', apelidos: ['lazer', 'ferias', 'turismo'] },
  { nome: 'Assinaturas', apelidos: ['lazer'] },
  { nome: 'Hobbies', apelidos: ['lazer'] },
  { nome: 'Bar e balada', apelidos: ['lazer'] },
  { nome: 'Shows e eventos', apelidos: ['lazer', 'ingresso'] },

  // Compras
  { nome: 'Roupas', apelidos: ['vestuario', 'compras'] },
  { nome: 'Calçados', apelidos: ['vestuario', 'compras', 'sapato', 'tenis'] },
  { nome: 'Bolsas e acessórios', apelidos: ['bolsa', 'mochila', 'carteira', 'acessorios', 'compras'] },
  { nome: 'Eletrônicos', apelidos: ['compras', 'tecnologia'] },
  { nome: 'Presentes', apelidos: ['compras'] },
  { nome: 'Papelaria', apelidos: ['compras'] },
  { nome: 'Loja de departamento', apelidos: ['compras', 'loja'] },

  // Financeiro
  { nome: 'Cartão de crédito', apelidos: ['fatura'] },
  { nome: 'Anuidade do cartão', apelidos: ['cartao', 'tarifa', 'banco'] },
  { nome: 'Empréstimo', apelidos: [] },
  { nome: 'Financiamento', apelidos: [] },
  { nome: 'Juros', apelidos: [] },
  { nome: 'Taxa bancária', apelidos: ['tarifa'] },
  { nome: 'Seguro de vida', apelidos: ['seguro'] },
  { nome: 'Aporte em investimentos', apelidos: ['investimentos', 'poupanca'] },

  // Pets
  { nome: 'Pet shop', apelidos: ['pet', 'animal'] },
  { nome: 'Veterinário', apelidos: ['pet', 'animal'] },
  { nome: 'Ração', apelidos: ['pet', 'animal'] },
  { nome: 'Banho e tosa', apelidos: ['pet', 'animal'] },

  // Filhos
  { nome: 'Mesada', apelidos: ['filhos'] },
  { nome: 'Itens infantis', apelidos: ['filhos', 'fraldas'] },
  { nome: 'Brinquedos', apelidos: ['filhos'] },
  { nome: 'Babá ou creche', apelidos: ['filhos', 'cuidado infantil'] },

  // Outros
  { nome: 'Imposto de renda', apelidos: ['ir'] },
  { nome: 'Outras taxas e impostos', apelidos: ['imposto', 'taxa'] },
  { nome: 'Doação', apelidos: [] },
  { nome: 'Imprevistos', apelidos: [] },
];
