<template>
  <section v-if="metrics" class="ai-quality">
    <!-- KPI 卡片 -->
    <div class="metrics-grid">
      <article class="metric-card">
        <div class="metric-label">
          <span>平均置信度</span>
          <Activity :size="18" />
        </div>
        <div
          class="metric-value"
          :class="confidenceTone(metrics.averageConfidence)"
        >
          {{ percent(metrics.averageConfidence) }}
        </div>
        <div class="metric-note">
          {{ metrics.totalDiagnosedTickets }} 条工单已 AI 初诊
        </div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>低置信度工单</span>
          <AlertTriangle :size="18" />
        </div>
        <div class="metric-value metric-warning">
          {{ metrics.lowConfidenceCount }}
        </div>
        <div class="metric-note">置信度 &lt; 72%，需人工复核</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>人工采纳率</span>
          <UserCheck :size="18" />
        </div>
        <div
          class="metric-value"
          :class="adoptionTone(metrics.humanAdoptionRate)"
        >
          {{ percent(metrics.humanAdoptionRate) }}
        </div>
        <div class="metric-note">坐席采纳 AI 建议后执行确认</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>风险拦截数</span>
          <ShieldAlert :size="18" />
        </div>
        <div class="metric-value metric-danger">
          {{ metrics.riskInterceptionCount }}
        </div>
        <div class="metric-note">命中风控规则，人工接管</div>
      </article>

      <article class="metric-card">
        <div class="metric-label">
          <span>平均节省时长</span>
          <Clock3 :size="18" />
        </div>
        <div class="metric-value metric-positive">
          {{ metrics.averageSavedMinutes }}min
        </div>
        <div class="metric-note">AI 辅助后单均节省</div>
      </article>
    </div>

    <!-- 图表 & 列表 -->
    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>置信度分布</h2>
            <p class="muted">AI 初诊结论的置信区间分布</p>
          </div>
        </div>
        <div class="panel-body">
          <ClientOnly>
            <div ref="confidenceChartRef" class="chart-box" />
          </ClientOnly>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>建议动作分布</h2>
            <p class="muted">AI 输出动作类型的占比</p>
          </div>
        </div>
        <div class="panel-body">
          <ClientOnly>
            <div ref="actionChartRef" class="chart-box" />
          </ClientOnly>
        </div>
      </div>
    </div>

    <!-- 风险标记分布 -->
    <div class="panel section">
      <div class="panel-header">
        <div>
          <h2>风险标记分布</h2>
          <p class="muted">AI 识别到的风险信号频次</p>
        </div>
      </div>
      <div class="panel-body">
        <div
          v-if="metrics.riskFlagDistribution.length === 0"
          class="timeline-empty muted"
        >
          暂无风险标记
        </div>
        <div v-else class="risk-flag-list">
          <div
            v-for="(item, index) in metrics.riskFlagDistribution"
            :key="index"
            class="risk-flag-row"
          >
            <div class="risk-flag-info">
              <span class="risk-flag-rank">{{ index + 1 }}</span>
              <span class="risk-flag-text">{{ item.flag }}</span>
            </div>
            <div class="risk-flag-bar-wrap">
              <div
                class="risk-flag-bar"
                :style="{
                  width: barWidth(
                    item.count,
                    metrics.riskFlagDistribution[0].count,
                  ),
                }"
              />
              <span class="risk-flag-count">{{ item.count }} 次</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div v-else class="empty-state panel section">正在加载 AI 质量指标…</div>
</template>

<script setup lang="ts">
import {
  Activity,
  AlertTriangle,
  Clock3,
  ShieldAlert,
  UserCheck,
} from "lucide-vue-next";
import * as echarts from "echarts";
import type { AiQualityMetric } from "../types/serviceops.ts";

const props = defineProps<{
  metrics: AiQualityMetric | null;
}>();

const confidenceChartRef = ref<HTMLDivElement>();
const actionChartRef = ref<HTMLDivElement>();
let confidenceChart: echarts.ECharts | null = null;
let actionChart: echarts.ECharts | null = null;

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function confidenceTone(value: number) {
  if (value >= 0.85) return "metric-positive";
  if (value >= 0.75) return "";
  return "metric-warning";
}

function adoptionTone(value: number) {
  if (value >= 0.5) return "metric-positive";
  if (value >= 0.3) return "";
  return "metric-danger";
}

function barWidth(value: number, max: number) {
  if (!max) return "0%";
  return `${Math.round((value / max) * 100)}%`;
}

function renderConfidenceChart() {
  if (!confidenceChartRef.value || !props.metrics) return;
  if (!confidenceChart) {
    confidenceChart = echarts.init(confidenceChartRef.value);
  }

  confidenceChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c} 条 ({d}%)" },
    legend: { bottom: 0 },
    series: [
      {
        type: "pie",
        radius: ["45%", "72%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: { show: true, formatter: "{b}\n{d}%" },
        data: props.metrics.confidenceDistribution.map((item) => ({
          name: item.label,
          value: item.value,
        })),
        color: ["#15803d", "#2563eb", "#b45309", "#b42318"],
      },
    ],
  });
}

function renderActionChart() {
  if (!actionChartRef.value || !props.metrics) return;
  if (!actionChart) {
    actionChart = echarts.init(actionChartRef.value);
  }

  const data = props.metrics.actionTypeDistribution;

  actionChart.setOption({
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: data.map((d) => d.action),
      axisLabel: { fontSize: 12 },
    },
    yAxis: { type: "value", minInterval: 1 },
    series: [
      {
        type: "bar",
        data: data.map((d) => d.value),
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#2563eb" },
            { offset: 1, color: "#60a5fa" },
          ]),
        },
        barMaxWidth: 48,
      },
    ],
    grid: { left: 32, right: 24, top: 16, bottom: 32 },
  });
}

watch(
  () => props.metrics,
  (m) => {
    if (m) {
      nextTick(() => {
        renderConfidenceChart();
        renderActionChart();
      });
    }
  },
  { immediate: true },
);

onUnmounted(() => {
  confidenceChart?.dispose();
  actionChart?.dispose();
});
</script>

<style scoped>
.risk-flag-list {
  display: grid;
  gap: 12px;
}

.risk-flag-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.risk-flag-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
}

.risk-flag-rank {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #eef3f8;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.risk-flag-text {
  font-size: 13px;
  color: var(--text);
}

.risk-flag-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.risk-flag-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--blue);
  min-width: 4px;
  transition: width 0.4s ease;
}

.risk-flag-count {
  font-size: 12px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
</style>
