// Campo de data com o seletor nativo do sistema — a mesma "rodinha" que
// aparece no Calendário/Lembretes da Apple. Substitui o texto livre no
// formato 'AAAA-MM-DD' (com traço, ninguém no Brasil escreve data assim) —
// agora a pessoa só toca, escolhe no seletor, e nunca digita nada: fica
// impossível gravar uma data mal formatada ou inexistente (dia 31 de
// fevereiro), a validação manual (`validarData`) vira desnecessária pra
// quem usa este campo. O valor exposto pra fora continua sendo string ISO
// 'AAAA-MM-DD' — é isso que o banco espera (ver comentário em
// models.ts) — só a EXIBIÇÃO troca pra DD/MM/AAAA.
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { converterDateParaIso, converterIsoParaDate, formatarDataBr } from '../utils/formatarDataBr';

// 'AAAA-MM-DD' de hoje/ontem — mesmo cálculo simples usado em toda tela que
// já inicializa data com "hoje" (ex: `new Date().toISOString().slice(0,10)`),
// só que em hora LOCAL (ver formatarDataBr.ts) pra não ter risco de
// "ontem" virar "hoje" perto da meia-noite em fusos adiantados.
function isoDeHoje(): string {
  return converterDateParaIso(new Date());
}
function isoDeOntem(): string {
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  return converterDateParaIso(ontem);
}

export function CampoData({
  valor,
  onChangeValor,
  atalhosRapidos = false,
}: {
  valor: string;
  onChangeValor: (valor: string) => void;
  // "Hoje"/"Ontem" — só faz sentido em campos onde isso é comum (ex: data
  // de uma compra), não em toda data do app (ex: vencimento de
  // aposentadoria, décadas no futuro).
  atalhosRapidos?: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  function selecionar(iso: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeValor(iso);
  }

  function aoMudarNoSeletor(evento: DateTimePickerEvent, dataEscolhida?: Date) {
    // No Android, o seletor já É um diálogo modal do sistema — fecha
    // sozinho, então só precisamos esconder o nosso (que nem chegou a
    // aparecer de verdade, ver JSX). No iOS, o seletor "spinner" fica
    // embutido na tela sem esse diálogo — quem fecha é o botão "Concluído"
    // logo abaixo dele.
    if (Platform.OS === 'android') {
      setAberto(false);
    }
    if (evento.type === 'set' && dataEscolhida) {
      onChangeValor(converterDateParaIso(dataEscolhida));
    }
  }

  return (
    <View>
      <Pressable
        style={[styles.campo, aberto && styles.campoAberto]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAberto((atual) => !atual);
        }}
      >
        <Text style={styles.texto}>{formatarDataBr(valor)}</Text>
      </Pressable>

      {atalhosRapidos && (
        <View style={styles.atalhos}>
          <Pressable style={styles.atalhoBotao} onPress={() => selecionar(isoDeHoje())}>
            <Text style={styles.atalhoTexto}>Hoje</Text>
          </Pressable>
          <Pressable style={styles.atalhoBotao} onPress={() => selecionar(isoDeOntem())}>
            <Text style={styles.atalhoTexto}>Ontem</Text>
          </Pressable>
        </View>
      )}

      {aberto && (
        <>
          <DateTimePicker
            value={converterIsoParaDate(valor)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            locale="pt-BR"
            onChange={aoMudarNoSeletor}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.concluido} onPress={() => setAberto(false)}>
              <Text style={styles.concluidoTexto}>Concluído</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

// Mesmo visual de CampoTexto.tsx (fundo, cantos, sombra sutil, contorno
// colorido "em foco") — aqui "em foco" é "o seletor está aberto", pra
// manter a mesma linguagem visual de "este é o campo que você está
// preenchendo agora".
const styles = StyleSheet.create({
  campo: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  campoAberto: {
    borderColor: colors.primary,
  },
  texto: {
    fontSize: 16,
    color: colors.text,
  },
  atalhos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  atalhoBotao: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
  },
  atalhoTexto: {
    color: colors.primaryDark,
    fontWeight: '600',
    fontSize: 13,
  },
  concluido: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  concluidoTexto: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 15,
  },
});
