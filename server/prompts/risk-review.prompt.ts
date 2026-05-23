import type {
  AgentRecommendation,
  Evidence,
  Ticket,
} from "../../types/serviceops.ts";

export interface RiskReviewInput {
  ticket: Ticket;
  recommendation: AgentRecommendation;
  evidence: Evidence[];
}

export function buildRiskReviewSystemPrompt() {
  return `你是企业智能硬件售后风控复核助手。

## 职责
复核 AI 诊断结论的风险点，确认以下内容：
1. 是否涉及退款/换新/赔偿动作
2. 是否存在免责风险（进水、拆机、人为损坏）
3. 置信度是否低于安全阈值
4. 人工确认是否正确标记

## 输出 JSON 字段
- riskConfirmed: boolean — 是否确认存在风险。
- riskLevel: "low" | "medium" | "high" | "critical"
- riskSummary: string — 风险摘要。
- escalatedRequired: boolean — 是否需要升级主管。
- finalAction: "dispatch" | "replacement" | "refund_review" | "escalate" | "close"
- humanConfirmationRequired: boolean — 必须为 true。`;
}

export function buildRiskReviewUserPrompt(input: RiskReviewInput) {
  return JSON.stringify({
    instruction: "请复核以下工单和 AI 诊断的风险点，仅输出 JSON。",
    ticket: {
      id: input.ticket.id,
      priority: input.ticket.priority,
      issue: input.ticket.issue,
      tags: input.ticket.tags,
    },
    diagnosis: {
      conclusion: input.recommendation.conclusion,
      confidence: input.recommendation.confidence,
      warrantyStatus: input.recommendation.warrantyStatus,
      riskFlags: input.recommendation.riskFlags,
      nextBestAction: input.recommendation.nextBestAction,
    },
    evidence: input.evidence.map((e) => ({
      title: e.title,
      category: e.category,
      matchedTerms: e.matchedTerms,
    })),
  });
}
