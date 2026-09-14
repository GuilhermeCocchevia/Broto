// Traduz erros técnicos (na prática, quase sempre do SQLite/Drizzle) pra uma
// frase que o usuário consegue entender, sem esconder o detalhe técnico —
// só ele vem depois, pra quem quiser/precisar ver.
export function mensagemDeErro(erro: unknown, acao: 'salvar' | 'excluir'): string {
  const detalhe = String(erro);

  if (detalhe.includes('FOREIGN KEY constraint failed')) {
    return acao === 'excluir'
      ? 'Não consegui excluir: existem outros registros que dependem disso.'
      : 'Não consegui salvar: a categoria escolhida não existe mais.';
  }

  const acaoTexto = acao === 'excluir' ? 'excluir' : 'salvar';
  return `Não consegui ${acaoTexto}. Detalhe técnico: ${detalhe}`;
}
