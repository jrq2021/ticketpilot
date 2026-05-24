# TicketPilot 部署指南

> 目标：把项目部署到 Vercel，支持 memory mock 模式（零配置）和 DeepSeek/Supabase 模式（可选项）。

---

## 一、GitHub 推送

```bash
cd ticketpilot
git add -A
git commit -m "ready for Vercel deployment"
git push origin main
```

> ⚠️ 确认 `.env` 和 `docs/INTERVIEW_SCRIPT.md` 等已被 `.gitignore` 排除。

---

## 二、Vercel 导入

1. 打开 [vercel.com](https://vercel.com)，点击 **Add New → Project**
2. 导入 GitHub 仓库 `jrq2021/ticketpilot`
3. Framework 自动检测为 **Nuxt.js**
4. 点击 **Deploy**（默认使用 memory + mock，无需配环境变量）

> 构建命令自动为 `npm run build`，输出目录 Vercel 自动处理。

---

## 三、环境变量配置

### 3.1 Memory + Mock 模式（零配置，默认）

| 变量 | 值 | 说明 |
|------|-----|------|
| `DATA_PROVIDER` | `memory` | 使用内存种子数据 |
| `NUXT_PUBLIC_AI_PROVIDER` | `mock` | 使用规则引擎 AI |

> 这两个变量已在 `vercel.json` 中预设，导入项目即可部署。

### 3.2 Memory + DeepSeek 模式

在 Vercel Dashboard → Settings → Environment Variables 中添加：

| 变量 | 值 |
|------|-----|
| `NUXT_PUBLIC_AI_PROVIDER` | `openai` |
| `OPENAI_BASE_URL` | `https://api.deepseek.com/v1` |
| `OPENAI_API_KEY` | `sk-你的DeepSeek密钥` |
| `OPENAI_MODEL` | `deepseek-chat` |

> ⚠️ `OPENAI_API_KEY` 是服务端密钥，Vercel 不会暴露给前端。但 `NUXT_PUBLIC_*` 前缀的变量会暴露——这里 `NUXT_PUBLIC_AI_PROVIDER` 只有 `"mock"` 或 `"openai"` 两个值，不含密钥。

### 3.3 Supabase + DeepSeek 模式

在 3.2 的基础上，再添加：

| 变量 | 值 |
|------|-----|
| `DATA_PROVIDER` | `supabase` |
| `SUPABASE_URL` | `https://你的项目.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | `你的 Service Role Key` |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` 拥有绕过 RLS 的完整权限，绝不能出现在前端代码或 Git 仓库中。只在 Vercel 环境变量中配置。

### 3.4 部署后重新构建

修改环境变量后，需要在 Vercel Dashboard → Deployments → **Redeploy** 重新构建才能生效。

---

## 四、部署后验收清单

部署完成后，打开 Vercel 提供的域名（如 `https://ticketpilot.vercel.app`），逐项检查：

### 页面验收

- [ ] 首页 ROI 看板正常打开，5 个 KPI 卡片有数据
- [ ] 处理时长趋势图、优先级饼图正常渲染
- [ ] 点击「坐席工作台」→ 30 条工单队列正常显示
- [ ] 点击 ⭐ 推荐演示工单 → 工单详情 + 时间线正常
- [ ] 点击「AI 评测」→ 置信度分布图正常渲染
- [ ] 点击「Agent 追踪」→ 检索文档列表正常

### 功能验收

- [ ] 点击「AI 初诊」→ 返回诊断结论（Mock 或 DeepSeek）
- [ ] Provider 徽章显示正确（Mock 生成 / DeepSeek 生成）
- [ ] 点击「回复草稿」→ 草稿正常生成
- [ ] 点击「人工确认」→ 状态更新 + 时间线追加记录
- [ ] 回到 ROI 看板 → 指标有变化

### 控制台验收

- [ ] 打开浏览器 DevTools → Console，无红色报错
- [ ] Network 面板中 API 请求全部 200

---

## 五、常见问题

### Q：部署后页面白屏/500？

A：检查 Vercel 环境变量是否正确设置。尝试 Redeploy。

### Q：AI 初诊返回「Mock 生成」而不是 DeepSeek？

A：确认 `NUXT_PUBLIC_AI_PROVIDER=openai` 和 `OPENAI_API_KEY` 已正确设置，然后 Redeploy。

### Q：想切回 Mock 模式怎么办？

A：在 Vercel 环境变量中删除 `OPENAI_API_KEY`，将 `NUXT_PUBLIC_AI_PROVIDER` 改回 `mock`，Redeploy。

### Q：Vercel 免费额度够用吗？

A：Memory + Mock 模式几乎不消耗资源，免费层完全够用。DeepSeek API 调用会消耗你自己的 API 余额。

---

## 六、安全提醒

| 检查项 | 状态 |
|--------|------|
| `.env` 已加入 `.gitignore` | ✅ |
| `OPENAI_API_KEY` 不在 Git 仓库中 | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` 只在 Vercel 环境变量 | ✅ |
| `NUXT_PUBLIC_*` 前缀变量不含密钥 | ✅ |
| README 中的示例 Key 都是占位符 `sk-your-key` | ✅ |
