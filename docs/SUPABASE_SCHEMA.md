# Supabase / PostgreSQL 数据库 Schema

## 概述

本文件包含 ServiceOps AI 的完整数据库建表 SQL。所有表兼容 TypeScript 类型定义 (`types/serviceops.ts`)。

JSON 字段使用 `jsonb` 类型简化存储，避免过多关联表。

## 建表 SQL

### customers

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard', 'plus', 'enterprise')),
  city TEXT NOT NULL,
  phone_masked TEXT NOT NULL,
  lifetime_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### products

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  line TEXT NOT NULL,
  model TEXT NOT NULL,
  warranty_months INTEGER NOT NULL,
  avg_repair_cost NUMERIC NOT NULL,
  replacement_cost NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### warranty_policies

```sql
CREATE TABLE warranty_policies (
  id TEXT PRIMARY KEY,
  product_line TEXT NOT NULL,
  coverage_months INTEGER NOT NULL,
  exclusions JSONB NOT NULL DEFAULT '[]',
  repair_rules JSONB NOT NULL DEFAULT '[]',
  replacement_rules JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### knowledge_docs

```sql
CREATE TABLE knowledge_docs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  product_line TEXT NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### tickets

```sql
CREATE TABLE tickets (
  id TEXT PRIMARY KEY,
  order_no TEXT NOT NULL,
  title TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  serial_number TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('app', 'wechat', 'phone', 'store')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL,
  issue TEXT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sla_due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'assigned', 'diagnosed', 'pending_confirmation',
               'dispatching', 'repairing', 'replacement_review',
               'refund_review', 'escalated', 'closed')
  ),
  estimated_manual_minutes INTEGER NOT NULL DEFAULT 0,
  ai_assisted_minutes INTEGER NOT NULL DEFAULT 0,
  transcript JSONB NOT NULL DEFAULT '[]',
  tags JSONB NOT NULL DEFAULT '[]',
  timeline JSONB NOT NULL DEFAULT '[]',
  confirmed_action JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_product ON tickets(product_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
```

### recommendations

```sql
CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  conclusion TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  warranty_status TEXT NOT NULL CHECK (warranty_status IN ('valid', 'expired', 'void_risk', 'manual_review')),
  evidence JSONB NOT NULL DEFAULT '[]',
  suggested_actions JSONB NOT NULL DEFAULT '[]',
  risk_flags JSONB NOT NULL DEFAULT '[]',
  next_best_action TEXT NOT NULL CHECK (next_best_action IN ('dispatch', 'replacement', 'refund_review', 'escalate', 'close')),
  human_confirmation_required BOOLEAN NOT NULL DEFAULT false,
  trace JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_ticket ON recommendations(ticket_id);
```

### action_drafts

```sql
CREATE TABLE action_drafts (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES tickets(id),
  reply TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('dispatch', 'replacement', 'refund_review', 'escalate', 'close')),
  required_human_confirmation BOOLEAN NOT NULL DEFAULT true,
  checklist JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_action_drafts_ticket ON action_drafts(ticket_id);
```

## JSONB 字段说明

为了简化 schema，以下字段使用 `jsonb` 存储，而非独立关联表：

| 表                | 字段                                                | 存储内容                      | 替代方案                               |
| ----------------- | --------------------------------------------------- | ----------------------------- | -------------------------------------- |
| tickets           | `transcript`                                        | `ConversationTurn[]`          | 可拆为 `transcript_turns` 表           |
| tickets           | `tags`                                              | `string[]`                    | 可拆为 `ticket_tags` 关联表            |
| tickets           | `timeline`                                          | `TicketTimelineEvent[]`       | 可拆为 `ticket_timeline_events` 表     |
| tickets           | `confirmed_action`                                  | `{ type, note, confirmedAt }` | 可拆为 `confirmed_actions` 表          |
| recommendations   | `evidence`                                          | `Evidence[]`                  | 可拆为 `recommendation_evidence` 表    |
| recommendations   | `suggested_actions`                                 | `string[]`                    | —                                      |
| recommendations   | `risk_flags`                                        | `string[]`                    | —                                      |
| recommendations   | `trace`                                             | `TraceStep[]`                 | 可拆为 `recommendation_trace_steps` 表 |
| action_drafts     | `checklist`                                         | `string[]`                    | —                                      |
| warranty_policies | `exclusions` / `repair_rules` / `replacement_rules` | `string[]`                    | —                                      |

> 生产环境建议逐步将高频查询的 JSONB 字段规范化为独立表。

## 如何把当前 seed 数据导入 Supabase

### 方式一：Supabase Table Editor 手动录入

1. 在 Supabase Dashboard → SQL Editor 中执行上述建表 SQL
2. 参考 `server/data/seed.ts` 中的数据逐条录入
3. 或者使用 Supabase Table Editor 的 CSV 导入功能

### 方式二：编写导入脚本（推荐）

```bash
# 1. 创建 seed 导出脚本
node -e "
const { getStore } = require('./.output/server/chunks/_/seed.mjs');
const store = getStore();
console.log(JSON.stringify(store, null, 2));
" > seed-export.json

# 2. 使用 Supabase JS SDK 批量 upsert
# (需要先安装 @supabase/supabase-js)
```

### 方式三：Supabase Dashboard SQL

在 Supabase SQL Editor 中直接 INSERT 数据，参考 `server/data/seed.ts`。

## 环境变量配置

```bash
# .env
DATA_PROVIDER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 拥有绕过 RLS 的权限，绝不能暴露到前端或 Git。
