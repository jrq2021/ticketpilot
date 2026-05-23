import type { AgentRecommendation, Ticket } from "../../types/serviceops.ts";

export interface DraftReplyInput {
  ticket: Ticket;
  recommendation: AgentRecommendation;
}

export function buildDraftReplySystemPrompt() {
  return `你是企业智能硬件售后客服草稿助手。

## 职责
根据工单信息和 AI 诊断结论，生成一条面向客户的回复草稿。
回复要专业、有温度、不含内部术语。

## 输出 JSON 字段
- reply: string — 完整的客户回复草稿。
- actionType: "dispatch" | "replacement" | "refund_review" | "escalate" | "close"
- requiredHumanConfirmation: boolean — 必须为 true。
- checklist: string[] — 坐席发送前需核对的事项列表。`;
}

export function buildDraftReplyUserPrompt(input: DraftReplyInput) {
  return JSON.stringify({
    instruction: "请为以下工单生成客服回复草稿，仅输出 JSON。",
    ticket: {
      title: input.ticket.title,
      issue: input.ticket.issue,
      customerName: input.ticket.customerId,
      priority: input.ticket.priority,
    },
    diagnosis: {
      conclusion: input.recommendation.conclusion,
      warrantyStatus: input.recommendation.warrantyStatus,
      suggestedActions: input.recommendation.suggestedActions,
      riskFlags: input.recommendation.riskFlags,
    },
  });
}
