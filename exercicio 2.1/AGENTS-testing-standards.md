# AGENTS.md — NovaTech Assistant
## Seção: Testing Standards (QA)

> **Escopo desta seção:** Regras obrigatórias para geração e revisão de testes no projeto
> `novatech-assistant`. Todo agente de IA (GitHub Copilot, Claude Code) DEVE ler esta seção
> antes de gerar qualquer arquivo em `tests/`. Estas regras derivam das decisões técnicas
> do projeto (Vitest, msw, TypeScript strict) e dos riscos específicos de um sistema RAG
> com documentação contraditória.

---

## Testing Standards

### 1. Stack e configuração

- Framework: **Vitest** — não usar Jest, Mocha ou qualquer outro.
- Mocking de HTTP externo: **msw (Mock Service Worker)** — nunca chamar Azure OpenAI,
  Azure AI Search ou qualquer API real nos testes.
- Coverage mínimo obrigatório: **80% de linhas** — o CI rejeita PRs abaixo desse limiar.
- Tipos de teste e onde vivem:
  - `tests/unit/` — sem chamadas externas, mocks para todas as dependências.
  - `tests/integration/` — mocks msw para HTTP externo; integração entre módulos internos.
  - `tests/e2e/` — fluxo completo; usar com cautela (consumo de tokens real).
- Fixtures compartilhadas ficam em `tests/fixtures/` — nunca duplicar dados de teste
  entre arquivos.

---

### 2. Nomenclatura obrigatória

```
describe('<NomeDoMódulo>', () => {
  it('should <comportamento esperado> when <condição>', () => { ... })
})
```

**DEVE:**
- `describe` recebe o nome exato do módulo ou função sendo testada.
- `it` começa com `should` e descreve o comportamento em inglês.
- O nome do arquivo de teste espelha o arquivo de produção com sufixo `.test.ts`
  (ex.: `src/services/search.ts` → `tests/unit/services/search.test.ts`).

**NÃO DEVE:**
- Usar `test('query endpoint works', ...)` — sem describe, sem condição.
- Usar nomes genéricos como `it('should work')`, `it('returns something')`.
- Usar português nos nomes de describe/it (documentação de status pode ser em português;
  código e testes são em inglês).

---

### 3. Estrutura interna obrigatória: Arrange / Act / Assert

Todo teste DEVE ter as três seções comentadas explicitamente quando não forem óbvias,
e sempre separadas por linha em branco:

```typescript
it('should return source_document field when chunk is found', async () => {
  // Arrange
  const question = 'Qual o prazo de devolução?'
  const mockChunks = chunkFixtures.prazoDevolucao  // de tests/fixtures/chunks.ts

  server.use(
    http.post('*/openai/deployments/*/embeddings', () =>
      HttpResponse.json(embeddingFixtures.standard)),
    http.post('*/indexes/*/docs/search', () =>
      HttpResponse.json({ value: mockChunks })),
    http.post('*/openai/deployments/*/chat/completions', () =>
      HttpResponse.json(completionFixtures.withSource('POL-001-A')))
  )

  // Act
  const result = await queryHandler({ body: JSON.stringify({ question }) })

  // Assert
  expect(result.status).toBe(200)
  expect(result.body.source_document).toBe('POL-001-A')
  expect(result.body.answer).toContain('7')  // prazo em dias
})
```

**DEVE:**
- Assertions específicas ao comportamento — testar o **campo exato** e o **valor esperado**.
- Ao menos uma assertion sobre o campo `source_document` em todo teste de query endpoint
  (requisito contratual: toda resposta cita fonte).
- Ao menos uma assertion sobre o conteúdo da resposta (não só sobre o status HTTP).

**NÃO DEVE:**
- `expect(result).toBeDefined()` sozinho — não testa nada além de "não jogou exceção".
- `expect(result).toBeTruthy()` — idem.
- Múltiplos comportamentos no mesmo `it` (um teste, um comportamento).

---

### 4. Mocking

#### 4.1 HTTP externo (Azure OpenAI, Azure AI Search)

Usar **msw** com handlers declarados por cenário. O handler DEVE ser o mais específico
possível — nunca mockar "qualquer POST" globalmente.

