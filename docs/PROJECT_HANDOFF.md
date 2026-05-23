# ServiceOps AI 项目交接文档

## 1. 项目定位

`ServiceOps AI` 是一个面向智能硬件/家电售后团队的 AI 工单运营平台。它不是普通聊天机器人，而是用于展示企业如何通过 AI 降本增效：

- 管理层看 ROI：节省工时、节省成本、AI 分流率、人工确认率、风险工单数。
- 坐席处理工单：查看客户、订单、设备、故障、SLA、历史对话。
- AI 辅助判断：根据质保政策、故障手册、售后规则生成初诊结论。
- 人工确认边界：退款、换新、派工、投诉升级等动作必须由人工确认。
- 面试价值：适合包装成 `前端 + AI 应用开发` 项目，能讲业务闭环、AI 工程落地、前端复杂交互和风控意识。

## 2. 技术栈

- 框架：`Nuxt 3`
- 前端：`Vue 3`、`TypeScript`
- UI：`Element Plus`
- 图表：`ECharts`
- 图标：`lucide-vue-next`
- 后端：`Nuxt/Nitro API routes`
- AI 层：`Mock Provider` + `OpenAI-compatible Provider`
- 数据：当前使用模拟数据，后续可替换成 `Supabase/Postgres`
- 测试：Node 内置 `node:test`

## 3. 当前项目结构

```text
.
├─ assets/css/main.css              # 全局样式
├─ components/
│  ├─ RoiDashboard.vue              # ROI 看板
│  ├─ RoiTrendChart.vue             # 处理时长趋势图
│  ├─ PriorityPieChart.vue          # 工单优先级图
│  ├─ TicketQueue.vue               # 工单队列
│  ├─ TicketDetail.vue              # 工单详情与操作
│  └─ AgentTrace.vue                # Agent 检索/判断/生成过程
├─ docs/PROJECT_HANDOFF.md          # 当前交接文档
├─ pages/index.vue                  # 单页应用入口
├─ plugins/element-plus.ts          # Element Plus 注册
├─ server/
│  ├─ api/
│  │  ├─ metrics/roi.get.ts         # ROI 指标 API
│  │  └─ tickets/
│  │     ├─ index.get.ts            # 工单列表 API
│  │     └─ [id]/
│  │        ├─ diagnose.post.ts     # AI 初诊 API
│  │        ├─ draft-reply.post.ts  # 回复草稿 API
│  │        └─ confirm-action.post.ts # 人工确认 API
│  ├─ data/seed.ts                  # 模拟客户、产品、政策、知识库、工单
│  └─ utils/
│     ├─ ai.ts                      # AI provider 抽象
│     └─ domain.ts                  # 质保判断、ROI、风控、草稿生成
├─ tests/domain.test.ts             # 领域逻辑测试
├─ types/serviceops.ts              # 核心类型定义
├─ nuxt.config.ts
├─ package.json
└─ README.md
```

## 4. 已完成基础能力

- 已搭建 Nuxt 3 项目，首页默认进入 ROI 看板。
- 已实现模拟业务数据：客户、产品、保修政策、知识库、历史对话、售后工单。
- 已实现工单队列、工单详情、AI 初诊、回复草稿、人工确认流程。
- 已实现 AI provider 边界：默认 mock，可切换 OpenAI-compatible 接口。
- 已实现 Agent 输出结构：结论、置信度、证据引用、建议动作、风险提示、过程追踪。
- 已实现基础测试：质保判断、风险判断、AI 输出结构、人机确认边界、ROI 计算。
- 已通过生产构建验证，当前可本地运行。

## 5. 运行方式

```bash
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:3000/
```

运行测试：

```bash
npm test
```

AI 默认走 mock：

```bash
NUXT_PUBLIC_AI_PROVIDER=mock
```

如果要接 DeepSeek 或 OpenAI-compatible API，可使用：

