// Campo de valor em reais com máscara "de caixa eletrônico": a pessoa só
// digita números — sem vírgula, sem ponto de milhar, sem "R$" — e o valor
// cresce sozinho da direita pra esquerda (centavos primeiro), sempre já
// formatado como R$ 0,00. Apagar o último dígito reduz o valor de novo,
// mesmo comportamento de app de banco. Antes, os campos de valor eram
// texto livre (`CampoTexto` + `parsearValorMonetario` no salvar) — esse
// componente substitui isso só nos campos que são DE VERDADE um valor em
// reais (não taxas/porcentagens, que continuam texto livre).
import { CampoTexto } from './CampoTexto';
import { formatarReal } from '../utils/formatarReal';
import { interpretarDigitosComoReais } from '../utils/interpretarDigitosComoReais';

// Mesmo padrão de nome de prop que CampoCategoria já usa
// (valor/onChangeValor), pra ficar consistente com o resto do app.
export function CampoMoeda({
  valor,
  onChangeValor,
  placeholder = 'R$ 0,00',
  autoFocus,
}: {
  valor: number;
  onChangeValor: (valor: number) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <CampoTexto
      value={valor > 0 ? formatarReal(valor) : ''}
      onChangeText={(texto) => onChangeValor(interpretarDigitosComoReais(texto))}
      keyboardType="number-pad"
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  );
}
