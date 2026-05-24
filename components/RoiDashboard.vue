<template>
  <section v-if="metrics" class="section">
    <div class="metrics-grid">
      <article class="metric-card">
        <div class="metric-label">
          <span>本周节省工时</span>
          <Clock3 :size="18" />
        </div>
        <div class="metric-value metric-positive">
          {{ metrics.savedHours }}h
        </div>
        <div class="metric-note">约 {{ metrics.savedMinutes }} 分钟</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>预计节省成本</span>
          <BadgeDollarSign :size="18" />
        </div>
        <div class="metric-value metric-positive">
          ¥{{ metrics.estimatedSavingCny }}
        </div>
        <div class="metric-note">按坐席分钟成本估算</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>AI 分流率</span>
          <GitBranch :size="18" />
        </div>
        <div class="metric-value">{{ percent(metrics.automationRate) }}</div>
        <div class="metric-note">
          {{ metrics.diagnosedTickets }}/{{ metrics.totalTickets }} 已完成初诊
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>人工确认率</span>
          <UserCheck :size="18" />
        </div>
        <div class="metric-value metric-warning">
          {{ percent(metrics.humanConfirmationRate) }}
        </div>
        <div class="metric-note">高风险动作留在人工侧</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>风险工单</span>
          <ShieldAlert :size="18" />
        </div>
        <div class="metric-value metric-danger">
          {{ metrics.riskTicketCount }}
        </div>
        <div class="metric-note">退款、换新、P0/P1 或争议</div>
      </article>
    </div>
  </section>

  <section v-if="metrics" class="dashboard-grid section">
    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>处理时长趋势</h2>
          <p class="muted">人工与 AI 协同处理耗时对比</p>
        </div>
      </div>
      <div class="panel-body">
        <ClientOnly>
          <RoiTrendChart :trend="metrics.trend" />
        </ClientOnly>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>优先级结构</h2>
          <p class="muted">P0/P1 与高优先级占比</p>
        </div>
      </div>
      <div class="panel-body">
        <ClientOnly>
          <PriorityPieChart :mix="metrics.priorityMix" />
        </ClientOnly>
      </div>
    </div>
  </section>

  <section class="panel section">
    <div class="panel-header">
      <div>
        <h2>高价值工单</h2>
        <p class="muted">按 SLA、客诉风险和节省时长排序</p>
      </div>
    </div>
    <div class="panel-body">
      <div class="ticket-list">
        <button
          v-for="ticket in importantTickets"
          :key="ticket.id"
          class="ticket-row"
          type="button"
          @click="$emit('selectTicket', ticket.id)"
        >
          <div class="ticket-row-top">
            <span class="pill" :class="priorityTone(ticket.priority)">{{
              priorityLabel(ticket.priority)
            }}</span>
            <span class="pill blue">{{ ticket.product.model }}</span>
          </div>
          <div class="ticket-title">{{ ticket.title }}</div>
          <div class="ticket-meta">
            <span class="pill"
              >{{ ticket.customer.name }} · {{ ticket.customer.city }}</span
            >
            <span class="pill green"
              >可节省
              {{
                ticket.estimatedManualMinutes - ticket.aiAssistedMinutes
              }}
              分钟</span
            >
            <span class="pill" :class="statusTone(ticket.status)">{{
              statusLabel(ticket.status)
            }}</span>
            <span v-if="ticket.tags.includes('推荐演示')" class="pill amber"
              >⭐ 推荐演示</span
            >
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  BadgeDollarSign,
  Clock3,
  GitBranch,
  ShieldAlert,
  UserCheck,
} from "lucide-vue-next";
import type {
  RoiMetric,
  TicketPriority,
  TicketStatus,
  TicketWithRelations,
} from "../types/serviceops.ts";

defineEmits<{
  selectTicket: [id: string];
}>();

const props = defineProps<{
  metrics: RoiMetric | null;
  tickets: TicketWithRelations[];
}>();

const importantTickets = computed(() => {
  const priorityRank: Record<TicketPriority, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...props.tickets]
    .sort((a, b) => {
      const riskA =
        priorityRank[a.priority] * 100 +
        (a.estimatedManualMinutes - a.aiAssistedMinutes);
      const riskB =
        priorityRank[b.priority] * 100 +
        (b.estimatedManualMinutes - b.aiAssistedMinutes);
      return riskB - riskA;
    })
    .slice(0, 4);
});

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function priorityLabel(priority: TicketPriority) {
  return {
    urgent: "P0/P1",
    high: "高优先级",
    medium: "普通",
    low: "低优先级",
  }[priority];
}

function priorityTone(priority: TicketPriority) {
  return {
    urgent: "red",
    high: "amber",
    medium: "blue",
    low: "green",
  }[priority];
}

function statusLabel(status: TicketStatus) {
  return {
    new: "待初诊",
    assigned: "已指派",
    diagnosed: "已初诊",
    pending_confirmation: "待确认",
    dispatching: "派工中",
    repairing: "维修中",
    replacement_review: "换新审批",
    refund_review: "退款复核",
    escalated: "已升级",
    closed: "已关闭",
  }[status];
}

function statusTone(status: TicketStatus) {
  return {
    new: "",
    assigned: "blue",
    diagnosed: "blue",
    pending_confirmation: "amber",
    dispatching: "blue",
    repairing: "blue",
    replacement_review: "amber",
    refund_review: "amber",
    escalated: "red",
    closed: "green",
  }[status];
}
</script>
