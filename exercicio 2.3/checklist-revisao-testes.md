# Checklist de Revisão de Testes de Integração
## NovaTech Assistant — Artefato Claude Cowork

> **Objetivo:** verificar um teste de integração gerado por IA em menos de 2 minutos.
> Todos os itens são binários (✅ / ❌) — sem julgamento subjetivo.
> Um único ❌ é suficiente para reprovar o teste no code review de QA.

---

## Como usar

1. Abra o arquivo de teste ao lado deste checklist.
2. Percorra os itens na ordem — cada um leva de 5 a 15 segundos.
3. Marque ✅ se o item está correto, ❌ se está ausente ou errado.
4. Se qualquer item for ❌: devolva ao agente com o número do item e a descrição
   do problema. Não aprove parcialmente.

**Tempo esperado:** 90–120 segundos por arquivo de teste.

---

## Bloco A — Estrutura do arquivo (30s)

| # | Item | Como verificar | ✅ / ❌ |
|---|------|---------------|--------|
| A1 | O arquivo está em `tests/integration/` com sufixo `.test.ts` | Verificar o caminho do arquivo | |
| A2 | O nome do arquivo espelha o módulo de produção (ex.: `handler.test.ts` para `handler.ts`) | Comparar com o caminho em `src/` | |
| A3 | Há um `describe` raiz com o nome exato do módulo (ex.: `QueryHandler`, não `"tests"` ou `"query"`) | Linha do `describe` no topo | |
| A4 | Cada cenário tem um `describe` interno com a condição (`when <condição>`) | Sub-describes dentro do describe raiz | |

---

## Bloco B — Setup MSW (20s)

| # | Item | Como verificar | ✅ / ❌ |
|---|------|---------------|--------|
| B1 | `setupServer()` é chamado sem handlers padrão (handlers por cenário, não globais) | Linha `const server = setupServer()` sem argumentos | |
| B2 | `beforeAll` usa `{ onUnhandledRequest: 'error' }` | `server.listen({ onUnhandledRequest: 'error' })` | |
| B3 | `afterEach` chama `server.resetHandlers()` | Presença de `afterEach(() => server.resetHandlers())` | |
| B4 | `afterAll` chama `server.close()` | Presença de `afterAll(() => server.close())` | |

---

## Bloco C — Nomenclatura dos testes (15s)

| # | Item | Como verificar | ✅ / ❌ |
|---|------|---------------|--------|
| C1 | Todo `it` começa com `should` | Ler os nomes dos `it` — nenhum pode ser `'works'`, `'test'`, `'ok'` | |
| C2 | Todo `it` termina com `when <condição>` ou tem a condição no `describe` pai | Nome do `it` ou do `describe` interno | |
| C3 | Nenhum nome usa português (código e testes são em inglês) | Ler todos os strings de `describe`/`it` | |

---

## Bloco D — Dentro de cada `it` (30s — checar todos os `it` presentes)

| # | Item | Como verificar | ✅ / ❌ |
|---|------|---------------|--------|
| D1 | Cada `it` tem exatamente um comportamento (não mistura happy path + edge case) | Contar quantas chamadas ao handler há dentro do `it` — deve ser 1 | |
| D2 | As três seções Arrange / Act / Assert estão presentes e separadas por linha em branco | Procurar os comentários `// Arrange`, `// Act`, `// Assert` | |
| D3 | O Arrange inclui `server.use(...)` com handler específico ao cenário | URL do handler contém o endpoint real (ex.: `*/indexes/novatech-docs/docs/search`) — não `*` sozinho | |
| D4 | O Act chama o handler com dados de `queryFixtures.*` — não string hardcoded | Verificar o `body: JSON.stringify(...)` — deve referenciar fixture, não `'{"question": "test"}'` | |
| D5 | O Assert inclui ao menos uma assertion sobre `body.source_document` (em testes de query) | Buscar `source_document` nas assertions | |
| D6 | Nenhuma assertion usa `toBeDefined()`, `toBeTruthy()` ou `not.toBeNull()` como única verificação | Ler todas as linhas `expect(...)` | |
| D7 | Assertions usam valores derivados do domínio NovaTech (ex.: `'POL-001-B'`, `/não.*elegível/i`, `200`) | Os valores nas assertions fazem sentido para o domínio de logística | |

