# ServiceOps AI

售后质保工单降本平台，面向智能硬件/家电售后团队。项目展示一个企业内部 AI 应用如何把工单初诊、质保判断、知识库引用、风险控制和 ROI 看板串成完整业务闭环。

## Tech Stack

- Nuxt 3 + Vue 3 + TypeScript
- Element Plus + ECharts + lucide-vue-next
- Nitro API routes
- Mock AI Provider + OpenAI-compatible Provider
- Simulated enterprise data, no real customer data

## Core Flows

- ROI 看板：节省工时、预计节省成本、AI 分流率、人工确认率、风险工单数。
- 坐席工作台：工单队列、工单详情、AI 初诊、回复草稿、人工确认。
- Agent 追踪：订单读取、质保匹配、知识库检索、建议生成、证据引用与风控提示。
- 风控边界：AI 不自动执行退款、换新、派工或投诉升级，只生成建议和草稿。

## API

- `GET /api/metrics/roi`
- `GET /api/tickets`
- `POST /api/tickets/:id/diagnose`
- `POST /api/tickets/:id/draft-reply`
- `POST /api/tickets/:id/confirm-action`

## AI Provider

Default mode uses deterministic mock output:

```bash
NUXT_PUBLIC_AI_PROVIDER=mock
```

To use an OpenAI-compatible endpoint:

```bash
NUXT_PUBLIC_AI_PROVIDER=openai
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

The provider falls back to mock output when no API key is configured.

## Run

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Test

```bash
npm test
```

The domain tests cover warranty decisions, AI recommendation structure, human-confirmation boundaries, and ROI metrics.

## Resume Bullets

- Built a Nuxt 3 AI service operations platform for smart-hardware after-sales teams, covering ROI dashboard, ticket triage, warranty diagnosis, knowledge citation, and human approval workflow.
- Designed a mock/OpenAI-compatible provider layer so AI diagnosis can run with deterministic demo data or real model calls.
- Implemented audit-safe agent output with confidence, evidence, risk flags, and action drafts, keeping high-risk business actions under human confirmation.
