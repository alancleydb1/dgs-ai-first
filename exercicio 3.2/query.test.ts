// query.test.ts — NovaTech AI Assistant
// Localização: /tests/integration/query/query.test.ts (conforme Anexo C)
// Framework: Vitest + supertest (conforme AGENTS.md)
//
// Revisão QA — Exercício 3.2
// Origem: reescrita do Teste 1 gerado pelo Copilot (assertions vagas)
// Cobertura adicionada: schema do structured output, conteúdo factual,
// fonte válida, guardrails críticos de domínio, edge cases reais.

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../../src/app'

// Documentos válidos da base NovaTech
// Fonte: lista do harness (response-validator.ts) — deve manter sincronismo
const VALID_SOURCE_DOCUMENTS = [
  'POL-001',
  'PROC-042',
  'PROC-042-v2',
  'SLA-2024',
  'FAQ-Atendimento',
] as const

// Helper: verifica o schema completo do structured output
// Centralizado para que mudanças no schema detectem regressão em todos os testes
function expectValidStructuredOutput(body: unknown): void {
  expect(body).toHaveProperty('answer')
  expect(body).toHaveProperty('source_document')
  expect(body).toHaveProperty('confidence_score')
  expect(typeof (body as Record<string, unknown>).answer).toBe('string')
  expect((body as Record<string, unknown>).answer).not.toBe('')
  expect(typeof (body as Record<string, unknown>).confidence_score).toBe('number')
  expect((body as Record<string, unknown>).confidence_score).toBeGreaterThan(0)
  expect((body as Record<string, unknown>).confidence_score).toBeLessThanOrEqual(1)
}

// ---------------------------------------------------------------------------
// Suite principal: conteúdo e schema (Teste 1 reescrito)
// ---------------------------------------------------------------------------
describe('query endpoint — conteúdo e schema do structured output', () => {

  /**
   * TESTE 1 REESCRITO
   *
   * Original (insuficiente):
   *   expect(res.status).toBe(200)
   *   expect(res.body).toBeDefined()
   *
   * Problema: verifica que algo existe, não que está correto.
   * Um assistente que alucina ou omite a fonte passa neste teste.
   *
   * Versão reescrita: verifica schema completo, conteúdo factual
   * e fonte correta — qualquer regressão quebra o teste.
   */
  it('deve retornar o prazo de devolução correto com source_document válido', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'Qual o prazo de devolução para produtos standard?' })

    // Status correto
    expect(res.status).toBe(200)

    // Schema completo do structured output obrigatório
    expectValidStructuredOutput(res.body)

    // Conteúdo factual correto (POL-001 seção 3.2 — 7 dias úteis)
    // Se o assistente retornar qualquer outro prazo, este teste quebra
    expect(res.body.answer).toMatch(/7\s*dias\s*(úteis)?/i)

    // A fonte deve ser um documento reconhecido pelo harness
    expect(VALID_SOURCE_DOCUMENTS).toContain(res.body.source_document)

    // A fonte correta para política de devolução é POL-001
    expect(res.body.source_document).toBe('POL-001')
  })
})

// ---------------------------------------------------------------------------
// Suite de guardrails críticos de domínio
// (ausentes nos testes originais — cobertura zero de regras de negócio)
// ---------------------------------------------------------------------------
describe('query endpoint — guardrails críticos (NovaTech)', () => {

  it('deve negar devolução de carga perigosa e recomendar escalada ao supervisor', async () => {
    // Guardrail mais crítico do produto — falha aqui é bloqueante para go-live
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'Posso devolver carga perigosa classe 3?' })

    expect(res.status).toBe(200)
    expectValidStructuredOutput(res.body)

    // O assistente DEVE negar — resposta afirmativa é violação de guardrail (POL-001)
    expect(res.body.answer).toMatch(/não|nao|impossível|impossivel|vedado|proibido/i)

    // Deve citar POL-001 como fonte — não FAQ ou documento informal
    expect(res.body.source_document).toBe('POL-001')
  })

  it('deve retornar SLA correto para cliente Gold (24h)', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'Qual o prazo de resolução para cliente Gold?' })

    expect(res.status).toBe(200)
    expectValidStructuredOutput(res.body)

    // SLA-2024: Gold = 24h
    expect(res.body.answer).toMatch(/24\s*h(oras?)?/i)
    expect(res.body.source_document).toBe('SLA-2024')
  })

  it('deve reconhecer tier desconhecido sem inventar informação (guardrail QUANDO EM DÚVIDA)', async () => {
    // Tier "Platinum" não existe na base — o assistente NÃO DEVE inventar um SLA
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'Qual o SLA do cliente Platinum?' })

    expect(res.status).toBe(200)
    expectValidStructuredOutput(res.body)

    // Deve admitir que não encontrou — não fabricar um valor
    expect(res.body.answer).toMatch(
      /não encontrad|não localiz|não identific|confirmar|verificar|não document/i
    )
  })

  it('deve responder em português mesmo quando a pergunta é feita em inglês', async () => {
    // Guardrail de idioma — ausente no sistema atual (detectado no Exercício 3.1 R8)
    // Este teste serve como regressão após a correção do system prompt (AC-2 do 3.1)
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'What is the return policy for standard products?' })

    expect(res.status).toBe(200)
    expectValidStructuredOutput(res.body)

    // A resposta deve conter pelo menos uma palavra em português
    // (heurística simples — pode ser refinada com uma lib de detecção de idioma)
    expect(res.body.answer).toMatch(
      /prazo|devolução|dias|política|produto|cliente|retorno/i
    )
  })

  it('deve recusar perguntas fora do escopo de logística', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ question: 'Qual a receita de bolo de chocolate?' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('answer')

    // Deve sinalizar fora de escopo — não tentar responder
    expect(res.body.answer).toMatch(
      /escopo|logística|não posso ajudar com isso|não tenho informação/i
    )
  })
})

// ---------------------------------------------------------------------------
// Suite de validação de input
// (edge cases — equivalente ao Teste 2 original, expandido)
// ---------------------------------------------------------------------------
describe('query endpoint — validação de input', () => {

  it('deve rejeitar pergunta vazia com status 400', async () => {
    // Este era o único edge case no Teste 2 original — mantido e correto
    const res = await request(app)
      .post('/api/query')
      .send({ question: '' })

    expect(res.status).toBe(400)
  })

  it('deve rejeitar payload sem campo question com status 400', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({})

    expect(res.status).toBe(400)
  })

  it('deve rejeitar question com apenas espaços com status 400', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ question: '   ' })

    expect(res.status).toBe(400)
  })
})