---

## Bloco E — Dados de teste (15s)

| # | Item | Como verificar | ✅ / ❌ |
|---|------|---------------|--------|
| E1 | Chunks e queries vêm de `tests/fixtures/` — não estão inline no arquivo de teste | Procurar imports de `../../fixtures` e ausência de objetos `{ id: '1', content: 'test' }` inline | |
| E2 | Não há `console.log` no arquivo de teste | Busca textual por `console.log` | |
| E3 | Não há importação direta de SDK Azure (`@azure/search-documents`, `@azure/openai`) com `vi.mock` | Verificar imports e ausência de `vi.mock('@azure/...')` | |

---

## Resultado

| Resultado | Critério | Ação |
|-----------|----------|------|
| ✅ **Aprovado** | Todos os itens ✅ | Pode fazer merge |
| ❌ **Reprovado** | 1 ou mais itens ❌ | Devolver ao agente com os IDs dos itens reprovados |

---

## Referência rápida — o que cada bloco protege

| Bloco | Risco que mitiga |
|-------|-----------------|
| A — Estrutura | Arquivo no lugar errado ou describe genérico que esconde o módulo quebrado |
| B — MSW | Chamadas reais a Azure em CI (custo + flakiness) ou vazamento de estado entre testes |
| C — Nomenclatura | Relatório de falha sem indicar o que quebrou |
| D — Dentro do `it` | Alucinação passando no teste, múltiplos comportamentos acoplados, assertions vagas |
| E — Dados de teste | Regressões de domínio não detectadas, ruído no output do CI |

---

## Histórico de geração — evidência de uso do Claude Cowork

### Prompt enviado ao Cowork

```
Crie um checklist de revisão de testes de integração para o projeto NovaTech
Assistant (TypeScript, Vitest, msw). O checklist deve:

- Ser verificável em menos de 2 minutos por arquivo de teste
- Ter itens binários (sim/não) — sem julgamento subjetivo
- Cobrir: estrutura do arquivo, setup MSW com lifecycle correto, nomenclatura
  describe/it, estrutura AAA dentro de cada it, qualidade das assertions,
  e origem dos dados de teste (fixtures vs hardcoded)
- Ser organizado em blocos temáticos com estimativa de tempo por bloco
- Incluir uma tabela de resultado com ação para aprovado e reprovado

Referência: Testing Standards do AGENTS.md do projeto (Vitest, msw,
onUnhandledRequest: error, afterEach resetHandlers, fixtures em tests/fixtures/,
toBeDefined proibido, source_document obrigatório em query tests).
```

### v1 gerada × v2 refinada

| Aspecto | v1 (gerada pelo Cowork) | v2 (refinada pelo QA) |
|---------|------------------------|----------------------|
| Número de itens | 8 itens em lista única | 19 itens organizados em 5 blocos temáticos com tempo estimado por bloco |
| Item de MSW | "Usa msw para mocking" — subjetivo | 4 itens específicos: `setupServer()` sem handlers globais, `onUnhandledRequest: 'error'`, `resetHandlers()` no `afterEach`, `close()` no `afterAll` |
| Assertions | "Assertions específicas" — subjetivo | Binário: "nenhuma usa `toBeDefined()` / `toBeTruthy()` como única verificação" |
| `source_document` | Ausente na v1 | Adicionado como D5 — item obrigatório em testes de query, derivado do VC-02 |
| Tabela de resultado | "Aprovado se tudo ok" | Tabela com critério, resultado e ação, mais tabela de "o que cada bloco protege" |
| Referência à fonte | Ausente na v1 | Adicionado rodapé âncora na skill e versão — facilita atualização sincronizada quando a skill evoluir |

---

## Fonte de padrões

> Os critérios deste checklist derivam de:
> `skills/artifact/create-integration-test.md` **v1.0**
>
> Quando a skill for atualizada (nova versão), revisar este checklist para
> garantir que os itens permanecem alinhados. A versão da skill e a versão
> deste checklist devem ser atualizadas juntas no mesmo commit.
