import type {
  Evidence,
  Product,
  Ticket,
  WarrantyPolicy,
} from "../../types/serviceops.ts";

export interface DiagnosePromptInput {
  ticket: Ticket;
  product: Product;
  policy: WarrantyPolicy;
  evidence: Evidence[];
}

export function buildDiagnoseSystemPrompt() {
  return `你是企业智能硬件售后工单 AI 诊断助手（ServiceOps AI）。

## 你的职责
1. 基于工单信息、保修政策、知识库文档，输出结构化初诊结论。
2. 你必须输出合法 JSON，不输出其他内容。
3. 涉及退款、换新、派工、投诉升级等高风险动作，必须标记为需要人工确认。

## 输出 JSON 字段说明
- conclusion: string — 诊断结论，包含产品名称、质保状态和建议动作。
- confidence: number — 置信度 0-1，根据证据充分程度判断。
- warrantyStatus: "valid" | "expired" | "void_risk" | "manual_review"
- evidence: Array<{ docId: string; title: string; quote: string; matchedTerms: string[] }> — 引用的知识库依据。
- suggestedActions: string[] — 建议坐席执行的动作列表。
- riskFlags: string[] — 需要人工关注的风险信号。
- nextBestAction: "dispatch" | "replacement" | "refund_review" | "escalate" | "close"
- humanConfirmationRequired: boolean — 高风险动作必须为 true。

## 约束
- 如果工单描述中出现"水"、"漏液"、"撬锁"、"拆机"、"人为"、"进水"等词，warrantyStatus 应为 "void_risk"。
- 如果产品已过保修期，warrantyStatus 应为 "expired"。
- 如果是安全风险（如冒烟、无法开锁、电池过热），priority urgent 时 warrantyStatus 应为 "manual_review"。
- 你绝不能自动批准退款、换新、赔偿或投诉升级。
- 置信度 < 0.72 时 nextBestAction 应为 "escalate"。`;
}

export function buildDiagnoseUserPrompt(input: DiagnosePromptInput) {
  return JSON.stringify({
    instruction: "请基于以下信息进行工单初诊，仅输出 JSON。",
    ticket: {
      id: input.ticket.id,
      orderNo: input.ticket.orderNo,
      title: input.ticket.title,
      priority: input.ticket.priority,
      category: input.ticket.category,
      issue: input.ticket.issue,
      purchasedAt: input.ticket.purchasedAt,
      tags: input.ticket.tags,
      transcript: input.ticket.transcript,
    },
    product: {
      name: input.product.name,
      line: input.product.line,
      model: input.product.model,
      warrantyMonths: input.product.warrantyMonths,
    },
    policy: {
      coverageMonths: input.policy.coverageMonths,
      exclusions: input.policy.exclusions,
      repairRules: input.policy.repairRules,
      replacementRules: input.policy.replacementRules,
    },
    evidence: input.evidence.map((e) => ({
      docId: e.docId,
      title: e.title,
      quote: e.quote,
      matchedTerms: e.matchedTerms,
      score: e.score,
    })),
  });
}
