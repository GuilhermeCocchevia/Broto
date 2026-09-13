// babel-preset-expo é o padrão do Expo (transforma JSX, TS, etc).
// O plugin "inline-import" resolve o problema do metro.config.js: quando o código
// faz `import sql from './algo.sql'`, esse plugin troca isso, em tempo de build,
// por uma string literal com o conteúdo do arquivo — em vez do Metro tentar
// interpretar o texto do .sql como se fosse código JavaScript (o que quebra, porque
// SQL não é JS).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
