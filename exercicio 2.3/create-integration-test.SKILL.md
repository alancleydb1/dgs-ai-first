# SKILL: create-integration-test
## Nível: Artifact | Projeto: NovaTech Assistant

**Localização no repositório:** `skills/artifact/create-integration-test.md`
**Versão:** 1.0
**Responsável:** QA
**Consumidores:** GitHub Copilot, Claude Code, Dev (ao gerar testes de integração)

---

## 1. Quando usar esta skill

**Frase-ativação:** use esta skill sempre que for gerar um arquivo em
`tests/integration/` para qualquer módulo de `src/`.

Exemplos de gatilhos que ativam esta skill (português ou inglês):

| Português | Inglês equivalente |
|-----------|-------------------|
| "Gere testes de integração para o query handler" | "Generate integration tests for the query handler" |
| "Escreva um teste para o feedback endpoint" | "Write a test for the feedback endpoint" |
| "Adicione cobertura de integração para o search service" | "Add integration coverage for the search service" |
| "Crie testes para o caso de carga perigosa" | "Create tests for the hazardous cargo case" |

> **Nota para agentes:** independentemente do idioma do gatilho, o código gerado
> (nomes de `describe`, `it`, variáveis, comentários de código) DEVE ser em inglês,
> conforme a seção C3 do checklist de revisão e os Testing Standards do AGENTS.md.

**NÃO use esta skill para:**
- Testes unitários (`tests/unit/`) — nível de granularidade diferente.
- Testes e2e (`tests/e2e/`) — envolvem o fluxo completo com tokens reais.
- Componentes React do painel web — usar `create-react-card` (Artifact).

---

## 2. Dependências — leia antes de gerar

Antes de gerar qualquer teste de integração, o agente DEVE ter lido as seguintes
skills na ordem abaixo. As regras dessas skills são pré-condição para esta:

| Ordem | Skill | Nível | O que define |
|-------|-------|-------|--------------|
| 1º | `skills/foundation/typescript-conventions.md` | Foundation | Imports, tipos, naming conventions |
| 2º | `skills/foundation/error-handling.md` | Foundation | Como erros são representados e propagados |
| 3º | `skills/domain/testing-patterns.md` | Domain | Vitest, msw setup, fixtures, padrão AAA |
| 4º | `AGENTS.md` seção **Testing Standards** | Constitution | Regras de nomenclatura, proibições, casos obrigatórios |

> Se alguma dessas skills não existir ainda no repositório, sinalize ao Tech Lead
> antes de gerar o teste. Nunca assuma os padrões — leia a fonte.

---

## 3. Template obrigatório

Todo arquivo de teste de integração gerado DEVE seguir este template.
Substitua os placeholders `<PLACEHOLDER>` pelos valores do contexto.

```typescript
// tests/integration/<camada>/<NomeDoMódulo>.test.ts

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { <handler> } from '../../../src/<caminho-do-modulo>'
import {
  chunkFixtures,
  queryFixtures,
  completionFixtures,
  embeddingFixtures,
} from '../../fixtures'

// ── MSW server setup ────────────────────────────────────────────────────────
// onUnhandledRequest: 'error' garante que chamadas reais acidentais quebram o teste
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())   // isola handlers entre testes
afterAll(() => server.close())

// ── Testes ──────────────────────────────────────────────────────────────────
describe('<NomeDoMódulo>', () => {

  describe('when <condição principal do grupo>', () => {

    it('should <comportamento esperado> when <condição específica>', async () => {
      // Arrange
      server.use(
        http.post('<URL-do-endpoint-mockado>', () =>
          HttpResponse.json(<fixture-de-resposta>))
      )

      // Act
      const result = await <handler>({ body: JSON.stringify(<queryFixtures.nomeDaQuery>) })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(<status-esperado>)
      expect(body.<campo-específico>).toBe(<valor-esperado>)   // nunca toBeDefined() sozinho
      expect(body.source_document).toBe('<ID-do-chunk>')        // obrigatório em todo query test
    })

  })

})
```

