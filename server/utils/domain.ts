import type {
  ActionDraft,
  AgentRecommendation,
  ConfirmedActionType,
  Evidence,
  KnowledgeDoc,
  Product,
  RoiMetric,
  ServiceOpsStore,
  Ticket,
  TicketPriority,
  TraceStep,
  WarrantyPolicy,
  WarrantyStatus
} from '../../types/serviceops.ts'

export const COST_PER_AGENT_MINUTE = 4.8
export const NOW = new Date('2026-05-23T09:00:00.000Z')

export function addMonths(date: Date, months: number) {
  const copy = new Date(date.getTime())
  copy.setMonth(copy.getMonth() + months)
  return copy
}

export function evaluateWarranty(
  ticket: Ticket,
  product: Product,
  policy: WarrantyPolicy,
  now = NOW
): {
  status: WarrantyStatus
  expiresAt: string
  reason: string
} {
  const purchasedAt = new Date(ticket.purchasedAt)
  const expiresAt = addMonths(purchasedAt, policy.coverageMonths || product.warrantyMonths)
  const issueText = `${ticket.issue} ${ticket.tags.join(' ')}`.toLowerCase()
  const hasVoidRisk = ['水', '漏液', '撬锁', '拆机', '人为', '进水'].some((term) => issueText.includes(term.toLowerCase()))

  if (hasVoidRisk) {
    return {
      status: 'void_risk',
      expiresAt: expiresAt.toISOString(),
      reason: '描述中存在可能影响质保的风险词，需要人工复核证据。'
    }
  }

  if (expiresAt < now) {
    return {
      status: 'expired',
      expiresAt: expiresAt.toISOString(),
      reason: '购买时间已超过当前质保期限。'
    }
  }

  if (ticket.priority === 'urgent') {
    return {
      status: 'manual_review',
      expiresAt: expiresAt.toISOString(),
      reason: '安全或通行风险工单需要人工确认后执行。'
    }
  }

  return {
    status: 'valid',
    expiresAt: expiresAt.toISOString(),
    reason: '仍在产品质保覆盖期内。'
  }
}

export function getSlaState(ticket: Ticket, now = NOW) {
  const due = new Date(ticket.slaDueAt)
  const diffMinutes = Math.round((due.getTime() - now.getTime()) / 60000)

  if (ticket.status === 'confirmed') {
    return { label: '已处理', tone: 'green', diffMinutes }
  }

  if (diffMinutes < 0) {
    return { label: '已超时', tone: 'red', diffMinutes }
  }

  if (diffMinutes <= 120) {
    return { label: '临近 SLA', tone: 'amber', diffMinutes }
  }

  return { label: '进行中', tone: 'blue', diffMinutes }
}

export function findPolicyForProduct(product: Product, policies: WarrantyPolicy[]) {
  const policy = policies.find((item) => item.productLine === product.line)

  if (!policy) {
    throw new Error(`Missing warranty policy for product line: ${product.line}`)
  }

  return policy
}

export function searchKnowledge(ticket: Ticket, product: Product, docs: KnowledgeDoc[]): Evidence[] {
  const issue = ticket.issue.toLowerCase()
  const candidates = docs
    .filter((doc) => doc.productLine === product.line || doc.productLine === 'all')
    .map((doc) => {
      const content = doc.content.toLowerCase()
      const title = doc.title.toLowerCase()
      const score = [
        product.line,
        ticket.category,
        ...ticket.tags,
        ...issue.split(/[，。,.、\s]+/).filter(Boolean)
      ].reduce((total, term) => {
        const normalized = String(term).toLowerCase()
        if (!normalized || normalized.length < 2) return total
        return total + (content.includes(normalized) || title.includes(normalized) ? 1 : 0)
      }, 0)

      return { doc, score }
    })
    .sort((a, b) => b.score - a.score)

  return candidates.slice(0, 3).map(({ doc }) => ({
    docId: doc.id,
    title: doc.title,
    quote: doc.content.length > 92 ? `${doc.content.slice(0, 92)}...` : doc.content
  }))
}

export function chooseNextAction(
  ticket: Ticket,
  warrantyStatus: WarrantyStatus,
  confidence: number
): ConfirmedActionType {
  if (ticket.priority === 'urgent') return 'dispatch'
  if (warrantyStatus === 'void_risk') return 'escalate'
  if (confidence < 0.72) return 'escalate'
  if (ticket.issue.includes('退款')) return 'refund_review'
  if (ticket.issue.includes('换新') && warrantyStatus === 'valid') return 'replacement'
  if (warrantyStatus === 'expired') return 'escalate'
  return 'dispatch'
}

