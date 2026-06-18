# Tracking Board — Cenários de Teste | Query Endpoint
## Artefato rastreável (simulação de output Claude Cowork)

**Projeto:** NovaTech Assistant
**Módulo:** Query Endpoint
**Gerado em:** 2024-01
**Fonte:** `specs/query-endpoint/test-plan.md`

---

## Kanban de cenários

### 🔴 Backlog (a implementar)

| ID | Descrição | VC | Tipo | Prioridade | Arquivo esperado |
|----|-----------|-----|------|------------|-----------------|
| TC-01 | Resposta entregue dentro de 30s com mocks | VC-01 | Performance | Alta | `tests/integration/query/performance.test.ts` |
| TC-02 | Timeout do Azure AI Search dispara fallback | VC-01 | Edge case | Alta | `tests/integration/query/performance.test.ts` |
| TC-03 | source_document preenchido em resposta SLA Gold | VC-02 | Happy path | Alta | `tests/integration/query/source-document.test.ts` |
| TC-04 | source_document presente com confiança baixa | VC-02 | Edge case | Alta | `tests/integration/query/source-document.test.ts` |
| TC-05 | Devolução de carga perigosa — negativa explícita | VC-03 | Happy path | **Crítica** | `tests/integration/query/guardrails.test.ts` |
| TC-06 | Framing indireto não burla negativa de carga perigosa | VC-03 | Edge case | **Crítica** | `tests/integration/query/guardrails.test.ts` |
| TC-07 | Pergunta sem cobertura retorna mensagem padrão | VC-04 | Happy path | Alta | `tests/integration/query/no-coverage.test.ts` |
| TC-08 | Resposta parcialmente coberta não extrapola | VC-04 | Edge case | Alta | `tests/integration/query/no-coverage.test.ts` |
| TC-RB-01 | Pergunta ambígua multi-domínio | — | Robustez | Média | `tests/integration/query/robustness.test.ts` |
| TC-RB-02 | Prompt injection via campo question | — | Robustez | Alta | `tests/integration/query/robustness.test.ts` |
| TC-RB-03 | Pergunta em inglês respondida em português | — | Robustez | Média | `tests/integration/query/robustness.test.ts` |
| TC-RB-04 | Tier Platinum inexistente não gera SLA inventado | — | Robustez | Alta | `tests/integration/query/robustness.test.ts` |
| TC-RB-05 | PROC-042 v1 + v2 — prioriza v2, declara v1 | — | Robustez | Alta | `tests/integration/query/robustness.test.ts` |

---

### 🟡 Em implementação

*Nenhum cenário em implementação ainda.*

---

### 🟢 Implementado e aprovado

*Nenhum cenário aprovado ainda — fase de estruturação.*

---

## Rastreabilidade VC → Cenários

| VC | Descrição do VC | Cenários que cobrem | Cobertura |
|----|----------------|---------------------|-----------|
| VC-01 | Resposta em < 30s para 95% das queries | TC-01, TC-02 | ✅ 2 cenários (happy + edge) |
| VC-02 | 100% das respostas incluem source_document | TC-03, TC-04 | ✅ 2 cenários (happy + edge) |
| VC-03 | Carga perigosa retorna negativa explícita | TC-05, TC-06 | ✅ 2 cenários (happy + edge) |
| VC-04 | Sem match retorna mensagem padrão | TC-07, TC-08 | ✅ 2 cenários (happy + edge) |
| — | Robustez (riscos específicos de LLM) | TC-RB-01 a TC-RB-05 | ✅ 5 cenários |

**Status geral:** 0/13 implementados · 13/13 especificados · Prontos para implementação

---

## Rastreabilidade Cenário → VC

| Cenário | Descrição | VC | Status |
|---------|-----------|-----|--------|
| TC-01 | Resposta dentro de 30s | VC-01 | 🔴 Backlog |
| TC-02 | Timeout dispara fallback | VC-01 | 🔴 Backlog |
| TC-03 | source_document em resposta SLA | VC-02 | 🔴 Backlog |
| TC-04 | source_document com baixa confiança | VC-02 | 🔴 Backlog |
| TC-05 | Negativa explícita — carga perigosa direta | VC-03 | 🔴 Backlog |
| TC-06 | Negativa explícita — framing indireto | VC-03 | 🔴 Backlog |
| TC-07 | Mensagem padrão — sem cobertura total | VC-04 | 🔴 Backlog |
| TC-08 | Sem extrapolação — cobertura parcial | VC-04 | 🔴 Backlog |
| TC-RB-01 | Pergunta ambígua — pede esclarecimento | Robustez | 🔴 Backlog |
| TC-RB-02 | Prompt injection — system prompt resiste | Robustez | 🔴 Backlog |
| TC-RB-03 | Pergunta em inglês — responde em PT | Robustez | 🔴 Backlog |
| TC-RB-04 | Tier inexistente — não alucina SLA | Robustez | 🔴 Backlog |
| TC-RB-05 | Doc contraditório — prioriza mais recente | Robustez | 🔴 Backlog |

---

## Fixtures necessárias antes da implementação

| Fixture | Tipo | Cenários que dependem | Status |
|---------|------|-----------------------|--------|
| `chunks.prazoDevolucao` | Chunks | TC-01 | 🔴 Pendente |
| `chunks.slaGold` | Chunks | TC-03 | 🔴 Pendente |
| `chunks.baixaConfianca` | Chunks | TC-04 | 🔴 Pendente |
| `chunks.cargaPerigosaDireta` | Chunks | TC-05 | 🔴 Pendente |
| `chunks.cargaPerigosaIndireta` | Chunks | TC-06 | 🔴 Pendente |
| `chunks.semCobertura` | Chunks | TC-07 | 🔴 Pendente |
| `chunks.freteEspecialNorte` | Chunks | TC-08 | 🔴 Pendente |
| `chunks.multiDominioPrazo` | Chunks | TC-RB-01 | 🔴 Pendente |
| `chunks.tierInexistente` | Chunks | TC-RB-04 | 🔴 Pendente |
| `chunks.proc042Contraditorio` | Chunks | TC-RB-05 | 🔴 Pendente |
| `queries.*` (todos) | Perguntas | Todos | 🔴 Pendente |
| `completionFixtures.*` | Respostas mock | Todos | 🔴 Pendente |

**Dependência:** fixtures devem ser implementadas antes de qualquer cenário.
Responsável: Dev + QA em conjunto (QA define os dados; Dev implementa o arquivo TS).

---

## Critérios de saída desta fase

O conjunto de cenários está pronto para merge quando:

- [ ] Todos os 13 cenários estão implementados e passando.
- [ ] Nenhum teste acessa Azure OpenAI ou Azure AI Search real.
- [ ] Coverage de `src/functions/query/` ≥ 80% de linhas.
- [ ] Suíte completa executa em < 60s no CI.
- [ ] TC-05 e TC-06 (VC-03 — guardrails críticos) passam sem exceção.