```bash
NUXT_PUBLIC_AI_PROVIDER=openai
OPENAI_API_KEY=你的 API Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

## 6. 下一步开发优先级

### P0：让项目更像真实企业系统

- 增加登录后的角色视角：`运营主管`、`一线坐席`、`质检/售后经理`。
- 增加工单状态流转：`待初诊`、`待人工确认`、`已派工`、`已换新审批`、`已关闭`。
- 增加更多模拟数据：至少 30 条工单、10 个产品、更多售后政策和故障手册。
- 增加工单详情里的历史处理时间线，让面试官能看到业务流程。

### P1：增强 AI 含金量

- 把知识库检索从简单关键词匹配升级为向量检索或模拟 RAG 流程。
- 增加 prompt 模板管理：质保判断 prompt、回复生成 prompt、质检 prompt。
- 增加低置信度策略：低于阈值自动进入人工复核，禁止生成执行动作。
- 增加 AI 评测页：展示命中率、人工采纳率、节省时长、风险拦截率。

### P2：增强前端作品集展示

- 做一个 3 分钟演示路径：ROI 看板 -> 高风险工单 -> AI 初诊 -> 证据引用 -> 人工确认 -> 指标更新。
- 补充移动端/窄屏适配细节。
- 增加加载态、空状态、错误态和操作日志。
- 写一份面试讲解稿，强调业务价值和工程设计。

### P3：接入真实后端能力

- 用 Supabase/Postgres 替换内存模拟数据。
- 增加数据库表：tickets、customers、products、warranty_policies、knowledge_docs、recommendations、action_drafts。
- 增加登录鉴权和角色权限。
- 增加线上部署：Vercel + Supabase 免费额度。

## 7. DeepSeek 续写提示词

可以把下面这段复制给 DeepSeek，让它按当前项目继续开发：

```text
你是资深 Nuxt 3 + Vue 3 + TypeScript 工程师。请基于当前 ServiceOps AI 项目继续开发。

项目定位：
这是一个智能硬件/家电售后质保工单降本平台，目标是展示企业用 AI 降低售后处理成本。AI 只能生成建议、证据引用、回复草稿和动作草稿，退款、换新、派工、投诉升级必须由人工确认。

当前技术栈：
Nuxt 3、Vue 3、TypeScript、Element Plus、ECharts、lucide-vue-next、Nitro API routes。当前数据在 server/data/seed.ts，领域逻辑在 server/utils/domain.ts，AI provider 在 server/utils/ai.ts。

请优先做这些事：
1. 增加更完整的工单状态流转，包括已派工、已换新审批、已关闭。
2. 增加 30 条以上模拟工单，覆盖保内、过保、进水、人为损坏、退款、换新、P0 安全风险等场景。
3. 增加工单时间线组件，展示客户提交、AI 初诊、坐席确认、派工/审批、关闭等节点。
4. 增加 AI 评测/运营页，展示人工采纳率、风险拦截率、平均节省时长、低置信度工单数量。
5. 保持现有 UI 风格，不要做营销页，不要把页面做成纯聊天机器人。

开发要求：
- 保持 TypeScript 类型清晰。
- 高风险动作必须保留人工确认。
- 新增逻辑要补充 tests/domain.test.ts。
- 不要删除已有 API 和组件，除非有明确替代。
```

## 8. 面试讲解重点

- 业务价值：把客服售后从被动处理变成可量化运营，核心指标是节省工时、一次解决率、风险拦截率。
- AI 工程：不是简单聊天 UI，而是 RAG/规则/置信度/人工确认结合的业务 Agent。
- 前端能力：复杂仪表盘、工单队列、状态流转、图表、响应式布局、交互反馈。
- 风控意识：AI 不自动执行高风险动作，所有关键动作都有证据引用和人工确认。
- 可扩展性：mock 数据可迁移到 Supabase/Postgres，mock provider 可切换到 DeepSeek/OpenAI-compatible provider。