export function buildRiskFlags(ticket: Ticket, warrantyStatus: WarrantyStatus, confidence: number) {
  const flags: string[] = []

  if (ticket.priority === 'urgent') {
    flags.push('P0/P1 工单必须在 2 小时内由人工确认')
  }

  if (warrantyStatus === 'void_risk') {
    flags.push('存在人为损坏或免责争议，需要上传检测照片与主管复核')
  }

  if (ticket.issue.includes('退款') || ticket.issue.includes('换新')) {
    flags.push('涉及资金、库存或补偿动作，AI 仅可预填建议')
  }

  if (confidence < 0.72) {
    flags.push('置信度低于自动分流阈值，建议人工确认')
  }

  return flags
}

export function buildTrace(ticket: Ticket, evidence: Evidence[], warrantyStatus: WarrantyStatus): TraceStep[] {
  return [
    {
      step: '读取订单与设备',
      detail: `订单 ${ticket.orderNo}，序列号 ${ticket.serialNumber}，购买时间 ${ticket.purchasedAt.slice(0, 10)}。`,
      durationMs: 72
    },
    {
      step: '匹配质保政策',
      detail: `质保判断为 ${warrantyStatus}，风险动作进入人工确认。`,
      durationMs: 96
    },
    {
      step: '检索知识库',
      detail: `命中 ${evidence.length} 条售后政策、故障手册或 SLA 文档。`,
      durationMs: 144
    },
    {
      step: '生成坐席建议',
      detail: '输出处理结论、引用证据、风险点和下一步动作草稿。',
      durationMs: 318
    }
  ]
}

export function buildMockRecommendation(
  ticket: Ticket,
  product: Product,
  policy: WarrantyPolicy,
  evidence: Evidence[],
  now = NOW
): AgentRecommendation {
  const warranty = evaluateWarranty(ticket, product, policy, now)
  const confidenceMap: Record<WarrantyStatus, number> = {
    valid: 0.86,
    expired: 0.78,
    void_risk: 0.64,
    manual_review: 0.7
  }
  const confidence = confidenceMap[warranty.status]
  const nextBestAction = chooseNextAction(ticket, warranty.status, confidence)
  const riskFlags = buildRiskFlags(ticket, warranty.status, confidence)
  const conclusion = buildConclusion(ticket, product, warranty.status, nextBestAction)

  return {
    id: `rec-${ticket.id}`,
    ticketId: ticket.id,
    conclusion,
    confidence,
    warrantyStatus: warranty.status,
    evidence,
    suggestedActions: buildSuggestedActions(ticket, warranty.status, nextBestAction),
    riskFlags,
    nextBestAction,
    trace: buildTrace(ticket, evidence, warranty.status),
    createdAt: now.toISOString()
  }
}

export function buildConclusion(
  ticket: Ticket,
  product: Product,
  warrantyStatus: WarrantyStatus,
  nextAction: ConfirmedActionType
) {
  const actionText: Record<ConfirmedActionType, string> = {
    dispatch: '建议预约工程师上门检测',
    replacement: '建议预填换新审批',
    refund_review: '建议进入退款复核',
    escalate: '建议升级主管人工复核',
    close: '建议关闭工单'
  }

  if (warrantyStatus === 'valid') {
    return `${product.name} 仍在质保期内，${actionText[nextAction]}，并保留故障复现证据。`
  }

  if (warrantyStatus === 'expired') {
    return `${product.name} 已超过质保期，建议先给出远程排查方案，再按付费检修流程处理。`
  }

  if (warrantyStatus === 'void_risk') {
    return `${product.name} 存在免责风险，AI 不建议直接承诺免费维修，应先收集检测照片并升级复核。`
  }

  return `${product.name} 涉及安全或履约风险，建议人工确认后执行 ${actionText[nextAction]}。`
}

export function buildSuggestedActions(
  ticket: Ticket,
  warrantyStatus: WarrantyStatus,
  nextAction: ConfirmedActionType
) {
  const actions = ['同步故障排查结论与引用依据', '预填客服回复并要求坐席确认']

  if (warrantyStatus === 'valid') {
    actions.push('创建免费检修或换新审批草稿')
  }

  if (warrantyStatus === 'expired') {
    actions.push('发送付费维修报价和远程排查步骤')
  }

  if (warrantyStatus === 'void_risk') {
    actions.push('要求上传检测照片、门店记录和客户确认信息')
  }

  if (ticket.priority === 'urgent' || nextAction === 'dispatch') {
    actions.push('预约最近可用工程师并推送 SLA 提醒')
  }

  return actions
}

