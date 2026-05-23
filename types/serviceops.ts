export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus =
  | "new"
  | "assigned"
  | "diagnosed"
  | "pending_confirmation"
  | "dispatching"
  | "repairing"
  | "replacement_review"
  | "refund_review"
  | "escalated"
  | "closed";
export type WarrantyStatus =
  | "valid"
  | "expired"
  | "void_risk"
  | "manual_review";
export type ConfirmedActionType =
  | "dispatch"
  | "replacement"
  | "refund_review"
  | "escalate"
  | "close";
export type TimelineEventType =
  | "system"
  | "ai"
  | "agent"
  | "field"
  | "approval";

export interface Customer {
  id: string;
  name: string;
  tier: "standard" | "plus" | "enterprise";
  city: string;
  phoneMasked: string;
  lifetimeValue: number;
}

export interface Product {
  id: string;
  name: string;
  line: string;
  model: string;
  warrantyMonths: number;
  avgRepairCost: number;
  replacementCost: number;
}

export interface WarrantyPolicy {
  id: string;
  productLine: string;
  coverageMonths: number;
  exclusions: string[];
  repairRules: string[];
  replacementRules: string[];
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  productLine: string;
  category: string;
  content: string;
  updatedAt: string;
}

export interface ConversationTurn {
  speaker: "customer" | "agent";
  at: string;
  text: string;
}

export interface TicketTimelineEvent {
  id: string;
  ticketId: string;
  at: string;
  type: TimelineEventType;
  title: string;
  detail: string;
  actor?: string;
}

export interface Ticket {
  id: string;
  orderNo: string;
  title: string;
  customerId: string;
  productId: string;
  serialNumber: string;
  channel: "app" | "wechat" | "phone" | "store";
  priority: TicketPriority;
  category: string;
  issue: string;
  purchasedAt: string;
  createdAt: string;
  slaDueAt: string;
  status: TicketStatus;
  estimatedManualMinutes: number;
  aiAssistedMinutes: number;
  transcript: ConversationTurn[];
  tags: string[];
  timeline: TicketTimelineEvent[];
  confirmedAction?: {
    type: ConfirmedActionType;
    note: string;
    confirmedAt: string;
  };
}

export interface Evidence {
  docId: string;
  title: string;
  quote: string;
  /** 匹配到的关键词 */
  matchedTerms: string[];
  /** 检索相关度分数 */
  score: number;
  /** 知识库分类 */
  category: string;
  /** 文档更新时间 */
  updatedAt: string;
}

export interface TraceStep {
  step: string;
  detail: string;
  durationMs: number;
}

export interface RetrievalTrace {
  /** 检索到的文档列表 */
  documents: Evidence[];
  /** 检索耗时 ms */
  durationMs: number;
  /** 检索方法 */
  method: "keyword" | "vector" | "hybrid";
}

export interface ValidationWarning {
  field: string;
  issue: string;
  severity: "error" | "warning";
}

export interface AgentRecommendation {
  id: string;
  ticketId: string;
  conclusion: string;
  confidence: number;
  warrantyStatus: WarrantyStatus;
  evidence: Evidence[];
  suggestedActions: string[];
  riskFlags: string[];
  nextBestAction: ConfirmedActionType;
  /** 是否要求人工确认 */
  humanConfirmationRequired: boolean;
  trace: TraceStep[];
  createdAt: string;
}

export interface ActionDraft {
  id: string;
  ticketId: string;
  reply: string;
  actionType: ConfirmedActionType;
  requiredHumanConfirmation: boolean;
  checklist: string[];
  createdAt: string;
}

export interface RoiMetric {
  totalTickets: number;
  diagnosedTickets: number;
  automationRate: number;
  humanConfirmationRate: number;
  firstContactResolutionRate: number;
  riskTicketCount: number;
  savedMinutes: number;
  savedHours: number;
  estimatedSavingCny: number;
  avgHandleTimeBefore: number;
  avgHandleTimeAfter: number;
  trend: Array<{
    day: string;
    manualMinutes: number;
    aiMinutes: number;
    savedMinutes: number;
  }>;
  priorityMix: Array<{
    name: string;
    value: number;
  }>;
}

export interface TicketWithRelations extends Ticket {
  customer: Customer;
  product: Product;
  recommendation?: AgentRecommendation;
  actionDraft?: ActionDraft;
}

export interface ServiceOpsStore {
  customers: Customer[];
  products: Product[];
  policies: WarrantyPolicy[];
  knowledgeDocs: KnowledgeDoc[];
  tickets: Ticket[];
  recommendations: AgentRecommendation[];
  actionDrafts: ActionDraft[];
}

export interface AiQualityMetric {
  totalDiagnosedTickets: number;
  averageConfidence: number;
  lowConfidenceCount: number;
  humanAdoptionRate: number;
  riskInterceptionCount: number;
  averageSavedMinutes: number;
  warrantyReviewCount: number;
  confidenceDistribution: Array<{
    label: string;
    value: number;
    range: [number, number];
  }>;
  actionTypeDistribution: Array<{
    action: string;
    value: number;
  }>;
  riskFlagDistribution: Array<{
    flag: string;
    count: number;
  }>;
}

/** POST /api/tickets/:id/diagnose 的返回结构 */
export interface DiagnoseResponse {
  recommendation: AgentRecommendation;
  /** AI 提供商标识 */
  provider: "mock" | "deepseek" | "openai";
  /** 是否因异常而使用了 mock fallback */
  fallbackUsed: boolean;
  /** 结构化校验告警 */
  validationWarnings: ValidationWarning[];
  /** 知识库检索追踪 */
  retrievalTrace: RetrievalTrace;
  /** 模型实际返回的原始 content（仅非 mock 时有值） */
  rawContent?: string;
}
