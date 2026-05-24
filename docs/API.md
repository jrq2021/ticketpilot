# TicketPilot API 文档

> 所有 API 均为 Nitro 文件路由（`server/api/` 下文件结构即 URL 路径）。
> 默认以 JSON 格式请求和响应。

---

## GET /api/tickets

### 用途

获取工单列表，包含关联的客户、产品、AI 推荐和回复草稿。

### 请求参数

无（当前不支持分页/筛选，前端本地过滤）。

### 返回结构

```typescript
// Response: TicketWithRelations[]
[
  {
    // ...Ticket 所有字段,
    customer: Customer,
    product: Product,
    recommendation?: AgentRecommendation,
    actionDraft?: ActionDraft
  }
]
```

### 关键业务规则

- 工单列表通过 `createRepository()` 获取，Memory 模式从 seed 数据读取，Supabase 模式从 Postgres 读取
- 关联数据通过 ID 匹配完成（`customerId`、`productId`、`ticketId`）

---

## GET /api/metrics/roi

### 用途

获取 ROI（投资回报率）指标，用于管理层看板。

### 请求参数

无。

### 返回结构

```typescript
// Response: RoiMetric
{
  totalTickets: number,           // 总工单数
  diagnosedTickets: number,       // 已完成 AI 初诊的工单数
  automationRate: number,         // AI 分流率 (0-1)
  humanConfirmationRate: number,  // 人工确认率 (0-1)
  firstContactResolutionRate: number, // 首次解决率
  riskTicketCount: number,        // 风险工单数
  savedMinutes: number,           // 节省总分钟数
  savedHours: number,             // 节省总小时数
  estimatedSavingCny: number,     // 预计节省成本（元）
  avgHandleTimeBefore: number,    // 人工平均处理时长（分钟）
  avgHandleTimeAfter: number,     // AI 辅助后平均处理时长（分钟）
  trend: Array<{                  // 日趋势
    day: string,
    manualMinutes: number,
    aiMinutes: number,
    savedMinutes: number
  }>,
  priorityMix: Array<{            // 优先级分布
    name: string,                 // P0/P1 / 高优先级 / 普通 / 低优先级
    value: number                 // 数量
  }>
}
```

### 关键业务规则

- `savedMinutes = 人工预估总分钟 - AI 辅助总分钟`（不为负）
- `estimatedSavingCny = savedMinutes × 4.8`（坐席分钟成本 ¥4.8）
- 风险工单统计：所有含有 riskFlags 的推荐对应的工单 + 状态为 escalated 的工单 + 优先级为 urgent 的工单

---

## GET /api/metrics/ai-quality

### 用途

获取 AI 模型质量指标，用于 AI 评测看板。

### 请求参数

无。

### 返回结构

```typescript
// Response: AiQualityMetric
{
  totalDiagnosedTickets: number,  // 已 AI 初诊工单数
  averageConfidence: number,      // 平均置信度 (0-1)
  lowConfidenceCount: number,     // 低置信度工单数 (< 0.72)
  humanAdoptionRate: number,      // 人工采纳率 (已确认数/已初诊数)
  riskInterceptionCount: number,  // 风险拦截数（含 riskFlags 的推荐数）
  averageSavedMinutes: number,    // 平均节省时长（分钟）
  warrantyReviewCount: number,    // 需要质保复核的工单数
  confidenceDistribution: Array<{ // 置信度分布
    label: string,                // ≥90% / 80-89% / 70-79% / <70%
    value: number,
    range: [number, number]
  }>,
  actionTypeDistribution: Array<{ // 建议动作分布
    action: string,               // 派工 / 换新 / 退款复核 / 升级主管 / 关闭
    value: number
  }>,
  riskFlagDistribution: Array<{   // 风险标记分布（按频次降序）
    flag: string,
    count: number
  }>
}
```

### 关键业务规则

- 低置信度阈值：0.72（低于此值建议人工复核）
- `humanAdoptionRate` 只统计已执行 confirm-action 的工单
- 如果无已初诊工单，所有数值字段返回 0，分布数组返回 `[]`

---

## POST /api/tickets/:id/diagnose

### 用途

对指定工单执行 AI 初诊。

### 请求参数

| 参数 | 位置 | 类型   | 必填 | 说明    |
| ---- | ---- | ------ | ---- | ------- |
| `id` | URL  | string | 是   | 工单 ID |

无请求体（AI 从工单数据中自动提取信息）。

### 返回结构