### Regras de preenchimento do template

- `<NomeDoMódulo>`: nome exato do arquivo de produção sem extensão
  (ex.: `QueryHandler`, `SearchService`, `FeedbackHandler`).
- `<condição principal do grupo>`: frase curta que agrupa cenários relacionados
  (ex.: `when a relevant chunk is found`, `when input is malformed`).
- `<comportamento esperado>`: o que o sistema faz — verbo no infinitivo
  (ex.: `return 200 with source_document populated`).
- `<condição específica>`: o gatilho do comportamento
  (ex.: `question matches indexed content`).
- URLs dos mocks: sempre usar padrão glob específico ao endpoint
  (ex.: `*/indexes/novatech-docs/docs/search`), nunca `*` sozinho.
- Fixtures: sempre importar de `../../fixtures` — nunca inline hardcoded.

---

## 4. Exemplos completos

### ✅ DO — Teste bem escrito

```typescript
// tests/integration/query/guardrails.test.ts

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handler } from '../../../src/functions/query/handler'
import {
  chunkFixtures,
  queryFixtures,
  completionFixtures,
  embeddingFixtures,
} from '../../fixtures'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('QueryHandler', () => {

  describe('when question involves dangerous cargo return', () => {

    it('should return explicit denial and refer to ramal 4500 when asked about returning hazardous cargo', async () => {
      // Arrange
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json(embeddingFixtures.standard)),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          HttpResponse.json({ value: chunkFixtures.cargaPerigosaDireta })),
        http.post('*/openai/deployments/*/chat/completions', () =>
          HttpResponse.json(completionFixtures.hazardousCargoReturn))
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.devolveLiquidoInflamavel })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(200)
      expect(body.answer).toMatch(/não.*processo padrão|não.*elegível/i)
      expect(body.answer).toMatch(/4500|Gestão de Riscos/i)
      expect(body.source_document).toBe('POL-001-B')
    })

  })

})
```

**Por que este teste está correto:**

| Elemento | O que faz certo |
|----------|----------------|
| `describe` aninhado | Agrupa por condição — facilita leitura do relatório de falhas |
| Nome do `it` | `should [verbo] when [condição]` — descreve exatamente o contrato |
| Fixtures nomeadas | `chunkFixtures.cargaPerigosaDireta`, `queryFixtures.devolveLiquidoInflamavel` — dados reais do domínio |
| 3 handlers msw específicos | Cada endpoint Azure tem seu próprio handler com URL específica |
| `onUnhandledRequest: 'error'` | Qualquer chamada real não mockada quebra o teste imediatamente |
| Assertions sobre conteúdo | Verifica o texto da resposta e o `source_document` — não só o status |
| `toMatch(/regex/i)` | Flexível ao fraseado, rígido ao significado |

---

### ✅ DO (2) — Teste de edge case: dependência externa indisponível

```typescript
// tests/integration/query/resilience.test.ts

import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handler } from '../../../src/functions/query/handler'
import { queryFixtures } from '../../fixtures'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('QueryHandler', () => {

  describe('when Azure AI Search is unavailable', () => {

    it('should return 502 with service unavailable message when search returns 503', async () => {
      // Arrange — simula Azure AI Search retornando 503 Service Unavailable
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json({ embedding: [0.1, 0.2] })),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          new HttpResponse(null, { status: 503 }))   // ← upstream indisponível
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.slaGoldResolucao })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(502)                          // não expõe 503 raw ao cliente
      expect(body.error).toMatch(/serviço indisponível|unavailable/i)
      expect(body.source_document).toBeNull()                  // sem fonte quando falha
      expect(body.answer).toBeUndefined()                      // sem resposta inventada
    })

  })

})
```

**Por que este segundo exemplo é necessário:**

