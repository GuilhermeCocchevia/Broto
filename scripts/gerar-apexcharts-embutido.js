#!/usr/bin/env node
// O ApexCharts é uma biblioteca de NAVEGADOR: no app ele roda dentro de uma
// WebView (ver src/charts/GraficoApex.tsx). Pra funcionar offline (é um app de
// finanças pessoais, sem depender de internet), o código da biblioteca é
// embutido no app em vez de baixado de um CDN — este script copia
// node_modules/apexcharts/dist/apexcharts.min.js pra um módulo TypeScript que
// exporta o código como texto.
//
// O arquivo gerado (src/charts/apexchartsEmbutido.ts, ~600KB) NÃO vai pro git:
// é recriado no "postinstall" (ver package.json) a partir da versão instalada,
// então sempre acompanha o `npm install`. Rodar de novo é seguro (idempotente).
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, 'node_modules', 'apexcharts', 'dist', 'apexcharts.min.js');
const DESTINO = path.join(RAIZ, 'src', 'charts', 'apexchartsEmbutido.ts');

if (!fs.existsSync(ORIGEM)) {
  console.warn('[apexcharts] node_modules/apexcharts não encontrado — pulando (rode npm install).');
  process.exit(0);
}

const codigo = fs.readFileSync(ORIGEM, 'utf8');
const versao = JSON.parse(
  fs.readFileSync(path.join(RAIZ, 'node_modules', 'apexcharts', 'package.json'), 'utf8'),
).version;

// Uma sequência "</script" no meio do código fecharia a tag <script> da página
// antes da hora. Dentro de string/regex do JavaScript, "<\/script" vale igual.
const seguro = codigo.replace(/<\/script/gi, '<\\/script');

const conteudo =
  `// GERADO por scripts/gerar-apexcharts-embutido.js (apexcharts ${versao}) — não editar,\n` +
  `// não commitar (está no .gitignore). Recriado a cada \`npm install\`.\n` +
  `export const APEXCHARTS_VERSAO = ${JSON.stringify(versao)};\n` +
  `export const APEXCHARTS_JS = ${JSON.stringify(seguro)};\n`;

fs.writeFileSync(DESTINO, conteudo);
console.log(`[apexcharts] ${versao} embutido em src/charts/apexchartsEmbutido.ts (${Math.round(conteudo.length / 1024)}KB)`);
