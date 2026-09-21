#!/usr/bin/env node
// Este projeto vive em "~/Projetos Pessoais/AppBroto" — um caminho COM
// espaço. Duas dependências nativas têm scripts de build do Xcode que
// quebram nesse caso: ambas montam um comando `bash -c "$ALGUM_CAMINHO"`
// (ou usam `` `$ALGUM_CAMINHO` `` cru) sem proteger o caminho de ser
// reprocessado/re-separado por um espaço no meio. Sintoma nos dois casos:
// `xcodebuild` falha com algo como "No such file or directory: .../Projetos"
// (cortado bem no espaço). Ver [[React Native com Expo]] no segundo
// cérebro pro registro completo.
//
// Corrigir na mão funciona, mas os dois arquivos afetados são GERADOS:
// `node_modules/...` (recriado a cada `npm install`) e `ios/...`
// (recriado a cada `expo prebuild`). Por isso este script — rodado
// automaticamente no "postinstall" (ver package.json) — em vez de editar
// uma vez só. É idempotente: procura o texto problemático e troca pelo
// corrigido; se já estiver corrigido, ou se um arquivo não existir ainda
// (ex: `ios/` só existe depois do primeiro `expo prebuild`), não faz nada.
//
// IMPORTANTE: `npm install` roda ANTES de `expo prebuild` normalmente, então
// a correção do `ios/AppBroto.xcodeproj/project.pbxproj` não pega sozinha
// na primeira vez — depois de rodar `expo prebuild` (ou `expo prebuild
// --clean`), rode `npm run postinstall` de novo pra reaplicar.
const fs = require('node:fs');
const path = require('node:path');

const RAIZ_PROJETO = path.join(__dirname, '..');

const CORRECOES = [
  {
    descricao: "EXConstants.podspec (bash -l -c sem aspas internas — 'Generate app.config for prebuilt Constants.manifest')",
    arquivo: path.join(
      RAIZ_PROJETO,
      'node_modules',
      'expo',
      'node_modules',
      'expo-constants',
      'ios',
      'EXConstants.podspec',
    ),
    textoQuebrado:
      ':script => "bash -l -c \\"#{env_vars}$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\"",',
    textoCorrigido:
      ':script => "bash -l -c \\"#{env_vars}\\\\\\"$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh\\\\\\"\\"",',
  },
  {
    descricao:
      "AppBroto.xcodeproj (fase 'Bundle React Native code and images' executando um caminho cru via crase, sem variável/aspas)",
    arquivo: path.join(RAIZ_PROJETO, 'ios', 'AppBroto.xcodeproj', 'project.pbxproj'),
    textoQuebrado:
      '`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`\\n\\n',
    textoCorrigido:
      'REACT_NATIVE_XCODE=`\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\"`\\n\\"$REACT_NATIVE_XCODE\\"\\n\\n',
  },
];

for (const { descricao, arquivo, textoQuebrado, textoCorrigido } of CORRECOES) {
  if (!fs.existsSync(arquivo)) {
    // Ainda não existe (ex: `ios/` antes do primeiro `expo prebuild`) —
    // nada a corrigir agora, sem erro.
    continue;
  }

  const conteudo = fs.readFileSync(arquivo, 'utf8');

  if (conteudo.includes(textoCorrigido)) {
    continue;
  }

  if (!conteudo.includes(textoQuebrado)) {
    console.warn(
      `[corrigir-dependencias-nativas] ${path.relative(RAIZ_PROJETO, arquivo)} mudou de um jeito ` +
        `inesperado — a correção "${descricao}" não foi aplicada. Se o build do iOS falhar com ` +
        '"No such file or directory" cortado no meio de um caminho, essa é a causa mais provável.',
    );
    continue;
  }

  fs.writeFileSync(arquivo, conteudo.replace(textoQuebrado, textoCorrigido));
  console.log(
    `[corrigir-dependencias-nativas] ${path.relative(RAIZ_PROJETO, arquivo)} corrigido (${descricao}).`,
  );
}