```typescript
// DO — handler específico ao endpoint e ao cenário
server.use(
  http.post('*/indexes/novatech-docs/docs/search', () =>
    HttpResponse.json({ value: [] }))  // simula zero chunks recuperados
)

// DON'T — handler genérico demais
server.use(
  http.post('*', () => HttpResponse.json({}))
)
```

O `server` msw DEVE ser inicializado no `beforeAll` e resetado no `afterEach` para evitar
vazamento de estado entre testes.

#### 4.2 Dados de domínio (chunks, queries, respostas)

Usar **factories** e **fixtures** de `tests/fixtures/` — nunca inline hardcoded:

```typescript
// DO — importa fixture do domínio NovaTech
import { chunkFixtures, queryFixtures } from '../../fixtures'

const chunks = chunkFixtures.prazoDevolucao          // POL-001-A real
const question = queryFixtures.devolveCargaPerigosa  // pergunta real do domínio

// DON'T — dados genéricos sem conexão com o domínio
const chunks = [{ id: '1', content: 'test content' }]
const question = 'test'
```

Os fixtures DEVEM usar dados realistas do domínio NovaTech extraídos do Anexo B
(chunks reais: POL-001-A, SLA-2024-B, PROC-042v2-A etc.).

---

### 5. Fixtures obrigatórias para testes de RAG

O arquivo `tests/fixtures/chunks.ts` DEVE exportar ao menos os seguintes conjuntos,
derivados dos chunks do pipeline de RAG (Anexo B):

| Export | Chunks incluídos | Cenário coberto |
|--------|-----------------|-----------------|
| `prazoDevolucao` | POL-001-A, POL-001-B | Pergunta sobre prazo — happy path |
| `cargaPerigosa` | POL-001-B | Pergunta sobre devolução de carga perigosa |
| `slaGold` | SLA-2024-A, SLA-2024-B | Pergunta sobre SLA de cliente Gold |
| `freteEspecial` | PROC-042v2-A, PROC-042v2-B | Pergunta sobre frete acima de 500kg |
| `semCobertura` | `[]` (array vazio) | Pergunta sem documento indexado correspondente |
| `documentosContraditórios` | PROC-042-A + PROC-042v2-A | Duas versões do mesmo documento |

O arquivo `tests/fixtures/queries.ts` DEVE exportar perguntas reais do domínio
(não "test" nem "hello"):

```typescript
export const queryFixtures = {
  prazoDevolucao: 'Qual o prazo para solicitar devolução de mercadoria?',
  devolveCargaPerigosa: 'Posso devolver uma carga de líquido inflamável?',
  slaGold: 'Qual o SLA de resolução para cliente Gold?',
  tierInexistente: 'Qual o SLA do cliente Platinum?',
  freteNordeste600kg: 'Quanto custa o frete para 600kg para Salvador?',
  freteAbaixo500kg: 'Qual o valor do frete para 300kg para Curitiba?',
}
```

---

### 6. Proibições absolutas

Os comportamentos abaixo fazem o teste falhar no code review de QA,
independentemente de coverage ou status do CI:

| Proibição | Motivo |
|-----------|--------|
| Chamar Azure OpenAI ou Azure AI Search real | Custo, flakiness, dados de produção |
| Depender da ordem de execução dos testes | Testes devem ser independentes e paralelizáveis |
| Dados hardcoded sem relação com o domínio (`"test"`, `"foo"`, `123`) | Testes com dados fictícios não detectam regressões de domínio |
| `console.log` em testes | Poluição de output; usar `logger` do projeto |
| Assertions que passam com qualquer valor (`toBeDefined`, `toBeTruthy` sozinhos) | Não detectam alucinação nem resposta errada |
| Importar diretamente de `node_modules` de Azure SDK sem abstrair | Acopla o teste à implementação, não ao comportamento |

---

### 7. Casos obrigatórios para o query endpoint

Todo PR que modifica `src/functions/query/` DEVE incluir testes cobrindo:

1. **Happy path com fonte:** pergunta com chunk relevante recuperado → resposta contém
   `source_document` preenchido com identificador real (ex: `"POL-001-A"`).
2. **Pergunta sem cobertura:** nenhum chunk recuperado → resposta contém mensagem padrão
   de "não encontrado", sem inventar informação.
3. **Carga perigosa + devolução:** pergunta sobre devolução de carga perigosa →
   resposta contém negativa explícita (não pode pelo processo padrão) e menciona ramal 4500.
