import type {
  ActionDraft,
  AgentRecommendation,
  AiQualityMetric,
  ConfirmedActionType,
  Evidence,
  KnowledgeDoc,
  Product,
  RetrievalTrace,
  RoiMetric,
  ServiceOpsStore,
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketTimelineEvent,
  TraceStep,
  ValidationWarning,
  WarrantyPolicy,
  WarrantyStatus,
} from "../../types/serviceops.ts";
import type { ServiceOpsRepository } from "../repositories/serviceops.repository.ts";
export const COST_PER_AGENT_MINUTE = 4.8;
export const NOW = new Date("2026-05-23T09:00:00.000Z");

export function addMonths(date: Date, months: number) {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

export function evaluateWarranty(
  ticket: Ticket,
  product: Product,
  policy: WarrantyPolicy,
  now = NOW,
): {
  status: WarrantyStatus;
  expiresAt: string;
  reason: string;
} {
  const purchasedAt = new Date(ticket.purchasedAt);
  const expiresAt = addMonths(
    purchasedAt,
    policy.coverageMonths || product.warrantyMonths,
  );
  const issueText = `${ticket.issue} ${ticket.tags.join(" ")}`.toLowerCase();
  const hasVoidRisk = ["水", "漏液", "撬锁", "拆机", "人为", "进水"].some(
    (term) => issueText.includes(term.toLowerCase()),
  );

  if (hasVoidRisk) {
    return {
      status: "void_risk",
      expiresAt: expiresAt.toISOString(),
      reason: "描述中存在可能影响质保的风险词，需要人工复核证据。",
    };
  }

  if (expiresAt < now) {
    return {
      status: "expired",
      expiresAt: expiresAt.toISOString(),
      reason: "购买时间已超过当前质保期限。",
    };
  }

  if (ticket.priority === "urgent") {
    return {
      status: "manual_review",
      expiresAt: expiresAt.toISOString(),
      reason: "安全或通行风险工单需要人工确认后执行。",
    };
  }

  return {
    status: "valid",
    expiresAt: expiresAt.toISOString(),
    reason: "仍在产品质保覆盖期内。",
  };
}

export function getSlaState(ticket: Ticket, now = NOW) {
  const due = new Date(ticket.slaDueAt);
  const diffMinutes = Math.round((due.getTime() - now.getTime()) / 60000);

  if (ticket.status === "closed") {
    return { label: "已处理", tone: "green", diffMinutes };
  }

  if (diffMinutes < 0) {
    return { label: "已超时", tone: "red", diffMinutes };
  }

  if (diffMinutes <= 120) {
    return { label: "临近 SLA", tone: "amber", diffMinutes };
  }

  return { label: "进行中", tone: "blue", diffMinutes };
}

export function findPolicyForProduct(
  product: Product,
  policies: WarrantyPolicy[],
) {
  const policy = policies.find((item) => item.productLine === product.line);

  if (!policy) {
    throw new Error(
      `Missing warranty policy for product line: ${product.line}`,
    );
  }

  return policy;
}

export function searchKnowledge(
  ticket: Ticket,
  product: Product,
  docs: KnowledgeDoc[],
): { evidence: Evidence[]; retrievalTrace: RetrievalTrace } {
  const startTime = Date.now();
  const issue = ticket.issue.toLowerCase();
  const terms = [
    product.line,
    ticket.category,
    ...ticket.tags,
    ...issue.split(/[，。,.、\s]+/).filter(Boolean),
  ]
    .map((t) => String(t).toLowerCase())
    .filter((t) => t.length >= 2);

  const scored = docs
    .filter(
      (doc) => doc.productLine === product.line || doc.productLine === "all",
    )
    .map((doc) => {
      const content = doc.content.toLowerCase();
      const title = doc.title.toLowerCase();
      const matchedTerms: string[] = [];

      let score = 0;
      for (const term of terms) {
        const inContent = content.includes(term);
        const inTitle = title.includes(term);
        // 标题匹配权重 ×3
        if (inTitle) {
          score += 3;
          matchedTerms.push(term);
        } else if (inContent) {
          score += 1;
          matchedTerms.push(term);
        }
        // 分类匹配加分
        if (doc.category === ticket.category) score += 2;
      }

      return { doc, score, matchedTerms: [...new Set(matchedTerms)] };
    })
    .sort((a, b) => b.score - a.score);

  const topK = scored.slice(0, 3);

  const evidence: Evidence[] = topK.map(({ doc, score, matchedTerms }) => ({
    docId: doc.id,
    title: doc.title,
    quote:
      doc.content.length > 92 ? `${doc.content.slice(0, 92)}...` : doc.content,
    matchedTerms,
    score,
    category: doc.category,
    updatedAt: doc.updatedAt,
  }));

  const retrievalTrace: RetrievalTrace = {
    documents: evidence,
    durationMs: Date.now() - startTime,
    method: "keyword",
  };

  return { evidence, retrievalTrace };
}

export function chooseNextAction(
  ticket: Ticket,
  warrantyStatus: WarrantyStatus,
  confidence: number,
): ConfirmedActionType {
  if (ticket.priority === "urgent") return "dispatch";
  if (warrantyStatus === "void_risk") return "escalate";
  if (confidence < 0.72) return "escalate";
  if (ticket.issue.includes("退款")) return "refund_review";
  if (ticket.issue.includes("换新") && warrantyStatus === "valid")
    return "replacement";
  if (warrantyStatus === "expired") return "escalate";
  return "dispatch";
}

export function buildRiskFlags(
  ticket: Ticket,
  warrantyStatus: WarrantyStatus,
  confidence: number,
) {
  const flags: string[] = [];

  if (ticket.priority === "urgent") {
    flags.push("P0/P1 工单必须在 2 小时内由人工确认");
  }

  if (warrantyStatus === "void_risk") {
    flags.push("存在人为损坏或免责争议，需要上传检测照片与主管复核");
  }

  if (ticket.issue.includes("退款") || ticket.issue.includes("换新")) {
    flags.push("涉及资金、库存或补偿动作，AI 仅可预填建议");
  }

  if (confidence < 0.72) {
    flags.push("置信度低于自动分流阈值，建议人工确认");
  }

  return flags;
}

export function buildTrace(
  ticket: Ticket,
  evidence: Evidence[],
  warrantyStatus: WarrantyStatus,
): TraceStep[] {
  const evidenceDetail = evidence
    .map(
      (e) =>
        `${e.title} (${e.matchedTerms?.join("、") || "关键词匹配"}, 得分${e.score})`,
    )
    .join("；");

  return [
    {
      step: "读取订单与设备",
      detail: `订单 ${ticket.orderNo}，序列号 ${ticket.serialNumber}，购买时间 ${ticket.purchasedAt.slice(0, 10)}。`,
      durationMs: 72,
    },
    {
      step: "匹配质保政策",
      detail: `质保判断为 ${warrantyStatus}，风险动作进入人工确认。`,
      durationMs: 96,
    },
    {
      step: "检索知识库",
      detail: evidence.length
        ? `命中 ${evidence.length} 条：${evidenceDetail}`
        : "未命中相关文档，基于质保政策生成建议。",
      durationMs: 144,
    },
    {
      step: "生成坐席建议",
      detail: "输出处理结论、引用证据、风险点和下一步动作草稿。",
      durationMs: 318,
    },
  ];
}

export function buildMockRecommendation(
  ticket: Ticket,
  product: Product,
  policy: WarrantyPolicy,
  evidence: Evidence[],
  now = NOW,
): AgentRecommendation {
  const warranty = evaluateWarranty(ticket, product, policy, now);
  const confidenceMap: Record<WarrantyStatus, number> = {
    valid: 0.86,
    expired: 0.78,
    void_risk: 0.64,
    manual_review: 0.7,
  };
  const confidence = confidenceMap[warranty.status];
  const nextBestAction = chooseNextAction(ticket, warranty.status, confidence);
  const riskFlags = buildRiskFlags(ticket, warranty.status, confidence);
  const conclusion = buildConclusion(
    ticket,
    product,
    warranty.status,
    nextBestAction,
  );

  return {
    id: `rec-${ticket.id}`,
    ticketId: ticket.id,
    conclusion,
    confidence,
    warrantyStatus: warranty.status,
    evidence,
    suggestedActions: buildSuggestedActions(
      ticket,
      warranty.status,
      nextBestAction,
    ),
    riskFlags,
    nextBestAction,
    humanConfirmationRequired:
      nextBestAction !== "close" || riskFlags.length > 0,
    trace: buildTrace(ticket, evidence, warranty.status),
    createdAt: now.toISOString(),
  };
}

export function buildConclusion(
  ticket: Ticket,
  product: Product,
  warrantyStatus: WarrantyStatus,
  nextAction: ConfirmedActionType,
) {
  const actionText: Record<ConfirmedActionType, string> = {
    dispatch: "建议预约工程师上门检测",
    replacement: "建议预填换新审批",
    refund_review: "建议进入退款复核",
    escalate: "建议升级主管人工复核",
    close: "建议关闭工单",
  };

  if (warrantyStatus === "valid") {
    return `${product.name} 仍在质保期内，${actionText[nextAction]}，并保留故障复现证据。`;
  }

  if (warrantyStatus === "expired") {
    return `${product.name} 已超过质保期，建议先给出远程排查方案，再按付费检修流程处理。`;
  }

  if (warrantyStatus === "void_risk") {
    return `${product.name} 存在免责风险，AI 不建议直接承诺免费维修，应先收集检测照片并升级复核。`;
  }

  return `${product.name} 涉及安全或履约风险，建议人工确认后执行 ${actionText[nextAction]}。`;
}

export function buildSuggestedActions(
  ticket: Ticket,
  warrantyStatus: WarrantyStatus,
  nextAction: ConfirmedActionType,
) {
  const actions = ["同步故障排查结论与引用依据", "预填客服回复并要求坐席确认"];

  if (warrantyStatus === "valid") {
    actions.push("创建免费检修或换新审批草稿");
  }

  if (warrantyStatus === "expired") {
    actions.push("发送付费维修报价和远程排查步骤");
  }

  if (warrantyStatus === "void_risk") {
    actions.push("要求上传检测照片、门店记录和客户确认信息");
  }

  if (ticket.priority === "urgent" || nextAction === "dispatch") {
    actions.push("预约最近可用工程师并推送 SLA 提醒");
  }

  return actions;
}

export function buildActionDraft(
  ticket: Ticket,
  recommendation: AgentRecommendation,
  now = NOW,
): ActionDraft {
  const replyIntro =
    ticket.priority === "urgent"
      ? "我们已将该问题标记为高优先级售后工单。"
      : "我们已完成初步故障与质保核验。";

  return {
    id: `draft-${ticket.id}`,
    ticketId: ticket.id,
    reply: `${replyIntro}${recommendation.conclusion}后续动作将由坐席确认后执行，涉及换新、退款或上门服务不会自动触发。`,
    actionType: recommendation.nextBestAction,
    requiredHumanConfirmation: true,
    checklist: [
      "核对订单号、序列号和购买日期",
      "确认客户诉求与历史沟通记录",
      "检查 AI 引用依据是否匹配当前产品型号",
      "确认高风险动作已由人工审批",
    ],
    createdAt: now.toISOString(),
  };
}

export async function upsertRecommendation(
  repo: ServiceOpsRepository,
  recommendation: AgentRecommendation,
) {
  const store = await repo.getStoreSnapshot();
  const index = store.recommendations.findIndex(
    (item) => item.ticketId === recommendation.ticketId,
  );

  if (index >= 0) {
    store.recommendations[index] = recommendation;
  } else {
    store.recommendations.push(recommendation);
  }

  const ticket = store.tickets.find(
    (item) => item.id === recommendation.ticketId,
  );
  if (ticket && ticket.status === "new") {
    ticket.status =
      recommendation.confidence < 0.72 ? "pending_confirmation" : "diagnosed";
    await repo.updateTicket(ticket);
  }

  await repo.upsertRecommendation(recommendation);
}

export async function upsertActionDraft(
  repo: ServiceOpsRepository,
  draft: ActionDraft,
) {
  const store = await repo.getStoreSnapshot();
  const index = store.actionDrafts.findIndex(
    (item) => item.ticketId === draft.ticketId,
  );

  if (index >= 0) {
    store.actionDrafts[index] = draft;
  } else {
    store.actionDrafts.push(draft);
  }

  const ticket = store.tickets.find((item) => item.id === draft.ticketId);
  if (
    ticket &&
    ![
      "dispatching",
      "repairing",
      "replacement_review",
      "refund_review",
      "escalated",
      "closed",
    ].includes(ticket.status)
  ) {
    ticket.status = "pending_confirmation";
    await repo.updateTicket(ticket);
  }

  await repo.upsertActionDraft(draft);
}

const DIAGNOSED_STATUSES: TicketStatus[] = [
  "diagnosed",
  "pending_confirmation",
  "dispatching",
  "repairing",
  "replacement_review",
  "refund_review",
  "escalated",
  "closed",
];

const HUMAN_CONFIRMED_STATUSES: TicketStatus[] = [
  "pending_confirmation",
  "dispatching",
  "repairing",
  "replacement_review",
  "refund_review",
  "escalated",
  "closed",
];

export function calculateRoiMetrics(store: ServiceOpsStore): RoiMetric {
  const totalTickets = store.tickets.length;
  const diagnosedTickets = store.tickets.filter((ticket) =>
    DIAGNOSED_STATUSES.includes(ticket.status),
  ).length;
  const manualMinutes = store.tickets.reduce(
    (total, ticket) => total + ticket.estimatedManualMinutes,
    0,
  );
  const aiMinutes = store.tickets.reduce(
    (total, ticket) => total + ticket.aiAssistedMinutes,
    0,
  );
  const savedMinutes = Math.max(0, manualMinutes - aiMinutes);
  const riskyIds = new Set(
    store.recommendations.flatMap((item) =>
      item.riskFlags.length ? [item.ticketId] : [],
    ),
  );

  for (const ticket of store.tickets) {
    if (ticket.priority === "urgent" || ticket.status === "escalated") {
      riskyIds.add(ticket.id);
    }
  }

  return {
    totalTickets,
    diagnosedTickets,
    automationRate: roundRatio(diagnosedTickets, totalTickets),
    humanConfirmationRate: roundRatio(
      store.tickets.filter((ticket) =>
        HUMAN_CONFIRMED_STATUSES.includes(ticket.status),
      ).length,
      totalTickets,
    ),
    firstContactResolutionRate: 0.68,
    riskTicketCount: riskyIds.size,
    savedMinutes,
    savedHours: Number((savedMinutes / 60).toFixed(1)),
    estimatedSavingCny: Math.round(savedMinutes * COST_PER_AGENT_MINUTE),
    avgHandleTimeBefore: Number((manualMinutes / totalTickets).toFixed(1)),
    avgHandleTimeAfter: Number((aiMinutes / totalTickets).toFixed(1)),
    trend: buildTrend(store.tickets),
    priorityMix: buildPriorityMix(store.tickets),
  };
}

function roundRatio(value: number, total: number) {
  if (!total) return 0;
  return Number((value / total).toFixed(2));
}

function buildTrend(tickets: Ticket[]) {
  const days = ["05-18", "05-19", "05-20", "05-21", "05-22"];

  return days.map((day, index) => {
    const dayTickets = tickets.filter(
      (ticket) => ticket.createdAt.slice(5, 10) <= day,
    );
    const base = dayTickets.length
      ? dayTickets
      : tickets.slice(0, Math.min(index + 1, tickets.length));
    const manualMinutes = base.reduce(
      (total, ticket) => total + ticket.estimatedManualMinutes,
      0,
    );
    const aiMinutes = base.reduce(
      (total, ticket) => total + ticket.aiAssistedMinutes,
      0,
    );

    return {
      day,
      manualMinutes,
      aiMinutes,
      savedMinutes: Math.max(0, manualMinutes - aiMinutes),
    };
  });
}

function buildPriorityMix(tickets: Ticket[]) {
  const labelMap: Record<TicketPriority, string> = {
    urgent: "P0/P1",
    high: "高优先级",
    medium: "普通",
    low: "低优先级",
  };

  return (["urgent", "high", "medium", "low"] as TicketPriority[])
    .map((priority) => ({
      name: labelMap[priority],
      value: tickets.filter((ticket) => ticket.priority === priority).length,
    }))
    .filter((item) => item.value > 0);
}

// ---- Timeline utilities ----

export function sortTimelineEvents(
  events: TicketTimelineEvent[],
): TicketTimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}

