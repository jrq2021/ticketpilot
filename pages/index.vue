<template>
  <div class="page-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">S</div>
        <div class="brand-text">
          <div class="brand-title">ServiceOps AI</div>
          <div class="brand-subtitle">售后质保工单降本平台</div>
        </div>
      </div>

      <nav class="nav-list">
        <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="nav-item"
          :class="{ 'is-active': activePanel === item.key }"
          @click="activePanel = item.key"
        >
          <component :is="item.icon" :size="18" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <strong>AI Provider</strong>
        <span>{{ config.public.aiProvider }}</span>
      </div>
    </aside>

    <main class="content">
      <div class="topbar">
        <div>
          <p class="eyebrow">Smart Hardware Service Desk</p>
          <h1>{{ title }}</h1>
          <p class="muted">{{ subtitle }}</p>
        </div>
        <div class="toolbar">
          <el-button @click="refreshAll">
            <RefreshCcw :size="16" />
            刷新
          </el-button>
          <el-button type="primary" @click="activePanel = 'workbench'">
            <Headphones :size="16" />
            坐席台
          </el-button>
        </div>
      </div>

      <RoiDashboard
        v-if="activePanel === 'dashboard'"
        :metrics="metrics || null"
        :tickets="tickets || []"
        @select-ticket="openTicket"
      />

      <section v-else-if="activePanel === 'workbench'" class="workbench-grid section">
        <TicketQueue
          :tickets="tickets || []"
          :selected-id="selectedId"
          @select="selectedId = $event"
        />
        <TicketDetail :ticket="selectedTicket" @refresh="refreshAll" />
      </section>

      <section v-else-if="activePanel === 'ai-quality'" class="section">
        <AiQualityDashboard :metrics="aiQualityMetrics || null" />
      </section>

      <section v-else class="section">
        <div class="workbench-grid">
          <TicketQueue
            :tickets="tickets || []"
            :selected-id="selectedId"
            @select="selectedId = $event"
          />
          <AgentTrace :recommendation="selectedTicket?.recommendation" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { BarChart3, BrainCircuit, GitBranch, Headphones, RefreshCcw, Workflow } from 'lucide-vue-next'
import type { AiQualityMetric, RoiMetric, TicketWithRelations } from '../types/serviceops.ts'

type PanelKey = 'dashboard' | 'workbench' | 'trace' | 'ai-quality'

const config = useRuntimeConfig()
const activePanel = ref<PanelKey>('dashboard')
const selectedId = ref<string>()

const { data: metrics, refresh: refreshMetrics } = await useFetch<RoiMetric>('/api/metrics/roi', {
  default: () => ({
    totalTickets: 0,
    diagnosedTickets: 0,
    automationRate: 0,
    humanConfirmationRate: 0,
    firstContactResolutionRate: 0,
    riskTicketCount: 0,
    savedMinutes: 0,
    savedHours: 0,
    estimatedSavingCny: 0,
    avgHandleTimeBefore: 0,
    avgHandleTimeAfter: 0,
    trend: [],
    priorityMix: []
  })
})

const { data: tickets, refresh: refreshTickets } = await useFetch<TicketWithRelations[]>('/api/tickets', {
  default: () => []
})

const { data: aiQualityMetrics, refresh: refreshAiQuality } = await useFetch<AiQualityMetric>('/api/metrics/ai-quality', {
  default: () => ({
    totalDiagnosedTickets: 0,
    averageConfidence: 0,
    lowConfidenceCount: 0,
    humanAdoptionRate: 0,
    riskInterceptionCount: 0,
    averageSavedMinutes: 0,
    warrantyReviewCount: 0,
    confidenceDistribution: [],
    actionTypeDistribution: [],
    riskFlagDistribution: []
  })
})

const navItems = [
  { key: 'dashboard' as const, label: 'ROI 看板', icon: BarChart3 },
  { key: 'workbench' as const, label: '坐席工作台', icon: Headphones },
  { key: 'ai-quality' as const, label: 'AI 评测', icon: BrainCircuit },
  { key: 'trace' as const, label: 'Agent 追踪', icon: Workflow }
]

const selectedTicket = computed(() => {
  const list = tickets.value || []
  return list.find((ticket) => ticket.id === selectedId.value) || list[0]
})

const title = computed(() => {
  return {
    dashboard: '售后运营 ROI',
    workbench: '工单处理工作台',
    'ai-quality': 'AI 模型质量评测',
    trace: 'AI 可审计链路'
  }[activePanel.value]
})

const subtitle = computed(() => {
  return {
    dashboard: '按节省工时、成本、自动分流和风险工单衡量 AI 投入产出',
    workbench: 'AI 生成初诊、证据引用、回复草稿，坐席确认后执行',
    'ai-quality': '置信度、采纳率、风险拦截等核心质量指标',
    trace: '展示检索、质保判断、风控和建议生成过程'
  }[activePanel.value]
})

watch(tickets, (list) => {
  if (!selectedId.value && list?.length) {
    selectedId.value = list[0].id
  }
}, { immediate: true })

async function refreshAll() {
  await Promise.all([refreshTickets(), refreshMetrics(), refreshAiQuality()])
}

function openTicket(id: string) {
  selectedId.value = id
  activePanel.value = 'workbench'
}
</script>