| Elemento | O que demonstra a mais em relação ao DO (1) |
|----------|---------------------------------------------|
| `new HttpResponse(null, { status: 503 })` | Como mockar respostas de erro HTTP — não só 200 |
| `result.status` é 502, não 503 | O handler traduz erros upstream — não os expõe raw |
| `source_document` é `null` | Comportamento correto em falha: sem fonte inventada |
| `answer` é `undefined` | O handler não alucina resposta quando a busca falha |
| `describe` interno: `when Azure AI Search is unavailable` | Padrão de agrupamento para edge cases de infraestrutura |

> O DO (1) cobre o happy path de domínio (guardrail de carga perigosa).
> O DO (2) cobre o edge case de infraestrutura (dependência indisponível).
> Juntos, representam os dois eixos que todo teste de integração deve cobrir.

---

### ❌ DON'T — Teste com problemas comuns de IA

```typescript
// ❌ NÃO gerar nenhum teste neste estilo

import { test, expect } from 'vitest'
import { handler } from '../../../src/functions/query/handler'

// ❌ Problema 1: sem describe — não sabemos o que está sendo testado
// ❌ Problema 2: nome genérico sem comportamento nem condição
test('query endpoint works', async () => {

  // ❌ Problema 3: sem Arrange separado — setup misturado com chamada
  // ❌ Problema 4: dados genéricos sem relação com o domínio NovaTech
  const result = await handler({ body: '{"question": "test"}' })

  // ❌ Problema 5: assertion que passa com qualquer valor não-nulo
  expect(result).toBeDefined()

  // ❌ Problema 6: sem verificação de source_document — requisito contratual ignorado
  // ❌ Problema 7: sem mock de Azure — está chamando o serviço real
})
```

**Por que este teste é perigoso:**

| Problema | Consequência concreta |
|----------|----------------------|
| Sem mock msw | Chama Azure OpenAI real — consome tokens, falha em CI sem credenciais |
| `question: "test"` | Não detecta regressões do domínio — passa mesmo com resposta errada |
| `toBeDefined()` sozinho | O modelo pode alucinar ou responder em inglês e o teste passa |
| Sem `source_document` | O requisito contratual VC-02 não é verificado |
| Sem `describe` | Relatório de falha não identifica o módulo quebrado |

---

## 5. Anti-padrões específicos de testes gerados por IA

Os padrões abaixo são recorrentes em outputs de LLMs sem guidance. O agente
que lê esta skill DEVE reconhecê-los e nunca reproduzi-los.

---

### AP-01 — Assertion de existência em vez de valor

**O que LLMs geram:**
```typescript
expect(result).toBeDefined()
expect(response.body).toBeTruthy()
expect(data).not.toBeNull()
```

**Por que é gerado:** o modelo generaliza "o teste deve verificar que algo retornou"
e usa a assertion mais fácil de escrever.

**O que gerar em vez disso:**
```typescript
expect(result.status).toBe(200)
expect(body.source_document).toBe('POL-001-B')
expect(body.answer).toMatch(/não.*elegível/i)
```

**Regra:** toda assertion DEVE verificar um campo específico com um valor
derivado da documentação NovaTech ou de um contrato do sistema.

---

### AP-02 — Mock genérico que intercepta tudo

**O que LLMs geram:**
```typescript
vi.mock('../../../src/services/search')
// ou
server.use(http.post('*', () => HttpResponse.json({})))
```

**Por que é gerado:** o modelo moca o módulo inteiro para evitar erros de
importação, ou usa glob `*` para simplicidade.

**O que gerar em vez disso:**
```typescript
server.use(
  http.post('*/indexes/novatech-docs/docs/search', () =>
    HttpResponse.json({ value: chunkFixtures.cargaPerigosaDireta })),
  http.post('*/openai/deployments/*/chat/completions', () =>
    HttpResponse.json(completionFixtures.hazardousCargoReturn))
)
```

**Regra:** cada handler msw DEVE especificar o endpoint exato e retornar
a fixture do cenário testado. Mock genérico esconde chamadas acidentais a serviços
reais e impede que `onUnhandledRequest: 'error'` cumpra seu papel.

