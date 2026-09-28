const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    // Bundle de terceiro gerado por script (scripts/gerar-apexcharts-embutido.js),
    // não código do projeto — nunca deve passar por lint.
    ignores: ['src/charts/apexchartsEmbutido.ts', 'android/**', 'ios/**', 'dist/**'],
  },
  {
    // Scripts CommonJS rodados direto pelo Node (ver package.json
    // postinstall), fora do bundle RN/Expo — precisam dos globals de Node
    // (`__dirname`, `require`, etc.), não dos globals de app (browser/RN).
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Três regras do plugin react-hooks (voltadas pra compatibilidade com o
    // futuro React Compiler) desligadas de propósito — cada uma bate de
    // frente com um padrão já usado neste projeto, testado e documentado no
    // próprio código, não um acidente:
    //  - react-hooks/refs: `useRef(new Animated.Value(...)).current` é o
    //    padrão recomendado pela própria documentação do React Native pra
    //    valor animado estável entre renders (ver CenaGameficada.tsx).
    //  - react-hooks/set-state-in-effect: telas de edição (NovaTransacao,
    //    NovaSimulacao, NovaCategoria) carregam o registro existente pro
    //    estado local do formulário quando `idEditando` muda — o padrão
    //    usual de formulário controlado, não um loop de re-render.
    //  - react-hooks/static-components: `WebView` em GraficoApex.tsx vem de
    //    um `require` tardio cacheado em escopo de módulo (mesmo motivo do
    //    `require` tardio em useBloqueioDoApp.ts — módulo nativo que só
    //    existe depois do build) — estável entre renders na prática, mesmo
    //    a regra não conseguindo provar isso estaticamente.
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
]);