4. **Documentos contraditórios:** chunks de PROC-042 v1 e v2 recuperados juntos →
   resposta prioriza v2 e informa que existe versão anterior.
5. **Tier inexistente:** pergunta sobre cliente Platinum → resposta informa que só existem
   Gold, Silver e Standard; não inventa SLA para Platinum.
6. **Validação de input:** body malformado (sem campo `question`, JSON inválido) →
   status 400 com mensagem de erro estruturada.

---

## Reescrita do teste ruim — Antes e Depois

### ANTES (gerado pelo Copilot sem guidance)

```typescript
// ❌ Teste gerado pelo Copilot sem guidance — NÃO usar como referência
test('query endpoint works', async () => {
  const result = await handler({ body: '{"question": "test"}' });
  expect(result).toBeDefined();
});
```

**Problemas identificados:**

| Problema | Impacto |
|----------|---------|
| Sem `describe` — não sabemos qual módulo é testado | Dificulta leitura e manutenção |
| Nome `'query endpoint works'` — não descreve comportamento nem condição | Falha não explica o que quebrou |
| `question: "test"` — dado genérico, sem relação com o domínio NovaTech | Não detecta regressões de domínio |
| `expect(result).toBeDefined()` — passa com qualquer valor não-nulo | Alucinação e erro passam no teste |
| Sem mock de Azure OpenAI nem AI Search | Chamada real em teste = custo + flakiness |
| Sem assertion sobre `source_document` | Requisito contratual não é verificado |
| Sem arrange/act/assert separados | Dificulta diagnóstico quando falha |

---

### DEPOIS (reescrito seguindo os Testing Standards)

```typescript
// ✅ Teste reescrito — segue Testing Standards do projeto

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { handler } from '../../../src/functions/query/handler'
import { chunkFixtures, queryFixtures, completionFixtures, embeddingFixtures } from '../../fixtures'

const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('QueryHandler', () => {

  describe('when a relevant chunk is found', () => {
    it('should return 200 with source_document populated when question matches indexed content', async () => {
      // Arrange
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json(embeddingFixtures.standard)),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          HttpResponse.json({ value: chunkFixtures.prazoDevolucao })),
        http.post('*/openai/deployments/*/chat/completions', () =>
          HttpResponse.json(completionFixtures.withSource('POL-001-A')))
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.prazoDevolucao })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(200)
      expect(body.source_document).toBe('POL-001-A')
      expect(body.answer).toMatch(/7.*dias/i)  // prazo de 7 dias úteis da POL-001-A
    })
  })

  describe('when no chunk is found', () => {
    it('should return 200 with "not found" message and no invented content when question has no coverage', async () => {
      // Arrange
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json(embeddingFixtures.standard)),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          HttpResponse.json({ value: chunkFixtures.semCobertura })),  // array vazio
        http.post('*/openai/deployments/*/chat/completions', () =>
          HttpResponse.json(completionFixtures.notFound))
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.freteAbaixo500kg })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(200)
      expect(body.answer).toMatch(/não encontr|sem informação/i)
      expect(body.source_document).toBeNull()
    })
  })

  describe('when question involves dangerous cargo return', () => {
    it('should return explicit denial and refer to ramal 4500 when asked about returning hazardous cargo', async () => {
      // Arrange
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json(embeddingFixtures.standard)),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          HttpResponse.json({ value: chunkFixtures.cargaPerigosa })),
        http.post('*/openai/deployments/*/chat/completions', () =>
          HttpResponse.json(completionFixtures.hazardousCargoReturn))
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.devolveCargaPerigosa })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(200)
      expect(body.answer).toMatch(/não.*processo padrão|não.*elegível/i)
      expect(body.answer).toMatch(/4500|Gestão de Riscos/i)
      expect(body.source_document).toBe('POL-001-B')
    })
  })

  describe('when contradictory documents are retrieved', () => {
    it('should prioritize PROC-042-v2 and disclose existence of older version when both versions are in context', async () => {
      // Arrange
      server.use(
        http.post('*/openai/deployments/*/embeddings', () =>
          HttpResponse.json(embeddingFixtures.standard)),
        http.post('*/indexes/novatech-docs/docs/search', () =>
          // Simula retrieval retornando chunks de ambas as versões do PROC-042
          HttpResponse.json({ value: chunkFixtures.documentosContraditórios })),
        http.post('*/openai/deployments/*/chat/completions', () =>
          HttpResponse.json(completionFixtures.contradictoryDocs))
      )

      // Act
      const result = await handler({
        body: JSON.stringify({ question: queryFixtures.freteNordeste600kg })
      })
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(200)
      // Multiplicador correto é da v2 (novembro/2023): Norte 1.8, não 1.6 da v1
      expect(body.answer).toMatch(/1[,.]8|v2|novembro.*2023/i)
      // Deve informar que existe versão anterior — transparência sobre contradição
      expect(body.answer).toMatch(/versão anterior|versão.*antiga|v1/i)
      // Fonte deve apontar para o documento mais recente
      expect(body.source_document).toMatch(/PROC-042v2/)
    })
  })

  describe('when input is malformed', () => {
    it('should return 400 with structured error when body is missing required question field', async () => {
      // Arrange — sem mock de Azure: a validação acontece antes de qualquer chamada externa

      // Act
      const result = await handler({ body: JSON.stringify({}) })  // sem campo question
      const body = JSON.parse(result.body)

      // Assert
      expect(result.status).toBe(400)
      expect(body.error).toBeDefined()
      expect(body.error.field).toBe('question')
    })
  })

})
```

