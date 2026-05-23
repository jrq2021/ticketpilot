import type { AgentRecommendation, Evidence, Product, Ticket, WarrantyPolicy } from '../../types/serviceops.ts'
import { buildMockRecommendation, NOW } from './domain.ts'

export interface AiProvider {
  diagnose(input: {
    ticket: Ticket
    product: Product
    policy: WarrantyPolicy
    evidence: Evidence[]
  }): Promise<AgentRecommendation>
}

export class MockAiProvider implements AiProvider {
  async diagnose(input: {
    ticket: Ticket
    product: Product
    policy: WarrantyPolicy
    evidence: Evidence[]
  }) {
    return buildMockRecommendation(input.ticket, input.product, input.policy, input.evidence, NOW)
  }
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(private readonly config: {
    apiKey: string
    baseUrl: string
    model: string
  }) {}

  async diagnose(input: {
    ticket: Ticket
    product: Product
    policy: WarrantyPolicy
    evidence: Evidence[]
  }) {
    if (!this.config.apiKey) {
      return buildMockRecommendation(input.ticket, input.product, input.policy, input.evidence, NOW)
    }

    const fallback = buildMockRecommendation(input.ticket, input.product, input.policy, input.evidence, NOW)
    const response = await fetch(`${this.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              '你是企业售后工单 AI 助手。',
              '只能输出 JSON。',
              '退款、换新、派工、升级投诉等动作必须标记为需要人工确认。',
              '输出字段包含 conclusion, confidence, suggestedActions, riskFlags。'
            ].join('')
          },
          {
            role: 'user',
            content: JSON.stringify({
              ticket: input.ticket,
              product: input.product,
              policy: input.policy,
              evidence: input.evidence
            })
          }
        ]
      })
    })

    if (!response.ok) {
      return fallback
    }

    const payload = await response.json()
    const content = payload?.choices?.[0]?.message?.content

    if (!content || typeof content !== 'string') {
      return fallback
    }

    try {
      const parsed = JSON.parse(content)

      return {
        ...fallback,
        conclusion: String(parsed.conclusion || fallback.conclusion),
        confidence: normalizeConfidence(parsed.confidence, fallback.confidence),
        suggestedActions: normalizeStringArray(parsed.suggestedActions, fallback.suggestedActions),
        riskFlags: normalizeStringArray(parsed.riskFlags, fallback.riskFlags)
      }
    } catch {
      return fallback
    }
  }
}

export function createAiProvider(config: {
  provider?: string
  apiKey?: string
  baseUrl?: string
  model?: string
}): AiProvider {
  if (config.provider === 'openai') {
    return new OpenAiCompatibleProvider({
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || 'https://api.openai.com/v1',
      model: config.model || 'gpt-4o-mini'
    })
  }

  return new MockAiProvider()
}

function normalizeConfidence(value: unknown, fallback: number) {
  const numberValue = Number(value)
  if (Number.isFinite(numberValue)) {
    return Math.max(0, Math.min(1, numberValue))
  }
  return fallback
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback
  const normalized = value.map((item) => String(item).trim()).filter(Boolean)
  return normalized.length ? normalized : fallback
}
