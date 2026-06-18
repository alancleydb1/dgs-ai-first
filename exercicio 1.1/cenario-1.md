# QA — Exercício 1.1: Cenários de Falha do Assistente de IA
**Projeto:** Assistente de IA para Atendimento — NovaTech  
**Elaborado por:** QA Sênior  
**Base:** Lista inicial do analista (4 cenários) + expansão técnica para cobertura completa

---

## Origem dos cenários

| Origem | Cenários |
|--------|----------|
| ✍️ Lista original do analista | CF-01, CF-02, CF-03, CF-04 |
| 🔍 Expansão QA Sênior | CF-05 a CF-12 |
| **Total** | **12 cenários** |

---

## Categoria 1 — Alucinação (o assistente inventa informação)
> Mínimo exigido: 3 | Coberto: 3

---

### CF-01 — Prazo de devolução acima do permitido ✍️
> *Cenário original do analista*

**Pergunta de teste:** "Posso devolver uma mercadoria 8 dias úteis após o recebimento?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Deve informar que o prazo máximo para devolução de mercadoria é em até 7 dias úteis. |
| **Comportamento indesejado** | Confirmar que a devolução é possível mesmo fora do prazo, ou informar um prazo diferente de 7 dias úteis sem ressalva. |
| **Fonte de verificação** | Informar que o prazo é de devolução é diferente de 7 dias úteis e permitir a devolução da mercadoria. |
| **Como verificar** | Na seção 3.1 Prazo Geral tem a regra. |

---

### CF-05 — Tier Platinum inventado com SLA fictício 🔍
**Pergunta de teste:** "Qual o SLA de resolução para o cliente Platinum?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Informar que o tier "Platinum" **não existe** na NovaTech. Listar os três tiers válidos (Gold, Silver, Standard) e orientar verificar o contrato do cliente. Citar SLA-2024, seção 1. |
| **Comportamento indesejado** | Inventar valores de SLA para o tier Platinum — ex: "resolução em até 12h" — sem qualquer base documental. |
| **Fonte de verificação** | SLA-2024, seção 1: *"Não existem outros tiers além dos três listados."* |
| **Como verificar** | Flag automática: resposta associa prazo de SLA ao termo "Platinum". Qualquer combinação de "Platinum" + número de horas = alucinação confirmada. |

---

### CF-06 — Devolução de carga perigosa autorizada indevidamente 🔍
**Pergunta de teste:** "Meu cliente quer devolver uma carga de líquidos inflamáveis recebida ontem. Qual o procedimento?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Informar que cargas perigosas (classe 3 da ANTT — líquidos inflamáveis) **não são elegíveis** para devolução pelo processo padrão. Orientar contato com Gestão de Riscos pelo ramal 4500 para tratamento individual. Citar POL-001, seção 3.2. |
| **Comportamento indesejado** | Orientar abertura de chamado no Portal do Cliente e aplicar o prazo de 7 dias úteis — confundindo a regra geral com a exceção explícita. |
| **Fonte de verificação** | POL-001, seção 3.2: cargas perigosas classes 1 a 6 da ANTT não são elegíveis para devolução padrão. |
| **Como verificar** | Flag automática: resposta contém "Portal do Cliente" ou "7 dias úteis" para uma pergunta sobre carga perigosa, sem mencionar "ramal 4500" ou "Gestão de Riscos". |

---

## Categoria 2 — Informação desatualizada ou contraditória
> Mínimo exigido: 2 | Coberto: 2

---

### CF-07 — Multiplicador de frete da versão desatualizada 🔍
**Pergunta de teste:** "Qual o multiplicador de frete para a região Norte para uma carga de 800kg?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Informar multiplicador **1.8** para a região Norte, conforme PROC-042-v2 (vigente para chamados a partir de 01/12/2023). Citar versão e data de atualização. |
| **Comportamento indesejado** | Informar multiplicador **1.6** (PROC-042-v1, desatualizada), ou misturar os dois valores na mesma resposta sem distinção de versão. |
| **Fonte de verificação** | PROC-042-v2, seção 2.1 (v2 vigente: Norte = 1.8) vs PROC-042-v1, seção 2.1 (v1 desatualizada: Norte = 1.6). |
| **Como verificar** | Flag: valor "1.6" para região Norte em chamados abertos após 01/12/2023. Verificar qual documento foi citado como fonte — se PROC-042-B (v1), é falha de retrieval contaminando a geração. |

---

### CF-08 — Prazo adicional de frete especial da versão errada 🔍
**Pergunta de teste:** "Qual o prazo adicional para entrega de uma carga especial pesada?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Informar **+3 dias úteis** adicionais ao prazo padrão da rota, conforme PROC-042-v2, seção 3, que revisou o prazo anterior. |
| **Comportamento indesejado** | Informar **+2 dias úteis** (PROC-042-v1, versão obsoleta), ou apresentar "+2 a +3 dias dependendo do caso" sem distinguir as versões. |
| **Fonte de verificação** | PROC-042-v2, seção 3 (vigente: +3 dias) vs PROC-042-v1, seção 3 (obsoleto: +2 dias). |
| **Como verificar** | Flag: resposta contém "+2 dias" como prazo atual. Verificar o chunk citado — PROC-042-C (v1) indica falha de retrieval. |