**Melhorias aplicadas:**

| Antes | Depois | Padrão aplicado |
|-------|--------|-----------------|
| `test(...)` sem describe | `describe('QueryHandler', ...)` com sub-describes por cenário | Nomenclatura §2 |
| Nome vago `'works'` | `'should return 200 with source_document populated when...'` | Nomenclatura §2 |
| `question: "test"` | `queryFixtures.prazoDevolucao` (pergunta real do domínio) | Fixtures §5 |
| `expect(result).toBeDefined()` | Assertions sobre `status`, `source_document`, conteúdo da resposta | Assertions §3 |
| Sem mock | msw com handlers específicos por endpoint e cenário | Mocking §4.1 |
| 1 teste cobre tudo | 5 `it` independentes, cada um cobrindo um comportamento em uma condição | Estrutura §3 |
| Sem setup/teardown | `beforeAll/afterEach/afterAll` para msw server | Mocking §4.1 |
| Caso de documentos contraditórios ausente | Teste dedicado para PROC-042 v1 + v2 simultâneos no contexto | Casos obrigatórios §7 |

---

## Critérios de code review de QA

Os critérios abaixo são objetivos: dois QAs avaliando o mesmo teste DEVEM chegar
à mesma conclusão de aprovação ou reprovação.

---

### Critério 1 — Assertions verificam comportamento de domínio, não existência

**Aprovado:** o teste verifica um campo específico com um valor derivado da documentação
NovaTech (ex.: `source_document` igual a `'POL-001-A'`, prazo de `'7 dias'`).

**Reprovado:** o teste usa `toBeDefined()`, `toBeTruthy()`, `not.toThrow()` como
única assertion, ou verifica apenas o status HTTP sem verificar o conteúdo da resposta.

*Racional:* assertions vagas passam mesmo quando o modelo alucina ou retorna
a resposta errada com status 200.

---

### Critério 2 — Dados de teste são do domínio NovaTech

**Aprovado:** perguntas e chunks vêm de `tests/fixtures/` com dados reais do domínio
(termos como "carga perigosa", "cliente Gold", "frete especial", identificadores
como "POL-001-A", "SLA-2024-B").

**Reprovado:** dados genéricos inline (`"test"`, `"foo"`, `{ id: 1 }`, `"hello"`)
ou fixtures inventadas sem correspondência nos documentos NovaTech.

*Racional:* dados fictícios não detectam regressões específicas do domínio de logística —
o teste passa mesmo quando o assistente confunde políticas.

---

### Critério 3 — Casos críticos de RAG estão cobertos no PR

**Aprovado:** o PR que modifica o query endpoint inclui ao menos um teste para cada
um dos 6 casos obrigatórios listados na seção 7 (happy path, sem cobertura,
carga perigosa, documentos contraditórios, tier inexistente, input inválido).

**Reprovado:** PR modifica lógica de retrieval ou montagem de prompt sem adicionar
ou atualizar ao menos os casos correspondentes.

*Racional:* os riscos mais altos do sistema RAG da NovaTech (alucinação, inversão
de regra de carga perigosa, mistura de versões de PROC-042) só são detectados
se houver testes específicos para eles — coverage geral de 80% não garante isso.

