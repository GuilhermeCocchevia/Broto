// Config do Metro (o bundler que empacota o JS do app, parecido com o Webpack).
// Por padrão ele não sabe o que fazer com arquivos .sql — aqui ensinamos ele a tratar
// .sql como um "source extension" (arquivo que vira texto importável), igual .js/.ts.
// Isso é exigido pelo Drizzle: as migrações geradas importam .sql diretamente
// (ver drizzle/migrations.js).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('sql');

module.exports = config;