export function buildActionDraft(
  ticket: Ticket,
  recommendation: AgentRecommendation,
  now = NOW
): ActionDraft {
  const replyIntro = ticket.priority === 'urgent'
    ? '我们已将该问题标记为高优先级售后工单。'
    : '我们已完成初步故障与质保核验。'

  return {
    id: `draft-${ticket.id}`,
    ticketId: ticket.id,
    reply: `${replyIntro}${recommendation.conclusion}后续动作将由坐席确认后执行，涉及换新、退款或上门服务不会自动触发。`,
    actionType: recommendation.nextBestAction,
    requiredHumanConfirmation: true,
    checklist: [
      '核对订单号、序列号和购买日期',
      '确认客户诉求与历史沟通记录',
      '检查 AI 引用依据是否匹配当前产品型号',
      '确认高风险动作已由人工审批'
    ],
    createdAt: now.toISOString()
  }
}

export function upsertRecommendation(store: ServiceOpsStore, recommendation: AgentRecommendation) {
  const index = store.recommendations.findIndex((item) => item.ticketId === recommendation.ticketId)

  if (index >= 0) {
    store.recommendations[index] = recommendation
  } else {
    store.recommendations.push(recommendation)
  }

  const ticket = store.tickets.find((item) => item.id === recommendation.ticketId)
  if (ticket && ticket.status === 'new') {
    ticket.status = recommendation.confidence < 0.72 ? 'pending_confirmation' : 'diagnosed'
  }
}

export function upsertActionDraft(store: ServiceOpsStore, draft: ActionDraft) {
  const index = store.actionDrafts.findIndex((item) => item.ticketId === draft.ticketId)

  if (index >= 0) {
    store.actionDrafts[index] = draft
  } else {
    store.actionDrafts.push(draft)
  }

  const ticket = store.tickets.find((item) => item.id === draft.ticketId)
  if (ticket && ticket.status !== 'confirmed') {
    ticket.status = 'pending_confirmation'
  }
}

export function calculateRoiMetrics(store: ServiceOpsStore): RoiMetric {
  const totalTickets = store.tickets.length
  const diagnosedTickets = store.tickets.filter((ticket) =>
    ['diagnosed', 'pending_confirmation', 'confirmed', 'escalated'].includes(ticket.status)
  ).length
  const manualMinutes = store.tickets.reduce((total, ticket) => total + ticket.estimatedManualMinutes, 0)
  const aiMinutes = store.tickets.reduce((total, ticket) => total + ticket.aiAssistedMinutes, 0)
  const savedMinutes = Math.max(0, manualMinutes - aiMinutes)
  const riskyIds = new Set(store.recommendations.flatMap((item) => item.riskFlags.length ? [item.ticketId] : []))

  for (const ticket of store.tickets) {
    if (ticket.priority === 'urgent' || ticket.status === 'escalated') {
      riskyIds.add(ticket.id)
    }
  }

  return {
    totalTickets,
    diagnosedTickets,
    automationRate: roundRatio(diagnosedTickets, totalTickets),
    humanConfirmationRate: roundRatio(store.tickets.filter((ticket) =>
      ['pending_confirmation', 'confirmed', 'escalated'].includes(ticket.status)
    ).length, totalTickets),
    firstContactResolutionRate: 0.68,
    riskTicketCount: riskyIds.size,
    savedMinutes,
    savedHours: Number((savedMinutes / 60).toFixed(1)),
    estimatedSavingCny: Math.round(savedMinutes * COST_PER_AGENT_MINUTE),
    avgHandleTimeBefore: Number((manualMinutes / totalTickets).toFixed(1)),
    avgHandleTimeAfter: Number((aiMinutes / totalTickets).toFixed(1)),
    trend: buildTrend(store.tickets),
    priorityMix: buildPriorityMix(store.tickets)
  }
}

function roundRatio(value: number, total: number) {
  if (!total) return 0
  return Number((value / total).toFixed(2))
}

function buildTrend(tickets: Ticket[]) {
  const days = ['05-18', '05-19', '05-20', '05-21', '05-22']

  return days.map((day, index) => {
    const dayTickets = tickets.filter((ticket) => ticket.createdAt.slice(5, 10) <= day)
    const base = dayTickets.length ? dayTickets : tickets.slice(0, Math.min(index + 1, tickets.length))
    const manualMinutes = base.reduce((total, ticket) => total + ticket.estimatedManualMinutes, 0)
    const aiMinutes = base.reduce((total, ticket) => total + ticket.aiAssistedMinutes, 0)

    return {
      day,
      manualMinutes,
      aiMinutes,
      savedMinutes: Math.max(0, manualMinutes - aiMinutes)
    }
  })
}

function buildPriorityMix(tickets: Ticket[]) {
  const labelMap: Record<TicketPriority, string> = {
    urgent: 'P0/P1',
    high: '高优先级',
    medium: '普通',
    low: '低优先级'
  }

  return (['urgent', 'high', 'medium', 'low'] as TicketPriority[])
    .map((priority) => ({
      name: labelMap[priority],
      value: tickets.filter((ticket) => ticket.priority === priority).length
    }))
    .filter((item) => item.value > 0)
}
