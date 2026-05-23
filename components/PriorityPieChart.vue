<template>
  <div ref="chartEl" class="chart-box" />
</template>

<script setup lang="ts">
import type { RoiMetric } from '../types/serviceops.ts'

const props = defineProps<{
  mix: RoiMetric['priorityMix']
}>()

const chartEl = ref<HTMLElement | null>(null)
let chart: { setOption: (option: unknown) => void; resize: () => void; dispose: () => void } | null = null

async function renderChart() {
  if (!chartEl.value) return

  const echarts = await import('echarts')
  chart = chart || echarts.init(chartEl.value)
  chart.setOption({
    color: ['#dc2626', '#f59e0b', '#2563eb', '#16a34a'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 4, left: 'center', itemWidth: 10, itemHeight: 10 },
    series: [
      {
        name: '工单优先级',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            formatter: '{b}: {c}'
          }
        },
        data: props.mix
      }
    ]
  })
}

const resize = () => chart?.resize()

onMounted(() => {
  renderChart()
  window.addEventListener('resize', resize)
})

watch(() => props.mix, renderChart, { deep: true })

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
})
</script>
