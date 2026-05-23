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
            <li
              v-for="item in recommendation.trace"
              :key="item.step"
              class="trace-item"
            >
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
            <h2>知识库检索</h2>
            <p class="muted">{{ retrievalDocs.length }} 条命中 · 关键词评分</p>
          </div>
        </div>
        <div class="panel-body">
          <div v-if="retrievalDocs.length === 0" class="timeline-empty muted">
            暂无检索记录
          </div>
          <ul v-else class="evidence-list">
            <li
              v-for="item in retrievalDocs"
              :key="item.docId"
              class="evidence-item"
            >
              <div class="detail-row">
                <span class="text-strong">{{ item.title }}</span>
                <span class="pill blue">得分 {{ item.score }}</span>
              </div>
              <p class="muted">{{ item.quote }}</p>
              <div class="evidence-tags">
                <span
                  v-for="term in item.matchedTerms"
                  :key="term"
                  class="pill"
                  >{{ term }}</span
                >
                <span class="pill">{{ item.category }}</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="panel section">
      <div class="panel-header">
        <div>
          <h2>风控约束</h2>
          <p class="muted">AI 输出可审计，关键动作保留人工确认</p>
        </div>
      </div>
      <div class="panel-body">
        <div class="detail-row section">
          <div>
            <span class="pill">humanConfirmationRequired</span>
            <span
              class="pill"
              :class="
                recommendation.humanConfirmationRequired ? 'amber' : 'green'
              "
            >
              {{
                recommendation.humanConfirmationRequired
                  ? "必须人工确认"
                  : "可自动执行"
              }}
            </span>
          </div>
        </div>
        <ul class="risk-list">
          <li
            v-for="flag in recommendation.riskFlags"
            :key="flag"
            class="risk-item"
          >
            {{ flag }}
          </li>
          <li v-if="!recommendation.riskFlags.length" class="risk-item">
            当前建议未命中高风险规则。
          </li>
        </ul>
      </div>
    </div>
  </div>

  <div v-else class="empty-state panel">选择已初诊工单查看 Agent 过程。</div>
</template>

<script setup lang="ts">
import type { AgentRecommendation, Evidence } from "../types/serviceops.ts";

const props = defineProps<{
  recommendation?: AgentRecommendation;
}>();

const retrievalDocs = computed<Evidence[]>(() => {
  return props.recommendation?.evidence || [];
});
</script>

<style scoped>
.evidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
</style>
