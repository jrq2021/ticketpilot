# 🎫 TicketPilot — AI 售后工单运营平台

> **不是聊天机器人。** 面向智能硬件/家电售后团队的企业级 AI 辅助运营系统。展示 AI 如何嵌入业务流程：工单初诊 → 知识库检索 → 回复草稿 → 人工确认 → ROI 衡量。

[![Nuxt 3](https://img.shields.io/badge/Nuxt-3-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vue.js)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TS-5.7-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![DeepSeek](https://img.shields.io/badge/AI-DeepSeek-536DFE)](https://deepseek.com)

## 🎯 项目定位

TicketPilot 展示一个完整的 **AI + 企业售后** 业务闭环：

- **管理层**：ROI 看板（节省工时 / 成本 / 分流率 / 风险工单数）
- **坐席**：工单处理工作台（AI 初诊 → 证据引用 → 回复草稿 → 人工确认）
- **AI 工程师**：可审计链路（检索了哪些知识、匹配了什么关键词、Prompt 怎么拼、模型返回了什么、结构化校验结果）
- **风控合规**：AI **绝不**自动执行退款、换新、派工、投诉升级，只能生成建议 + 草稿，必须人工确认

## 🧩 核心功能

| 模块              | 功能                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------- |
| **ROI 看板**      | 节省工时、节省成本、AI 分流率、人工确认率、风险工单数、处理时长趋势、优先级饼图          |
| **坐席工作台**    | 30 条模拟工单队列、筛选/搜索、工单详情、AI 初诊、回复草稿、人工确认动作                  |
| **AI 评测**       | 平均置信度、低置信度占比、人工采纳率、风险拦截数、置信度分布图、动作分布图、风险标记排行 |
| **Agent 追踪**    | 订单读取 → 质保匹配 → 知识库检索（含匹配关键词+得分）→ 建议生成 → 风控约束               |
| **工单时间线**    | 从客户提交 → 系统建单 → AI 初诊 → 坐席确认 → 派工/换新/关闭 的完整节点追溯               |
| **DeepSeek 接入** | OpenAI-compatible Provider，支持 DeepSeek/OpenAI，30s 超时，异常自动 fallback Mock       |
| **Prompt 模板**   | 工单初诊 / 回复草稿 / 风险复核 三套 Prompt，要求 JSON 输出 + 结构化校验                  |

## 🏗 技术栈

```
Nuxt 3 · Vue 3 · TypeScript · Element Plus · ECharts · lucide-vue-next
Nitro API routes · OpenAI-compatible Provider · Prompt Engineering
```

## 🤖 AI 架构

```
用户点击"AI 初诊"
  → searchKnowledge()   关键词评分检索（返回 matchedTerms + score）
  → Prompt 模板拼装      System Prompt + 工单/产品/政策/证据 JSON
  → DeepSeek API         30s 超时，response_format: json_object
  → normalizeAgentRec()  置信度钳制 · 字段校验 · 高风险强制人工确认
  → 异常? → fallback Mock（页面不崩）
  → DiagnoseResponse     { recommendation, provider, fallbackUsed, validationWarnings, retrievalTrace }
```

## 🚀 本地运行

```bash
git clone https://github.com/jrq2021/ticketpilot.git
cd ticketpilot
npm install
npm run dev
```

打开 `http://localhost:3000`，默认使用 Mock AI（无需 API Key）。

## 🔑 DeepSeek 配置

复制 `.env.example` → `.env`，填入你的 DeepSeek API Key：

```bash
NUXT_PUBLIC_AI_PROVIDER=openai
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=deepseek-chat
```

重启 `npm run dev`，AI 初诊将调用真实 DeepSeek 模型。

也支持 OpenAI：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## 🗄 数据持久化（Supabase）

默认使用内存数据（`server/data/seed.ts`），无需数据库。可选切换至 Supabase/Postgres：

```bash
# .env
DATA_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

建表 SQL 和导入指南见 [`docs/SUPABASE_SCHEMA.md`](./docs/SUPABASE_SCHEMA.md)。缺少配置时自动降级为 memory 模式。

## 🚢 Vercel 部署

| 模式                  | 需配置的环境变量                                                               |
| --------------------- | ------------------------------------------------------------------------------ |
| **Memory**（零配置）  | 无需任何变量，直接部署                                                         |
| **Memory + DeepSeek** | `NUXT_PUBLIC_AI_PROVIDER`, `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL` |
| **Supabase**          | 上述 + `DATA_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`            |

> ⚠️ 绝不将 `OPENAI_API_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 提交到 Git。在 Vercel Dashboard → Settings → Environment Variables 中配置。

## 🧪 测试

```bash
npm test
# 18 个测试：质保判断、AI 输出结构、人工确认边界、ROI 计算、
# 时间线排序、状态映射、置信度钳制、检索审计、高风险强制确认
```

## 🎬 3 分钟演示路径

1. **首屏 ROI 看板** → 展示 30 条工单的降本数据（节省 ¥2,918，AI 分流率 83%）
2. **点击标 ⭐ 的"推荐演示"工单**（智能门锁 P0 安全风险 / 退款争议）
3. **点击「AI 初诊」** → 如果配了 DeepSeek，会显示"DeepSeek 生成"徽章
4. **查看 Agent 追踪** → 展示检索了哪些知识库文档、匹配了什么关键词、得了多少分
5. **生成回复草稿** → AI 预填客户回复，坐席核对后发送
6. **人工确认动作** → 派工/换新/退款等高风险动作必须人工点击确认
7. **回到 AI 评测页** → 看指标变化（置信度分布、风险拦截数更新）

## 💡 面试讲解亮点

| 亮点             | 可讲内容                                                           |
| ---------------- | ------------------------------------------------------------------ |
| **非 Demo 项目** | 30 条模拟工单、10 种售后场景、完整的 seed 数据体系                 |
| **AI 工程落地**  | Prompt 模板管理、JSON Schema 约束、输出结构化校验、异常降级        |
| **可审计 AI**    | 检索命中关键词 + 得分、模型 provider 标识、fallback 提示、校验告警 |
| **风控意识**     | AI 绝不自动执行高风险动作，humanConfirmationRequired 强制校验      |
| **前端复杂性**   | Nuxt 3 全栈、ECharts 图表、Element Plus 组件、时间线、多面板布局   |
| **类型安全**     | 全链路 TypeScript，22 个单元测试覆盖核心领域逻辑                   |

## 📂 项目结构

```
├── components/           # Vue 组件（6 个）
│   ├── RoiDashboard.vue       ROI 看板
│   ├── TicketQueue.vue        工单队列
│   ├── TicketDetail.vue       工单详情 + AI 操作
│   ├── TicketTimeline.vue     工单处理时间线
│   ├── AgentTrace.vue         Agent 审计追踪
│   ├── AiQualityDashboard.vue AI 质量评测
│   ├── RoiTrendChart.vue      处理时长趋势图
│   └── PriorityPieChart.vue   优先级饼图
├── pages/index.vue        # 单页应用入口
├── server/
│   ├── api/               # Nitro API routes (5 个)
│   ├── data/seed.ts       # 15 客户 + 4 产品 + 4 政策 + 6 知识库 + 30 工单
│   ├── prompts/           # Prompt 模板 (3 个)
│   └── utils/             # AI Provider + 领域逻辑
├── types/serviceops.ts    # 核心类型定义 (20+ 接口)
├── tests/domain.test.ts  # 22 个单元测试
└── docs/                 # 6 份完整文档
```

## 🔮 后续可扩展方向

- [ ] Supabase/Postgres 替换内存数据
- [ ] 用户认证 & 多角色权限（坐席 / 主管 / 管理员）
- [ ] WebSocket 实时工单推送
- [ ] 向量数据库 RAG（替换关键词检索）
- [ ] 工单满意度回访 & NPS
- [ ] 多语言支持
- [ ] Docker 部署 & CI/CD
