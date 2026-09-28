# AppBroto — guia para o Claude

App de finanças pessoais + simulador de decisões futuras. Expo/React Native,
TypeScript estrito, Zustand, Drizzle ORM sobre expo-sqlite, Jest (jest-expo).

## Comandos

- Testes: `npm test` (ou `npx jest src/logic/projecao.test.ts` para um arquivo)
- Tipos: `npx tsc --noEmit`
- Rodar: `npm start`

Antes de dizer que uma tarefa terminou: `npx tsc --noEmit` e `npm test` passando.
Se não der para rodar, diga isso explicitamente — nunca afirme que passou sem rodar.

## Arquitetura (respeite as camadas)

| Pasta | Responsabilidade | Pode importar |
|---|---|---|
| `src/logic/` | Regras de negócio **puras** (cálculo, projeção, conquistas). Sem React, sem banco. | `types`, `utils` |
| `src/utils/` | Funções pequenas, genéricas e puras (datas, moeda, texto). | `types` |
| `src/db/` | Schema Drizzle, client, backup/restauração. | `types` |
| `src/store/` | Stores Zustand: único lugar que lê/escreve no banco a partir da UI. | `db`, `logic`, `types`, `utils` |
| `src/hooks/` | Hooks que combinam stores + logic para as telas. | tudo menos `screens` |
| `src/components/` | Componentes visuais reutilizáveis, sem acesso a banco. | `theme`, `utils`, `hooks`, `logic` |
| `src/screens/` | Telas: composição e estado de formulário. Cálculo vai para `logic/`. | tudo |

Regras:
- Tela nunca chama `db` direto — passa pela store.
- Conta/regra de negócio nova vai em `src/logic/` **com teste** ao lado (`nome.test.ts`).
- Componente não calcula regra de negócio; recebe o valor pronto ou usa um hook.

## Estilo de código

- **Nomes em português**, verbos no infinitivo para funções (`calcularSobraMensal`,
  `formatarReal`), substantivos para dados. Componentes em PascalCase, hooks `useAlgo`.
- Um arquivo = uma responsabilidade. Tela passando de ~300 linhas: extrair
  subcomponentes para `components/` e cálculos para `logic/`/hooks.
- Funções curtas, com retorno antecipado (`if (!x) return`) em vez de `if` aninhado.
- Sem `any`, sem `as` para "calar" o compilador, sem `!` (non-null) sem motivo.
  Tipos de domínio ficam em `src/types/models.ts`.
- Sem números mágicos: constante nomeada no topo do arquivo.
- Cores sempre de `src/theme/colors.ts`; nunca hex solto em tela/componente.
- Dinheiro: arredondar em centavos só na borda (exibição/persistência), usar
  `formatarReal` e `parsearValorMonetario`. Datas: usar `utils/dataLocal.ts`
  (nunca `new Date().toISOString()` para "hoje" — dá o dia errado em UTC-3).
- Acessibilidade: todo `Pressable`/botão com `accessibilityRole` e `accessibilityLabel`.
- Nada de código morto, `console.log`, arquivos `.bak` ou código comentado no commit.

## Comentários

- Comente **o porquê**, não o quê. Máximo de 1–3 linhas na maioria dos casos.
- Não conte a história do bug no comentário ("versão anterior fazia X, bug
  reportado..."). Isso vai na mensagem de commit. No código fica só a regra
  atual e o motivo dela.
- Se o nome da função já explica, não comente.

## Testes

- Toda função em `logic/` e `utils/` tem teste. Bug corrigido = teste que
  reproduz o bug antes da correção.
- Nome do teste descreve o comportamento em português: `it('não sugere investir
  quando o saldo é menor que um mês de despesas')`.
- Sem mocks de lógica pura; mock só de banco/módulos nativos.

## Forma de trabalhar

- Antes de criar função nova, procure se já existe algo parecido em `logic/` e
  `utils/` e reutilize.
- Mudança mínima para o pedido. Não refatorar o que não foi pedido — sugira no final.
- Em dúvida sobre regra de negócio (finanças, projeção), pergunte antes de inventar.
- Commits no padrão já usado: `tipo(escopo): descrição` em português
  (`feat(projecao): ...`, `fix(cena): ...`, `refactor(simulador): ...`).