export function appendTimelineEvent(
  ticket: Ticket,
  event: Omit<TicketTimelineEvent, "id" | "ticketId"> & {
    id?: string;
    ticketId?: string;
  },
  now = NOW,
): TicketTimelineEvent {
  const fullEvent: TicketTimelineEvent = {
    id: event.id || `tle-${ticket.id}-${Date.now()}`,
    ticketId: event.ticketId || ticket.id,
    at: event.at || now.toISOString(),
    type: event.type,
    title: event.title,
    detail: event.detail,
    actor: event.actor,
  };

  ticket.timeline.push(fullEvent);
  return fullEvent;
}

export function getLatestTimelineEvent(
  ticket: Ticket,
): TicketTimelineEvent | undefined {
  if (!ticket.timeline || ticket.timeline.length === 0) return undefined;
  return sortTimelineEvents(ticket.timeline).at(-1);
}

export function validateTimeline(ticket: Ticket): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!ticket.timeline || ticket.timeline.length === 0) {
    errors.push("工单时间线为空");
    return { valid: false, errors };
  }

  const sorted = sortTimelineEvents(ticket.timeline);

  // 第一事件必须是 system（建单）
  if (sorted[0].type !== "system") {
    errors.push("时间线首节点应为系统建单事件");
  }

  // 时间顺序不能倒置
  for (let i = 1; i < sorted.length; i++) {
    if (
      new Date(sorted[i].at).getTime() < new Date(sorted[i - 1].at).getTime()
    ) {
      errors.push(`时间线事件 ${sorted[i].id} 时间早于前一个事件`);
    }
  }

  // AI 事件不能在高风险动作之后（AI 只给建议）
  const riskActionIndex = sorted.findIndex(
    (e) =>
      ["agent", "field", "approval"].includes(e.type) &&
      (e.title.includes("派工") ||
        e.title.includes("换新") ||
        e.title.includes("退款") ||
        e.title.includes("升级")),
  );

  if (riskActionIndex >= 0) {
    const aiAfterRisk = sorted
      .slice(riskActionIndex)
      .some((e) => e.type === "ai");
    if (aiAfterRisk) {
      errors.push("AI 初诊事件不应出现在人工高风险动作之后");
    }
  }

  return { valid: errors.length === 0, errors };
}

