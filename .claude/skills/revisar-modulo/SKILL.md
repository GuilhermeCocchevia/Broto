---
name: revisar-modulo
description: Revisa e organiza UMA pasta ou arquivo do AppBroto contra as regras do CLAUDE.md (camadas, estilo, comentários, testes) e aplica as correções. Use quando o usuário pedir "revisar", "organizar" ou "limpar" uma parte do código, ex. "/revisar-modulo src/logic".
---

# Revisar um módulo

Alvo: o caminho passado como argumento (`$ARGUMENTS`). Se vier vazio, pergunte
qual pasta/arquivo revisar. **Nunca revise o projeto inteiro de uma vez** —
um módulo por execução mantém a revisão profunda e barata.

## Passos

1. Rode `npx tsc --noEmit` e `npm test` e anote o estado inicial.
2. Leia os arquivos do alvo e liste os problemas, agrupados por gravidade:
   - **Bug** — lógica errada, caso de borda não tratado, data/moeda mal calculada.
   - **Camada** — tela acessando `db`, regra de negócio em componente/tela,
     lógica pura importando React/banco.
   - **Duplicação** — função que já existe em `logic/` ou `utils/`.
   - **Estilo** — nomes, funções longas, `any`, números mágicos, hex solto,
     comentário longo contando histórico, código morto.
   - **Teste faltando** — função de `logic/`/`utils/` sem teste.
3. Mostre a lista ao usuário de forma curta (arquivo:linha + 1 frase) e
   aplique as correções de **Camada, Duplicação, Estilo e Teste**. Para itens
   de **Bug**, descreva e pergunte antes de mudar comportamento.
4. Não mude comportamento visível do app num refactor. Se mudar, é outro commit.
5. Rode `npx tsc --noEmit` e `npm test` de novo; tudo tem que passar.
6. Commit: `refactor(<escopo>): organiza <alvo>` com um resumo em tópicos.
