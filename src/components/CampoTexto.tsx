// TextInput com o mesmo visual em toda tela de formulário — antes cada tela
// (Nova Transação, Nova Categoria, Nova Simulação, Atualizar Saldo, e o
// campo de categoria) tinha sua PRÓPRIA cópia do estilo `input`. Além de
// juntar isso num componente só, aproveita pra dar um pouco mais de
// "capricho": cantos mais arredondados (igual o resto do app depois da
// polida do Dashboard), uma sombra bem sutil (o input parecia colado no
// fundo, sem nenhuma profundidade) e um contorno colorido quando o campo
// está em foco — algo que não existia antes (nenhum feedback visual de
// "você está digitando aqui agora").
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

export function CampoTexto(props: TextInputProps) {
  const [focado, setFocado] = useState(false);

  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[styles.input, focado && styles.inputFocado, props.style]}
      onFocus={(evento) => {
        setFocado(true);
        props.onFocus?.(evento);
      }}
      onBlur={(evento) => {
        setFocado(false);
        props.onBlur?.(evento);
      }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    // Borda transparente (não `0`) enquanto sem foco: reserva o mesmo
    // espaço que a borda colorida vai ocupar no foco, então o campo não
    // "pula" de tamanho quando o usuário toca nele.
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    // Sombra bem discreta — só o suficiente pra separar o campo do fundo
    // creme, sem competir com os cartões/botões que têm sombra mais forte.
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  inputFocado: {
    borderColor: colors.primary,
  },
});
