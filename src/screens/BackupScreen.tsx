import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { colors } from '../theme/colors';
import { useCategoriasStore } from '../store/useCategoriasStore';
import { useTransacoesStore } from '../store/useTransacoesStore';
import { useSimulacoesStore } from '../store/useSimulacoesStore';
import { useSaldoInicialStore } from '../store/useSaldoInicialStore';
import { useMetaReservaStore } from '../store/useMetaReservaStore';
import { montarBackup, lerBackup } from '../logic/backup';
import { restaurarBackup } from '../db/restaurarBackup';
import { mensagemDeErro } from '../utils/mensagemDeErro';

// Backup manual: exportar gera um arquivo .json e abre a folha de
// compartilhamento nativa do sistema — o usuário escolhe pra onde mandar
// (iCloud Drive, Google Drive, e-mail, AirDrop, o que tiver instalado).
// Importar abre o seletor de arquivo nativo, também já integrado com
// qualquer nuvem que o usuário tenha configurado no aparelho. O app nunca
// vê senha nem token de ninguém — o "login" é só o que o próprio sistema
// operacional já gerencia.
export default function BackupScreen() {
  const categorias = useCategoriasStore((state) => state.categorias);
  const carregarCategorias = useCategoriasStore((state) => state.carregar);
  const transacoes = useTransacoesStore((state) => state.transacoes);
  const carregarTransacoes = useTransacoesStore((state) => state.carregar);
  const simulacoes = useSimulacoesStore((state) => state.simulacoes);
  const carregarSimulacoes = useSimulacoesStore((state) => state.carregar);
  const saldosIniciais = useSaldoInicialStore((state) => state.saldosIniciais);
  const carregarSaldoInicial = useSaldoInicialStore((state) => state.carregar);
  const metasReserva = useMetaReservaStore((state) => state.metas);
  const carregarMetasReserva = useMetaReservaStore((state) => state.carregar);

  const [mensagem, setMensagem] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Sem isso, os contadores abaixo mostravam "0" na primeira vez que essa
  // tela abria (bug real, achado testando): as outras telas carregam suas
  // próprias stores no mount, mas essa tela pode ser a primeira a abrir numa
  // sessão — sem carregar aqui também, ficava mostrando o estado inicial
  // vazio até o usuário tocar em "Exportar" (que carrega de novo por
  // segurança, mas só na hora de exportar, tarde demais pro que já apareceu
  // na tela).
  useEffect(() => {
    carregarCategorias();
    carregarTransacoes();
    carregarSimulacoes();
    carregarSaldoInicial();
    carregarMetasReserva();
  }, [
    carregarCategorias,
    carregarTransacoes,
    carregarSimulacoes,
    carregarSaldoInicial,
    carregarMetasReserva,
  ]);

  async function exportar() {
    setMensagem(null);
    setExportando(true);
    try {
      // As stores já carregam sozinhas quando as outras telas montam, mas
      // essa tela pode ser a primeira a abrir numa sessão — recarrega tudo
      // na hora de exportar pra ter certeza que pega o dado mais recente do
      // banco, não um estado de store potencialmente vazio/desatualizado.
      await Promise.all([
        carregarCategorias(),
        carregarTransacoes(),
        carregarSimulacoes(),
        carregarSaldoInicial(),
        carregarMetasReserva(),
      ]);

      const backup = montarBackup({
        categorias: useCategoriasStore.getState().categorias,
        transacoes: useTransacoesStore.getState().transacoes,
        simulacoes: useSimulacoesStore.getState().simulacoes,
        saldosIniciais: useSaldoInicialStore.getState().saldosIniciais,
        metasReserva: useMetaReservaStore.getState().metas,
      });

      // Paths.cache (não Paths.document): esse arquivo só existe pra ser
      // entregue à folha de compartilhamento agora — não é dado do app que
      // precisa sobreviver entre sessões, então cache é o lugar certo (o
      // sistema pode limpar depois sem problema nenhum).
      const arquivo = new File(Paths.cache, `appbroto-backup-${dataDeHoje()}.json`);
      if (arquivo.exists) {
        arquivo.delete();
      }
      arquivo.create();
      arquivo.write(JSON.stringify(backup, null, 2));

      const disponivel = await Sharing.isAvailableAsync();
      if (!disponivel) {
        setMensagem('Compartilhamento não está disponível nesse aparelho.');
        return;
      }
      await Sharing.shareAsync(arquivo.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Salvar backup do AppBroto',
      });
    } catch (erro) {
      setMensagem(mensagemDeErro(erro, 'salvar'));
    } finally {
      setExportando(false);
    }
  }

  async function importar() {
    setMensagem(null);
    const resultado = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (resultado.canceled) {
      return;
    }

    const arquivoEscolhido = new File(resultado.assets[0].uri);
    const leitura = lerBackup(await arquivoEscolhido.text());

    if (!leitura.sucesso) {
      setMensagem(leitura.erro);
      return;
    }

    // Confirmação explícita antes de qualquer coisa irreversível — mesmo
    // padrão de "excluir categoria/transação" já usado no resto do app,
    // só que aqui o alcance é MUITO maior (todos os dados, não 1 registro).
    Alert.alert(
      'Restaurar backup',
      'Isso vai substituir TODOS os dados atuais deste aparelho pelos do arquivo escolhido. Essa ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => restaurarEDepoisRecarregar(leitura.backup),
        },
      ],
    );
  }

  async function restaurarEDepoisRecarregar(backup: Parameters<typeof restaurarBackup>[0]) {
    setImportando(true);
    try {
      await restaurarBackup(backup);
      await Promise.all([
        carregarCategorias(),
        carregarTransacoes(),
        carregarSimulacoes(),
        carregarSaldoInicial(),
        carregarMetasReserva(),
      ]);
      setMensagem('Backup restaurado com sucesso.');
    } catch (erro) {
      setMensagem(mensagemDeErro(erro, 'salvar'));
    } finally {
      setImportando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <Text style={styles.titulo}>Backup</Text>
      <Text style={styles.texto}>
        Seus dados ficam só neste aparelho. Exporte de vez em quando e guarde o arquivo na nuvem
        de sua preferência — assim, se trocar de aparelho ou desinstalar o app, dá pra recarregar
        tudo importando esse mesmo arquivo de volta.
      </Text>

      <View style={styles.resumo}>
        <Text style={styles.resumoTexto}>{categorias.length} categorias</Text>
        <Text style={styles.resumoTexto}>{transacoes.length} transações</Text>
        <Text style={styles.resumoTexto}>{simulacoes.length} simulações</Text>
        <Text style={styles.resumoTexto}>{saldosIniciais.length} atualizações de saldo</Text>
        <Text style={styles.resumoTexto}>{metasReserva.length} decisões sobre reserva de emergência</Text>
      </View>

      <Pressable
        style={[styles.botao, exportando && styles.botaoDesabilitado]}
        onPress={exportar}
        disabled={exportando || importando}
      >
        <Text style={styles.botaoTexto}>{exportando ? 'Exportando...' : 'Exportar backup'}</Text>
      </Pressable>

      <Pressable
        style={[styles.botaoSecundario, importando && styles.botaoDesabilitado]}
        onPress={importar}
        disabled={exportando || importando}
      >
        <Text style={styles.botaoSecundarioTexto}>
          {importando ? 'Restaurando...' : 'Importar backup'}
        </Text>
      </Pressable>

      {mensagem && <Text style={styles.mensagem}>{mensagem}</Text>}
    </ScrollView>
  );
}

// 'AAAA-MM-DD' de hoje, só pra dar um nome de arquivo legível — o mesmo
// formato de data já usado em todo o resto do app.
function dataDeHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    padding: 24,
    paddingTop: 80,
    gap: 12,
  },
  titulo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  texto: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  resumo: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    gap: 4,
    marginTop: 8,
  },
  resumoTexto: {
    fontSize: 13,
    color: colors.text,
  },
  botao: {
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoTexto: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  botaoSecundario: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  botaoSecundarioTexto: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  mensagem: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text,
  },
});