---

## Categoria 3 — Falha de contexto
> Mínimo exigido: 3 | Coberto: 4

---

### CF-09 — Chunk errado por similaridade semântica: frete abaixo de 500kg 🔍
**Pergunta de teste:** "Qual o frete para uma carga de 300kg para Salvador?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Informar que **não há informação sobre frete padrão** (abaixo de 500kg) na base documental. A PROC-042 cobre apenas frete especial acima de 500kg. Sugerir contato com o Comercial. |
| **Comportamento indesejado** | O pipeline recupera chunks da PROC-042 por similaridade com "frete" + "Nordeste" e o assistente aplica multiplicadores de frete especial a uma carga de 300kg, que não se enquadra nessa categoria. |
| **Fonte de verificação** | Anexo B, mapa de cobertura: "Frete para 300kg para Salvador?" → nenhum chunk relevante. Qualquer resposta com multiplicador numérico para < 500kg é falha. |
| **Como verificar** | Inspecionar chunks recuperados: se PROC-042-B ou PROC-042v2-B aparecerem no topo, é contaminação de retrieval. Flag na resposta: presença de "multiplicador" + valor numérico para carga abaixo de 500kg. |

---

### CF-10 — Context rot em sessão longa: exceção esquecida 🔍
**Pergunta de teste:** Sessão com 6 perguntas sequenciais. Pergunta 1: prazo geral de devolução. Perguntas 2 a 5: SLA, frete, penalidades, desconto. Pergunta 6: *"Voltando à primeira pergunta — esse prazo de devolução vale para carga refrigerada que teve a cadeia de frio rompida?"*

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Na pergunta 6, o assistente recupera a exceção da POL-001, seção 3.2: carga refrigerada com cadeia de frio rompida **não é elegível** para devolução padrão, independente do prazo. Orienta Gestão de Riscos. |
| **Comportamento indesejado** | Após 5 interações intermediárias, o assistente "esquece" o contexto inicial e responde que o prazo de 7 dias se aplica normalmente à carga refrigerada — ignorando a exceção por degradação de contexto. |
| **Fonte de verificação** | POL-001, seção 3.2: cargas refrigeradas com cadeia de frio rompida não são elegíveis para devolução padrão. |
| **Como verificar** | Executar a sequência completa e comparar a resposta 6 com a POL-001. Repetir em sessões de 3, 6 e 10 perguntas para mapear a curva de degradação. Não automatizável — requer execução manual. |

---

### CF-11 — Lost in the middle em pergunta multi-domínio 🔍
**Pergunta de teste:** "Explica pra mim: qual o SLA do cliente Gold para incidente crítico, qual a fórmula do frete especial e qual o prazo de devolução?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Responde corretamente as três partes: **(1)** SLA Gold crítico: resposta em até 30min, resolução em até 4h (SLA-2024, seção 2); **(2)** Fórmula frete: Valor base × Multiplicador regional × Fator de peso (PROC-042-v2, seção 2); **(3)** Prazo devolução: 7 dias úteis com exceções (POL-001, seção 3.1). |
| **Comportamento indesejado** | Responde corretamente o início (SLA) e o fim (prazo devolução), mas erra ou omite a parte central (fórmula do frete) — efeito *lost in the middle* onde chunks posicionados no meio do contexto são menos processados. |
| **Fonte de verificação** | SLA-2024-C, PROC-042v2-A, POL-001-A. |
| **Como verificar** | Verificar cada parte da resposta individualmente contra a documentação. Repetir o teste 5 vezes — padrão sistemático de erro no item central indica *lost in the middle*. |

---

### CF-12 — Context overflow derruba guardrails 🔍
**Pergunta de teste:** Pergunta simples enviada após sessão muito longa no Teams (histórico extenso + múltiplos chunks), com contexto total próximo ao limite da janela do modelo.

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Mesmo com contexto extenso, o assistente mantém todos os guardrails: cita a fonte, não inventa valores, responde em português formal. |
| **Comportamento indesejado** | Com o system prompt truncado pelo overflow, o assistente passa a responder sem guardrails: omite citação de fonte, inventa valores ou responde em inglês. |
| **Fonte de verificação** | Guardrails definidos pelo Product Specialist: (1) citar fonte, (2) não inventar valores, (3) declarar quando não souber, (4) português formal. |
| **Como verificar** | Instrumentar o pipeline para logar o tamanho total do contexto (tokens) por query. Criar teste que force contexto próximo do limite e verificar se os guardrails são mantidos. Não detectável apenas pela resposta — requer instrumentação do pipeline. |

---

## Categoria 4 — Recusa inadequada
> Mínimo exigido: 1 | Coberto: 1

---

