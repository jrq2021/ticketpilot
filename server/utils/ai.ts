import type {
  AgentRecommendation,
  DiagnoseResponse,
  Evidence,
  Product,
  RetrievalTrace,
  Ticket,
  ValidationWarning,
  WarrantyPolicy,
} from "../../types/serviceops.ts";
import {
  buildMockRecommendation,
  normalizeAgentRecommendation,
  NOW,
} from "./domain.ts";
import {
  buildDiagnoseSystemPrompt,
  buildDiagnoseUserPrompt,
} from "../prompts/diagnose-ticket.prompt.ts";

export interface AiProvider {
  diagnose(input: {
    ticket: Ticket;
    product: Product;
    policy: WarrantyPolicy;
    evidence: Evidence[];
    retrievalTrace?: RetrievalTrace;
  }): Promise<DiagnoseResponse>;
}

export class MockAiProvider implements AiProvider {
  async diagnose(input: {
    ticket: Ticket;
    product: Product;
    policy: WarrantyPolicy;
    evidence: Evidence[];
    retrievalTrace?: RetrievalTrace;
  }): Promise<DiagnoseResponse> {
    const recommendation = buildMockRecommendation(
      input.ticket,
      input.product,
      input.policy,
      input.evidence,
      NOW,
    );

    return {
      recommendation,
      provider: "mock",
      fallbackUsed: false,
      validationWarnings: [],
      retrievalTrace: input.retrievalTrace || {
        documents: input.evidence,
        durationMs: 0,
        method: "keyword",
      },
    };
  }
}

export class OpenAiCompatibleProvider implements AiProvider {
  constructor(
    private readonly config: {
      apiKey: string;
      baseUrl: string;
      model: string;
    },
  ) {}

  async diagnose(input: {
    ticket: Ticket;
    product: Product;
    policy: WarrantyPolicy;
    evidence: Evidence[];
    retrievalTrace?: RetrievalTrace;
  }): Promise<DiagnoseResponse> {
    const retrievalTrace = input.retrievalTrace || {
      documents: input.evidence,
      durationMs: 0,
      method: "keyword" as const,
    };

    const fallback = buildMockRecommendation(
      input.ticket,
      input.product,
      input.policy,
      input.evidence,
      NOW,
    );

    // 无 API Key → 直接 fallback
    if (!this.config.apiKey) {
      return {
        recommendation: fallback,
        provider: "mock",
        fallbackUsed: true,
        validationWarnings: [
          {
            field: "provider",
            issue: "未配置 API Key，已降级为 Mock 输出",
            severity: "warning",
          },
        ],
        retrievalTrace,
      };
    }

    const modelProvider = this.config.baseUrl.includes("deepseek")
      ? "deepseek"
      : "openai";
    const systemPrompt = buildDiagnoseSystemPrompt();
    const userPrompt = buildDiagnoseUserPrompt({
      ticket: input.ticket,
      product: input.product,
      policy: input.policy,
      evidence: input.evidence,
    });

    let rawContent: string | undefined;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);

      const response = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2048,
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          recommendation: fallback,
          provider: modelProvider,
          fallbackUsed: true,
          validationWarnings: [
            {
              field: "api",
              issue: `API 返回 ${response.status}: ${errorText.slice(0, 80)}`,
              severity: "error",
            },
          ],
          retrievalTrace,
        };
      }

      const payload = await response.json().catch(() => null);
      rawContent = payload?.choices?.[0]?.message?.content;

      if (!rawContent || typeof rawContent !== "string") {
        return {
          recommendation: fallback,
          provider: modelProvider,
          fallbackUsed: true,
          validationWarnings: [
            {
              field: "content",
              issue: "模型返回空内容或格式异常，已降级为 Mock",
              severity: "error",
            },
          ],
          retrievalTrace,
        };
      }

      const parsed = JSON.parse(rawContent);
      const { recommendation, warnings } = normalizeAgentRecommendation(
        parsed as Record<string, unknown>,
        fallback,
      );

      return {
        recommendation,
        provider: modelProvider,
        fallbackUsed: false,
        validationWarnings: warnings,
        retrievalTrace,
        rawContent,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isTimeout =
        err instanceof DOMException && err.name === "AbortError";

      return {
        recommendation: fallback,
        provider: modelProvider,
        fallbackUsed: true,
        validationWarnings: [
          {
            field: "api",
            issue: isTimeout
              ? "DeepSeek 请求超时（30s），已降级为 Mock"
              : `调用异常: ${message.slice(0, 80)}`,
            severity: "error",
          },
        ],
        retrievalTrace,
        rawContent,
      };
    }
  }
}

export function createAiProvider(config: {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}): AiProvider {
  if (config.provider === "openai") {
    return new OpenAiCompatibleProvider({
      apiKey: config.apiKey || "",
      baseUrl: config.baseUrl || "https://api.openai.com/v1",
      model: config.model || "gpt-4o-mini",
    });
  }

  return new MockAiProvider();
}
