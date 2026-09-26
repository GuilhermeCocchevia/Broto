import { normalizarTexto } from './normalizarTexto';

// Palavras (já sem acento/caixa) que, no nome de uma categoria, indicam algo
// que o brasileiro costuma pagar/receber UMA vez por ano. É só uma dica pro
// formulário sugerir a frequência "Anual" — nunca decide nada sozinha.
const PALAVRAS_ANUAIS = ['ipva', 'iptu', 'licenciamento', 'matricula', 'anuidade', 'decimo terceiro', 'seguro'];

// "Seguro-desemprego" é um benefício pago em parcelas, não uma conta anual.
const EXCECOES = ['desemprego'];

export function categoriaCostumaSerAnual(nome: string): boolean {
  const texto = normalizarTexto(nome);
  if (!texto) return false;
  if (EXCECOES.some((excecao) => texto.includes(excecao))) return false;
  // "13º salário" / "13o": o número 13 sozinho (não parte de outro número).
  if (/(^|\D)13(\D|$)/.test(texto)) return true;
  return PALAVRAS_ANUAIS.some((palavra) => texto.includes(palavra));
}