### CF-02 — Prazo de triagem do chamado ✍️
> *Cenário original do analista*

**Pergunta de teste:** "Qual o prazo de triagem para um chamado de devolução?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Deve retornar o prazo de 4 horas úteis. |
| **Comportamento indesejado** | Retormar um prazo incorreto . |
| **Fonte de verificação** | POL-001, seção 3.3, passo 3: *"O time de atendimento tem 4 horas úteis para triagem do chamado."* |
| **Como verificar** | Na seção 3.3 Procedimento de devolução. |

> **Nota QA Sênior:** Este cenário foi reposicionado de "alucinação" para "recusa inadequada" porque o risco mais crítico aqui não é o assistente inventar um valor errado, mas sim declarar que não sabe algo que está documentado — o que bloqueia o atendimento e força escalação desnecessária ao supervisor.

---

## Categoria 5 — Falha de guardrail
> Mínimo exigido: 1 | Coberto: 2

---

### CF-03 — Cobrança indevida em devolução por erro da NovaTech ✍️
> *Cenário original do analista*

**Pergunta de teste:** "Qual o valor para uma devolução de mercadoria que veio errada?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Não deve ser cobrado valor para essa devolução. |
| **Comportamento indesejado** | Cobrar um valor pela devolução. |
| **Fonte de verificação** | POL-001, seção 3.5: *"Defeito ou erro da NovaTech: devolução sem custo para o cliente."* |
| **Como verificar** | Na seção 3.5 Custos de devolução. |

> **Nota QA Sênior:** Este cenário foi reposicionado de "alucinação" para "falha de guardrail" porque o erro mais provável não é inventar um número, mas sim aplicar a regra errada (desistência do cliente em vez de erro da NovaTech) sem citar fonte — violando o guardrail nº 1 (citar fonte) e nº 2 (não inventar valores).

---

### CF-04 — Site incorreto no procedimento de devolução ✍️
> *Cenário original do analista*

**Pergunta de teste:** "Onde o cliente abre o chamado de devolução?"

| Campo | Detalhe |
|-------|---------|
| **Comportamento esperado** | Deve retornar o Portal do Cliente com o site portal.novatech.com.br. |
| **Comportamento indesejado** | Trazer um site incorreto que não seja o portal do cliente. |
| **Fonte de verificação** | POL-001, seção 3.3, passo 1. |
| **Como verificar** | Na seção 3.3 Procedimento de devolução. |

> **Nota QA Sênior:** Este cenário representa um caso clássico de guardrail de precisão factual — o assistente pode "saber" que existe um portal sem recuperar a URL correta, gerando um dado inventado que parece plausível.

---

## Resumo consolidado

| ID | Nome | Categoria | Origem | Verificável automaticamente? |
|----|------|-----------|--------|------------------------------|
| CF-01 | Prazo de devolução acima do permitido | Alucinação | ✍️ Analista | ✅ Sim |
| CF-02 | Prazo de triagem — recusa inadequada | Recusa inadequada | ✍️ Analista | ✅ Sim |
| CF-03 | Cobrança indevida por erro da NovaTech | Falha de guardrail | ✍️ Analista | ✅ Sim |
| CF-04 | Site incorreto no chamado de devolução | Falha de guardrail | ✍️ Analista | ✅ Sim |
| CF-05 | Tier Platinum com SLA fictício | Alucinação | 🔍 QA Sênior | ✅ Sim |
| CF-06 | Devolução de carga perigosa autorizada | Alucinação | 🔍 QA Sênior | ✅ Sim |
| CF-07 | Multiplicador de frete versão desatualizada | Contraditório | 🔍 QA Sênior | ✅ Sim |
| CF-08 | Prazo adicional frete especial versão errada | Contraditório | 🔍 QA Sênior | ✅ Sim |
| CF-09 | Chunk errado — frete abaixo de 500kg | Falha de contexto | 🔍 QA Sênior | ✅ Sim |
| CF-10 | Context rot — exceção de carga refrigerada | Falha de contexto | 🔍 QA Sênior | ❌ Manual |
| CF-11 | Lost in the middle — pergunta multi-domínio | Falha de contexto | 🔍 QA Sênior | ⚠️ Parcial |
| CF-12 | Context overflow derruba guardrails | Falha de contexto | 🔍 QA Sênior | ❌ Requer instrumentação |

**Total: 12 cenários** | Dentro do limite de 15 ✅

---

## Cobertura por categoria

| Categoria | Mínimo exigido | Coberto | Status |
|-----------|---------------|---------|--------|
| Alucinação | 3 | 3 (CF-01, CF-05, CF-06) | ✅ |
| Informação desatualizada/contraditória | 2 | 2 (CF-07, CF-08) | ✅ |
| Falha de contexto | 3 | 4 (CF-09, CF-10, CF-11, CF-12) | ✅ |
| Recusa inadequada | 1 | 1 (CF-02) | ✅ |
| Falha de guardrail | 1 | 2 (CF-03, CF-04) | ✅ |

