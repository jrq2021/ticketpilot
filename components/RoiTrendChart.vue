<template>
  <div ref="chartEl" class="chart-box" />
</template>

<script setup lang="ts">
import type { RoiMetric } from '../types/serviceops.ts'

const props = defineProps<{
  trend: RoiMetric['trend']
}>()

const chartEl = ref<HTMLElement | null>(null)
let chart: { setOption: (option: unknown) => void; resize: () => void; dispose: () => void } | null = null

async function renderChart() {
  if (!chartEl.value) return

  const echarts = await import('echarts')
  chart = chart || echarts.init(chartEl.value)
  chart.setOption({
    color: ['#2563eb', '#16a34a', '#f59e0b'],
    tooltip: { trigger: 'axis' },
    grid: { left: 70, right: 18, top: 34, bottom: 32 },
    legend: { top: 0, right: 8, itemWidth: 10, itemHeight: 10 },
    xAxis: {
      type: 'category',
      data: props.trend.map((item) => item.day),
      axisLine: { lineStyle: { color: '#cbd6e2' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} min' },
      splitLine: { lineStyle: { color: '#edf2f7' } }
    },
    series: [
      {
        name: '人工处理',
        type: 'line',
        smooth: true,
        data: props.trend.map((item) => item.manualMinutes)
      },
      {
        name: 'AI 协同',
        type: 'line',
        smooth: true,
        data: props.trend.map((item) => item.aiMinutes)
      },
      {
        name: '节省',
        type: 'bar',
        barWidth: 18,
        data: props.trend.map((item) => item.savedMinutes)
      }
    ]
  })
}

const resize = () => chart?.resize()

onMounted(() => {
  renderChart()
  window.addEventListener('resize', resize)
})

watch(() => props.trend, renderChart, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>
