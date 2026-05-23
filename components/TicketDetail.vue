<template>
  <div v-if="ticket" class="panel">
    <div class="panel-header">
      <div>
        <h2>{{ ticket.title }}</h2>
        <p class="muted">{{ ticket.orderNo }} · {{ ticket.product.name }} · {{ ticket.customer.name }}</p>
      </div>
      <div class="toolbar">
        <el-button :loading="diagnosing" type="primary" @click="diagnose">
          <Bot :size="16" />
          AI 初诊
        </el-button>
        <el-button :loading="drafting" :disabled="!recommendation" @click="draftReply">
          <FileText :size="16" />
          回复草稿
        </el-button>
        <el-button :loading="confirming" :disabled="!actionDraft && !recommendation" type="success" @click="confirmAction">
          <ClipboardCheck :size="16" />
          人工确认
        </el-button>
      </div>
    </div>

    <div class="panel-body">
      <div class="detail-grid section">
        <div class="info-tile">
          <div class="info-label">优先级</div>
          <div class="info-value">
            <span class="pill" :class="priorityTone(ticket.priority)">{{ priorityLabel(ticket.priority) }}</span>
          </div>
        </div>
        <div class="info-tile">
          <div class="info-label">状态</div>
          <div class="info-value">
            <span class="pill" :class="statusTone(ticket.status)">{{ statusLabel(ticket.status) }}</span>
          </div>
        </div>
        <div class="info-tile">
          <div class="info-label">预计节省</div>
          <div class="info-value">{{ ticket.estimatedManualMinutes - ticket.aiAssistedMinutes }} 分钟</div>
        </div>
        <div class="info-tile">
          <div class="info-label">序列号</div>
          <div class="info-value">{{ ticket.serialNumber }}</div>
        </div>
        <div class="info-tile">
          <div class="info-label">购买日期</div>
          <div class="info-value">{{ ticket.purchasedAt.slice(0, 10) }}</div>
        </div>
        <div class="info-tile">
          <div class="info-label">SLA 截止</div>
          <div class="info-value">{{ ticket.slaDueAt.slice(0, 16).replace('T', ' ') }}</div>
        </div>
      </div>

      <div class="section">
        <h3>客户问题</h3>
        <div class="issue-box">{{ ticket.issue }}</div>
      </div>

      <div v-if="recommendation" class="section recommendation">
        <div class="detail-row">
          <h3>AI 初诊结论</h3>
          <span class="pill" :class="confidenceTone(recommendation.confidence)">
            置信度 {{ Math.round(recommendation.confidence * 100) }}%
          </span>
        </div>
        <div class="issue-box">{{ recommendation.conclusion }}</div>

        <div class="split-panels">
          <div>
            <h3>建议动作</h3>
            <ul class="action-list">
              <li v-for="action in recommendation.suggestedActions" :key="action" class="action-item">
                {{ action }}
              </li>
            </ul>
          </div>

          <div>
            <h3>风险提示</h3>
            <ul class="risk-list">
              <li v-for="flag in recommendation.riskFlags" :key="flag" class="risk-item">
                {{ flag }}
              </li>
              <li v-if="!recommendation.riskFlags.length" class="risk-item">
                未命中高风险规则。
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div v-if="actionDraft" class="section">
        <div class="detail-row">
          <h3>坐席回复草稿</h3>
          <span class="pill amber">需要人工确认</span>
        </div>
        <div class="reply-box">{{ actionDraft.reply }}</div>
      </div>

      <div v-if="ticket.confirmedAction" class="section">
        <h3>已确认动作</h3>
        <div class="reply-box">
          {{ actionLabel(ticket.confirmedAction.type) }} · {{ ticket.confirmedAction.note }}
        </div>
      </div>
    </div>
  </div>

  <div v-else class="empty-state panel">
    选择一个工单。
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Bot, ClipboardCheck, FileText } from 'lucide-vue-next'
import type {
  ActionDraft,
  AgentRecommendation,
  ConfirmedActionType,
  TicketPriority,
  TicketStatus,
  TicketWithRelations
} from '../types/serviceops.ts'

const emit = defineEmits<{
  refresh: []
}>()

const props = defineProps<{
  ticket?: TicketWithRelations
}>()

const diagnosing = ref(false)
const drafting = ref(false)
const confirming = ref(false)
const recommendation = ref<AgentRecommendation | undefined>(props.ticket?.recommendation)
const actionDraft = ref<ActionDraft | undefined>(props.ticket?.actionDraft)

watch(() => props.ticket, (ticket) => {
  recommendation.value = ticket?.recommendation
  actionDraft.value = ticket?.actionDraft
})

async function diagnose() {
  if (!props.ticket) return
  diagnosing.value = true

  try {
    recommendation.value = await $fetch<AgentRecommendation>(`/api/tickets/${props.ticket.id}/diagnose`, {
      method: 'POST'
    })
    ElMessage.success('AI 初诊已完成')
    emit('refresh')
  } finally {
    diagnosing.value = false
  }
}

async function draftReply() {
  if (!props.ticket || !recommendation.value) return
  drafting.value = true

  try {
    actionDraft.value = await $fetch<ActionDraft>(`/api/tickets/${props.ticket.id}/draft-reply`, {
      method: 'POST'
    })
    ElMessage.success('回复草稿已生成')
    emit('refresh')
  } finally {
    drafting.value = false
  }
}

async function confirmAction() {
  if (!props.ticket) return
  confirming.value = true

  try {
    const actionType = actionDraft.value?.actionType || recommendation.value?.nextBestAction || 'escalate'
    await $fetch(`/api/tickets/${props.ticket.id}/confirm-action`, {
      method: 'POST',
      body: {
        actionType,
        note: `${actionLabel(actionType)} 已由坐席确认，保留 AI 建议与证据引用。`
      }
    })
    ElMessage.success('人工动作已确认')
    emit('refresh')
  } finally {
    confirming.value = false
  }
}

function priorityLabel(value: TicketPriority) {
  return {
    urgent: 'P0/P1',
    high: '高优先级',
    medium: '普通',
    low: '低优先级'
  }[value]
}

function priorityTone(value: TicketPriority) {
  return {
    urgent: 'red',
    high: 'amber',
    medium: 'blue',
    low: 'green'
  }[value]
}

function statusLabel(value: TicketStatus) {
  return {
    new: '待初诊',
    diagnosed: '已初诊',
    pending_confirmation: '待确认',
    confirmed: '已确认',
    escalated: '已升级'
  }[value]
}

function statusTone(value: TicketStatus) {
  return {
    new: '',
    diagnosed: 'blue',
    pending_confirmation: 'amber',
    confirmed: 'green',
    escalated: 'red'
  }[value]
}

function confidenceTone(value: number) {
  if (value >= 0.8) return 'green'
  if (value >= 0.7) return 'amber'
  return 'red'
}

function actionLabel(value: ConfirmedActionType) {
  return {
    dispatch: '预约上门',
    replacement: '换新审批',
    refund_review: '退款复核',
    escalate: '主管复核',
    close: '关闭工单'
  }[value]
}
</script>
