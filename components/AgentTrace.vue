<template>
  <div v-if="recommendation" class="recommendation">
    <div class="split-panels">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>Agent 过程追踪</h2>
            <p class="muted">检索、判断、生成与风控节点</p>
          </div>
        </div>
        <div class="panel-body">
          <ol class="trace-list">
            <li v-for="item in recommendation.trace" :key="item.step" class="trace-item">
              <div>
                <div class="trace-step">{{ item.step }}</div>
                <div class="muted">{{ item.durationMs }}ms</div>
              </div>
              <div>{{ item.detail }}</div>
            </li>
          </ol>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h2>证据引用</h2>
            <p class="muted">{{ recommendation.evidence.length }} 条命中依据</p>
          </div>
        </div>
        <div class="panel-body">
          <ul class="evidence-list">
            <li v-for="item in recommendation.evidence" :key="item.docId" class="evidence-item">
              <div class="text-strong">{{ item.title }}</div>
              <p class="muted">{{ item.quote }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <div>
          <h2>风控约束</h2>
          <p class="muted">AI 输出可审计，关键动作保留人工确认</p>
        </div>
      </div>
      <div class="panel-body">
        <ul class="risk-list">
          <li v-for="flag in recommendation.riskFlags" :key="flag" class="risk-item">
            {{ flag }}
          </li>
          <li v-if="!recommendation.riskFlags.length" class="risk-item">
            当前建议未命中高风险规则。
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div v-else class="empty-state panel">
    选择已初诊工单查看 Agent 过程。
  </div>
</template>

<script setup lang="ts">
import type { AgentRecommendation } from '../types/serviceops.ts'

defineProps<{
  recommendation?: AgentRecommendation
}>()
</script>