---

### Critério 4 — Coverage mínima de 80% de linhas por arquivo modificado

**Aprovado:** o relatório de coverage do Vitest (`vitest run --coverage`) mostra
≥ 80% de linhas cobertas em cada arquivo de `src/` modificado pelo PR.

**Reprovado:** qualquer arquivo de produção alterado no PR com coverage abaixo de 80%
de linhas — independentemente da coverage agregada do repositório.

> **Nota de aplicação:** coverage agregada de 80% não implica que cada arquivo
> modificado individualmente esteja coberto. O QA DEVE verificar o relatório
> por arquivo, não apenas o total. Arquivos novos têm o mesmo limiar desde o
> primeiro commit — não existe período de carência.

*Racional:* um arquivo com 10% de coverage pesando pouco no agregado passa no
CI mas carrega risco não-testado direto para produção. A verificação por arquivo
fecha esse gap sem alterar o limiar do CI.

---

## Apêndice — Processo de criação desta seção

> Esta seção documenta como o Claude foi utilizado na elaboração dos Testing Standards,
> conforme exigido pelo enunciado do exercício QA 2.1.

### Prompt principal utilizado

```
Você é QA de um projeto chamado NovaTech Assistant — um assistente RAG
(Retrieval-Augmented Generation) para atendentes de uma transportadora.

O stack de testes é: Vitest, msw para mocking HTTP, TypeScript strict,
coverage mínimo de 80% de linhas, CI via GitHub Actions.

As fontes de risco específicas deste sistema são:
- O assistente pode alucinar informações não presentes nos chunks recuperados
- Existe documentação contraditória (PROC-042 v1 e v2 com multiplicadores diferentes)
- Cargas perigosas (classes 1-6 ANTT) não podem ser devolvidas pelo processo padrão —
  uma resposta errada aqui tem impacto operacional real
- O assistente deve sempre retornar o campo source_document com o identificador
  do chunk usado

Escreva a seção "Testing Standards" do AGENTS.md do projeto. Ela será lida por
agentes de IA (GitHub Copilot, Claude Code) antes de gerar qualquer arquivo em tests/.
A seção deve cobrir: stack e configuração, nomenclatura obrigatória (describe/it),
estrutura Arrange/Act/Assert, padrão de mocking com msw, fixtures obrigatórias
para RAG com dados do domínio NovaTech, proibições absolutas, e casos obrigatórios
para o query endpoint.

As regras devem ser prescritivas (DEVE/NÃO DEVE), não descritivas.
```

### Primeira versão gerada × versão final

| Aspecto | Primeira versão (Claude) | Versão final (após revisão QA) |
|---------|--------------------------|-------------------------------|
| Fixtures | Listadas genericamente ("crie fixtures para RAG") | Mapeadas com exports nomeados e chunks reais do Anexo B (POL-001-A, SLA-2024-B etc.) |
| Casos obrigatórios | 4 casos genéricos | 6 casos com critério de aprovação específico por caso, incluindo tier inexistente e documentos contraditórios |
| Proibições | 3 proibições gerais | 6 proibições em tabela com motivo explícito por item |
| Nomenclatura | Padrão `describe/it` correto desde a 1ª versão | Mantido, adicionada regra de idioma (inglês em testes) |
| Mocking | Exemplo básico de msw | Adicionado `onUnhandledRequest: 'error'` e `afterAll(() => server.close())` — ausentes na 1ª versão |

### O que foi ajustado manualmente (não veio do Claude)

- A tabela de fixtures com os nomes exatos dos exports (`prazoDevolucao`, `cargaPerigosa`, `documentosContraditórios`) e a correspondência com os chunks do Anexo B — o Claude gerou nomes genéricos.
- O `onUnhandledRequest: 'error'` no setup do msw — o Claude omitiu na primeira versão; é crítico para detectar chamadas reais acidentais.
- O Critério 4 de coverage por arquivo (não por agregado) — ausente na primeira versão; adicionado após identificar que o CI de 80% agregado não garante cobertura individual.
- O caso de documentos contraditórios no teste reescrito — o Claude cobriu 4 dos 6 casos obrigatórios; o caso de PROC-042 v1 + v2 foi adicionado manualmente na revisão.