```typescript
// Response: DiagnoseResponse
{
  recommendation: AgentRecommendation,  // AI 诊断建议
  provider: "mock" | "deepseek" | "openai",
  fallbackUsed: boolean,                // 是否因异常而降级为 Mock
  validationWarnings: Array<{           // 结构化校验告警
    field: string,
    issue: string,
    severity: "error" | "warning"
  }>,
  retrievalTrace: {                     // 知识库检索追踪
    documents: Evidence[],
    durationMs: number,
    method: "keyword" | "vector" | "hybrid"
  },
  rawContent?: string                   // 模型原始返回（仅非 Mock 时有值）
}
```

### AgentRecommendation 字段

```typescript
{
  id: string,
  ticketId: string,
  conclusion: string,                   // 诊断结论
  confidence: number,                   // 置信度 (0-1)
  warrantyStatus: "valid" | "expired" | "void_risk" | "manual_review",
  evidence: Array<{
    docId: string,
    title: string,
    quote: string,
    matchedTerms: string[],             // 匹配到的关键词
    score: number,                      // 检索得分
    category: string,
    updatedAt: string
  }>,
  suggestedActions: string[],           // 建议动作列表
  riskFlags: string[],                  // 风险标记
  nextBestAction: "dispatch" | "replacement" | "refund_review" | "escalate" | "close",
  humanConfirmationRequired: boolean,   // 是否必须人工确认
  trace: Array<{                        // Agent 执行步骤
    step: string,
    detail: string,
    durationMs: number
  }>,
  createdAt: string
}
```

### 关键业务规则

1. 从工单和产品中提取关键词，在知识库中做评分检索（Top 3）
2. 拼装 Prompt：System Prompt（JSON Schema 约束）+ User Prompt（工单/产品/政策/证据）
3. 调用 AI Provider：Mock 用规则引擎，DeepSeek/OpenAI 调用 API（30s 超时）
4. 模型返回 JSON 后经 `normalizeAgentRecommendation()` 校验：置信度钳制、字段补齐、高风险动作强制确认
5. 异常时降级为 Mock，`fallbackUsed = true`
6. 诊断结果持久化到 Repository（Memory 存内存，Supabase 存 Postgres）
7. 工单状态从 `new` 更新为 `diagnosed`（置信度 ≥ 0.72）或 `pending_confirmation`（< 0.72）

---

## POST /api/tickets/:id/draft-reply

### 用途

基于 AI 诊断结论生成面向客户的回复草稿。

### 请求参数

| 参数 | 位置 | 类型   | 必填 | 说明    |
| ---- | ---- | ------ | ---- | ------- |
| `id` | URL  | string | 是   | 工单 ID |

无请求体。

### 返回结构

```typescript
// Response: ActionDraft
{
  id: string,
  ticketId: string,
  reply: string,                        // 客户回复草稿
  actionType: "dispatch" | "replacement" | "refund_review" | "escalate" | "close",
  requiredHumanConfirmation: boolean,   // 始终为 true
  checklist: string[],                  // 坐席发送前核对清单
  createdAt: string
}
```

### 关键业务规则

- 必须先执行 AI 初诊（diagnose），否则返回 409
- 草稿基于 Mock 规则引擎生成（不调用外部 AI）
- 工单状态更新为 `pending_confirmation`
- 草稿持久化到 Repository

---

## POST /api/tickets/:id/confirm-action

### 用途

人工确认执行动作（派工/换新/退款/升级/关闭）。

### 请求参数

| 参数 | 位置 | 类型   | 必填 | 说明    |
| ---- | ---- | ------ | ---- | ------- |
| `id` | URL  | string | 是   | 工单 ID |

### 请求体

```typescript
{
  actionType?: "dispatch" | "replacement" | "refund_review" | "escalate" | "close",
  note?: string  // 确认备注
}
```

### 返回结构

```typescript
// Response: Ticket（更新后的工单）
```

### 关键业务规则

- `actionType` 必须为有效值，否则默认 `escalate`
- 根据 `actionType` 更新工单状态：
  - `dispatch` → `dispatching`
  - `replacement` → `replacement_review`
  - `refund_review` → `refund_review`
  - `escalate` → `escalated`
  - `close` → `closed`
- 工单 `confirmedAction` 字段记录确认信息
- 时间线自动追加一条 `agent` 类型事件
- 更新持久化到 Repository

---

## 通用说明

### 数据源

所有 API 通过 `createRepository()` 获取数据源，根据 `DATA_PROVIDER` 环境变量自动切换 Memory/Supabase。

### 错误处理

- 404：工单或关联数据不存在
- 409：业务前置条件未满足（如未执行初诊就请求草稿）
- 500：服务端异常（AI 调用异常会降级 Mock，不会抛出 500）

### 前端集成

前端通过 Nuxt 3 的 `useFetch` / `$fetch` 调用 API，数据自动响应式绑定。