---

### AP-03 — Dados de teste genéricos sem relação com o domínio

**O que LLMs geram:**
```typescript
const question = 'test question'
const chunks = [{ id: '1', content: 'some content', score: 0.9 }]
const expected = 'some response'
```

**Por que é gerado:** o modelo não tem contexto do domínio e usa placeholders.

**O que gerar em vez disso:**
```typescript
const question = queryFixtures.devolveLiquidoInflamavel
// = 'O cliente quer devolver uma carga de líquido inflamável. Como procedo?'

const chunks = chunkFixtures.cargaPerigosaDireta
// = [{ id: 'POL-001-B', content: 'cargas perigosas NÃO são elegíveis...', ... }]
```

**Regra:** perguntas e chunks DEVEM vir de `tests/fixtures/` com dados reais
do domínio NovaTech. Se a fixture necessária não existir, criá-la antes de
escrever o teste — nunca inline.

---

### AP-04 — Um único `it` testando múltiplos comportamentos

**O que LLMs geram:**
```typescript
it('should handle all query cases', async () => {
  // testa happy path
  const r1 = await handler({ body: JSON.stringify({ question: '...' }) })
  expect(r1.status).toBe(200)

  // testa carga perigosa
  const r2 = await handler({ body: JSON.stringify({ question: '...' }) })
  expect(r2.answer).toMatch(/não elegível/)

  // testa sem cobertura
  const r3 = await handler({ body: JSON.stringify({ question: '...' }) })
  expect(r3.source_document).toBeNull()
})
```

**Por que é gerado:** o modelo agrupa casos relacionados para "ser eficiente".

**O que gerar em vez disso:** um `it` por comportamento, cada um com seu
próprio setup msw e assertions. Se o teste falha, o nome do `it` identifica
exatamente o que quebrou — não "handle all query cases".

**Regra:** um `it` = um comportamento = uma condição = um conjunto de assertions.

---

### AP-05 — Setup msw fora do padrão de lifecycle

**O que LLMs geram:**
```typescript
// Mock definido no escopo do módulo, sem reset entre testes
const server = setupServer(
  http.post('*', () => HttpResponse.json({ answer: 'ok' }))
)
server.listen()

describe('QueryHandler', () => {
  it('...', async () => { ... })
  it('...', async () => { ... })  // compartilha o mesmo mock — vazamento de estado
})
```

**Por que é gerado:** o modelo coloca o `setupServer` no nível de módulo
e não adiciona `afterEach(() => server.resetHandlers())`.

**O que gerar em vez disso:** sempre o padrão de lifecycle completo:
```typescript
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())   // ← crítico: isola cada it
afterAll(() => server.close())
```

**Regra:** `resetHandlers()` no `afterEach` é obrigatório. Sem ele, um handler
definido em um `it` vaza para o próximo — tornando os testes dependentes de ordem.

---

### AP-06 — Importação direta do Azure SDK sem abstração

**O que LLMs geram:**
```typescript
import { SearchClient } from '@azure/search-documents'
import { OpenAIClient } from '@azure/openai'

vi.mock('@azure/search-documents')
vi.mock('@azure/openai')
```

**Por que é gerado:** o modelo vê os imports no código de produção e mocka
as dependências externas diretamente.

**Por que é errado:** acopla o teste à implementação interna, não ao
comportamento. Se o serviço de search mudar de SDK, todos os testes quebram
mesmo que o comportamento externo seja o mesmo. O contrato correto é com
o HTTP (msw), não com a biblioteca.

**Regra:** nunca mockar SDKs diretamente. Usar msw para interceptar as
chamadas HTTP que os SDKs fazem — essa é a camada de contrato correta.

---

## 6. Checklist de geração (use antes de submeter o teste)

Antes de entregar um teste gerado, verificar cada item:

