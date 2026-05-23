export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'new' | 'diagnosed' | 'pending_confirmation' | 'confirmed' | 'escalated'
export type WarrantyStatus = 'valid' | 'expired' | 'void_risk' | 'manual_review'
export type ConfirmedActionType = 'dispatch' | 'replacement' | 'refund_review' | 'escalate' | 'close'

export interface Customer {
  id: string
  name: string
  tier: 'standard' | 'plus' | 'enterprise'
  city: string
  phoneMasked: string
  lifetimeValue: number
}

export interface Product {
  id: string
  name: string
  line: string
  model: string
  warrantyMonths: number
  avgRepairCost: number
  replacementCost: number
}

export interface WarrantyPolicy {
  id: string
  productLine: string
  coverageMonths: number
  exclusions: string[]
  repairRules: string[]
  replacementRules: string[]
}

export interface KnowledgeDoc {
  id: string
  title: string
  productLine: string
  category: string
  content: string
  updatedAt: string
}

export interface ConversationTurn {
  speaker: 'customer' | 'agent'
  at: string
  text: string
}

export interface Ticket {
  id: string
  orderNo: string
  title: string
  customerId: string
  productId: string
  serialNumber: string
  channel: 'app' | 'wechat' | 'phone' | 'store'
  priority: TicketPriority
  category: string
  issue: string
  purchasedAt: string
  createdAt: string
  slaDueAt: string
  status: TicketStatus
  estimatedManualMinutes: number
  aiAssistedMinutes: number
  transcript: ConversationTurn[]
  tags: string[]
  confirmedAction?: {
    type: ConfirmedActionType
    note: string
    confirmedAt: string
  }
}

export interface Evidence {
  docId: string
  title: string
  quote: string
}

export interface TraceStep {
  step: string
  detail: string
  durationMs: number
}

export interface AgentRecommendation {
  id: string
  ticketId: string
  conclusion: string
  confidence: number
  warrantyStatus: WarrantyStatus
  evidence: Evidence[]
  suggestedActions: string[]
  riskFlags: string[]
  nextBestAction: ConfirmedActionType
  trace: TraceStep[]
  createdAt: string
}

export interface ActionDraft {
  id: string
  ticketId: string
  reply: string
  actionType: ConfirmedActionType
  requiredHumanConfirmation: boolean
  checklist: string[]
  createdAt: string
}

export interface RoiMetric {
  totalTickets: number
  diagnosedTickets: number
  automationRate: number
  humanConfirmationRate: number
  firstContactResolutionRate: number
  riskTicketCount: number
  savedMinutes: number
  savedHours: number
  estimatedSavingCny: number
  avgHandleTimeBefore: number
  avgHandleTimeAfter: number
  trend: Array<{
    day: string
    manualMinutes: number
    aiMinutes: number
    savedMinutes: number
  }>
  priorityMix: Array<{
    name: string
    value: number
  }>
}

export interface TicketWithRelations extends Ticket {
  customer: Customer
  product: Product
  recommendation?: AgentRecommendation
  actionDraft?: ActionDraft
}

export interface ServiceOpsStore {
  customers: Customer[]
  products: Product[]
  policies: WarrantyPolicy[]
  knowledgeDocs: KnowledgeDoc[]
  tickets: Ticket[]
  recommendations: AgentRecommendation[]
  actionDrafts: ActionDraft[]
}