/** 将 ConfirmedActionType 映射到对应的工单状态 */
export function mapActionToStatus(
  actionType: ConfirmedActionType,
): TicketStatus {
  const statusMap: Record<ConfirmedActionType, TicketStatus> = {
    dispatch: "dispatching",
    replacement: "replacement_review",
    refund_review: "refund_review",
    escalate: "escalated",
    close: "closed",
  };
  return statusMap[actionType];
}

// ---- AI Quality Metrics ----

export function calculateAiQualityMetrics(
  store: ServiceOpsStore,
): AiQualityMetric {
  const recs = store.recommendations;
  const totalDiagnosedTickets = recs.length;

  if (totalDiagnosedTickets === 0) {
    return {
      totalDiagnosedTickets: 0,
      averageConfidence: 0,
      lowConfidenceCount: 0,
      humanAdoptionRate: 0,
      riskInterceptionCount: 0,
      averageSavedMinutes: 0,
      warrantyReviewCount: 0,
      confidenceDistribution: [],
      actionTypeDistribution: [],
      riskFlagDistribution: [],
    };
  }

  // 平均置信度
  const totalConfidence = recs.reduce((sum, r) => sum + r.confidence, 0);
  const averageConfidence = Number(
    (totalConfidence / totalDiagnosedTickets).toFixed(2),
  );

  // 低置信度工单 (< 0.72)
  const lowConfidenceCount = recs.filter((r) => r.confidence < 0.72).length;

  // 风险拦截：包含风险标记的推荐
  const riskInterceptionCount = recs.filter(
    (r) => r.riskFlags.length > 0,
  ).length;

  // 人工采纳率：已执行人工确认动作的工单占比
  const confirmedTicketIds = new Set(
    store.tickets.filter((t) => t.confirmedAction).map((t) => t.id),
  );
  const adoptedCount = recs.filter((r) =>
    confirmedTicketIds.has(r.ticketId),
  ).length;
  const humanAdoptionRate = Number(
    (adoptedCount / totalDiagnosedTickets).toFixed(2),
  );

  // 平均节省时长
  const totalSaved = store.tickets.reduce(
    (sum, t) =>
      sum + Math.max(0, t.estimatedManualMinutes - t.aiAssistedMinutes),
    0,
  );
  const averageSavedMinutes = Number(
    (totalSaved / store.tickets.length).toFixed(1),
  );

  // 质保复核：void_risk + manual_review
  const warrantyReviewCount = recs.filter(
    (r) =>
      r.warrantyStatus === "void_risk" || r.warrantyStatus === "manual_review",
  ).length;

  // 置信度分布
  const confidenceBuckets: Array<{
    label: string;
    value: number;
    range: [number, number];
  }> = [
    { label: "≥90%", value: 0, range: [0.9, 1] },
    { label: "80-89%", value: 0, range: [0.8, 0.9] },
    { label: "70-79%", value: 0, range: [0.7, 0.8] },
    { label: "<70%", value: 0, range: [0, 0.7] },
  ];

  for (const r of recs) {
    for (const bucket of confidenceBuckets) {
      if (
        r.confidence >= bucket.range[0] &&
        (r.confidence < bucket.range[1] || bucket.range[1] === 1)
      ) {
        bucket.value++;
        break;
      }
    }
  }

  // 动作分布
  const actionLabels: Record<ConfirmedActionType, string> = {
    dispatch: "派工",
    replacement: "换新",
    refund_review: "退款复核",
    escalate: "升级主管",
    close: "关闭",
  };
  const actionCountMap = new Map<string, number>();
  for (const r of recs) {
    const label = actionLabels[r.nextBestAction];
    actionCountMap.set(label, (actionCountMap.get(label) || 0) + 1);
  }
  const actionTypeDistribution = Array.from(actionCountMap.entries()).map(
    ([action, value]) => ({
      action,
      value,
    }),
  );

  // 风险标记分布
  const flagCountMap = new Map<string, number>();
  for (const r of recs) {
    for (const flag of r.riskFlags) {
      const short = flag.length > 20 ? `${flag.slice(0, 20)}…` : flag;
      flagCountMap.set(short, (flagCountMap.get(short) || 0) + 1);
    }
  }
  const riskFlagDistribution = Array.from(flagCountMap.entries())
    .map(([flag, count]) => ({ flag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDiagnosedTickets,
    averageConfidence,
    lowConfidenceCount,
    humanAdoptionRate,
    riskInterceptionCount,
    averageSavedMinutes,
    warrantyReviewCount,
    confidenceDistribution: confidenceBuckets.filter((b) => b.value > 0),
    actionTypeDistribution,
    riskFlagDistribution,
  };
}

// ---- Agent Recommendation Normalization ----

const VALID_ACTIONS: ConfirmedActionType[] = [
  "dispatch",
  "replacement",
  "refund_review",
  "escalate",
  "close",
];
const VALID_WARRANTY: WarrantyStatus[] = [
  "valid",
  "expired",
  "void_risk",
  "manual_review",
];
const HIGH_RISK_ACTIONS: ConfirmedActionType[] = [
  "replacement",
  "refund_review",
  "escalate",
];

export function normalizeAgentRecommendation(
  raw: Record<string, unknown>,
  fallback: AgentRecommendation,
): { recommendation: AgentRecommendation; warnings: ValidationWarning[] } {
  const warnings: ValidationWarning[] = [];

  // confidence 必须在 0-1
  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) {
    warnings.push({
      field: "confidence",
      issue: `非法值 ${raw.confidence}，已规范为 fallback 值`,
      severity: "warning",
    });
    confidence = fallback.confidence;
  }
  if (confidence < 0 || confidence > 1) {
    warnings.push({
      field: "confidence",
      issue: `值 ${raw.confidence} 超出范围，已夹至合法区间`,
      severity: "warning",
    });
  }
  confidence = Math.max(0, Math.min(1, confidence));

  // suggestedActions 必须是字符串数组
  let suggestedActions: string[] = fallback.suggestedActions;
  if (Array.isArray(raw.suggestedActions)) {
    const filtered = raw.suggestedActions
      .map((a) => String(a).trim())
      .filter(Boolean);
    if (filtered.length > 0) {
      suggestedActions = filtered;
    } else {
      warnings.push({
        field: "suggestedActions",
        issue: "模型返回空数组，已使用 fallback",
        severity: "warning",
      });
    }
  } else {
    warnings.push({
      field: "suggestedActions",
      issue: "模型未返回数组，已使用 fallback",
      severity: "error",
    });
  }

  // riskFlags 必须是字符串数组
  let riskFlags: string[] = fallback.riskFlags;
  if (Array.isArray(raw.riskFlags)) {
    const filtered = raw.riskFlags.map((f) => String(f).trim()).filter(Boolean);
    riskFlags = filtered.length > 0 ? filtered : fallback.riskFlags;
  } else {
    warnings.push({
      field: "riskFlags",
      issue: "模型未返回数组，已使用 fallback",
      severity: "error",
    });
  }

  // nextBestAction 校验
  let nextBestAction: ConfirmedActionType = fallback.nextBestAction;
  if (
    typeof raw.nextBestAction === "string" &&
    VALID_ACTIONS.includes(raw.nextBestAction as ConfirmedActionType)
  ) {
    nextBestAction = raw.nextBestAction as ConfirmedActionType;
  } else {
    warnings.push({
      field: "nextBestAction",
      issue: `非法值 ${raw.nextBestAction}，已使用 fallback`,
      severity: "warning",
    });
  }

  // warrantyStatus 校验
  let warrantyStatus: WarrantyStatus = fallback.warrantyStatus;
  if (
    typeof raw.warrantyStatus === "string" &&
    VALID_WARRANTY.includes(raw.warrantyStatus as WarrantyStatus)
  ) {
    warrantyStatus = raw.warrantyStatus as WarrantyStatus;
  }

  // conclusion
  const conclusion =
    typeof raw.conclusion === "string" && raw.conclusion.trim().length > 10
      ? raw.conclusion.trim()
      : fallback.conclusion;

  // evidence 保留 fallback（模型不适合返回完整证据结构）
  const evidence = fallback.evidence;

  // humanConfirmationRequired：高风险动作必须为 true
  let humanConfirmationRequired = Boolean(raw.humanConfirmationRequired);
  if (
    HIGH_RISK_ACTIONS.includes(nextBestAction) &&
    !humanConfirmationRequired
  ) {
    humanConfirmationRequired = true;
    warnings.push({
      field: "humanConfirmationRequired",
      issue: "高风险动作已强制要求人工确认",
      severity: "warning",
    });
  }

  const recommendation: AgentRecommendation = {
    ...fallback,
    conclusion,
    confidence,
    warrantyStatus,
    evidence,
    suggestedActions,
    riskFlags,
    nextBestAction,
    humanConfirmationRequired,
    createdAt: new Date().toISOString(),
  };

  return { recommendation, warnings };
}