- [ ] O arquivo está em `tests/integration/` com sufixo `.test.ts`?
- [ ] O `describe` raiz usa o nome exato do módulo de produção?
- [ ] Todo `it` segue o padrão `should [comportamento] when [condição]`?
- [ ] O setup msw usa `{ onUnhandledRequest: 'error' }`?
- [ ] `afterEach(() => server.resetHandlers())` está presente?
- [ ] Cada handler msw especifica a URL do endpoint, não `*`?
- [ ] Todos os dados de teste vêm de `tests/fixtures/` (sem hardcode inline)?
- [ ] Cada `it` tem Arrange, Act e Assert separados por linha em branco?
- [ ] Há ao menos uma assertion sobre `body.source_document` em testes de query?
- [ ] Nenhuma assertion usa `toBeDefined()` ou `toBeTruthy()` como única verificação?
- [ ] Cada `it` testa exatamente um comportamento em uma condição?

Se qualquer item estiver marcado como ❌, corrigir antes de submeter.

---

## 7. Processo de criação desta skill — evidência de uso

> Esta seção documenta como o Claude e o Claude Cowork foram utilizados,
> conforme exigido pelo enunciado do exercício QA 2.3.

### Prompt enviado ao Claude (geração do SKILL.md)

```
Você é QA sênior de um projeto chamado NovaTech Assistant — um assistente RAG
em TypeScript para atendentes de uma transportadora. Stack de testes: Vitest,
msw, TypeScript strict.

Crie o SKILL.md para a skill `create-integration-test` (nível Artifact na
hierarquia Foundation → Domain → Artifact).

A skill deve conter:
1. Frase-ativação — quando o agente deve usar esta skill
2. Dependências — quais skills ler antes (Foundation e Domain)
3. Template obrigatório com placeholders comentados
4. Dois exemplos completos: DO (teste correto com msw, fixtures do domínio
   NovaTech, Arrange/Act/Assert) e DON'T (teste com problemas comuns de LLM)
5. Anti-padrões específicos de testes gerados por IA — com o que o LLM gera,
   por que gera, e o que gerar em vez disso
6. Checklist de geração

Contexto de domínio disponível:
- Testing Standards do AGENTS.md (do exercício 2.1) — regras de nomenclatura,
  mocking, fixtures, proibições
- Teste ruim original: test('query endpoint works', async () => {
    const result = await handler({ body: '{"question": "test"}' });
    expect(result).toBeDefined(); })
- Fixtures do domínio: chunkFixtures.cargaPerigosaDireta (POL-001-B),
  queryFixtures.devolveLiquidoInflamavel, completionFixtures.hazardousCargoReturn
```

### v1 gerada × v2 refinada

| Aspecto | v1 (gerada pelo Claude) | v2 (refinada pelo QA) |
|---------|------------------------|----------------------|
| Anti-padrões | 3 genéricos (toBeDefined, sem describe, mock genérico) | 6 específicos ao projeto, cada um com "por que o LLM gera" + "o que gerar em vez disso" |
| Exemplos DO/DON'T | Código correto mas com `vi.mock` em vez de msw | Reescrito para usar msw consistentemente com os Testing Standards |
| Template | Sem `onUnhandledRequest: 'error'` no `beforeAll` | Adicionado — crítico para detectar chamadas reais acidentais |
| Dependências | Listadas sem ordem de leitura | Ordenadas 1º a 4º com justificativa por skill |
| Checklist de geração | Ausente na v1 — adicionado após perceber que a skill não tinha mecanismo de auto-revisão | 11 itens binários cobrindo todos os padrões obrigatórios |
| Frase-ativação | Gatilhos apenas em português — inconsistente com C3 do checklist (código em inglês) | Tabela bilíngue com nota explícita: idioma do gatilho ≠ idioma do código gerado |
| Exemplos DO | Apenas happy path de domínio (guardrail carga perigosa) | Adicionado DO (2): edge case de infraestrutura — Azure AI Search retorna 503, handler retorna 502 |
