<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2>工单队列</h2>
        <p class="muted">{{ filteredTickets.length }} / {{ tickets.length }} 条</p>
      </div>
      <ListFilter :size="20" />
    </div>

    <div class="panel-body">
      <div class="toolbar section">
        <el-input v-model="keyword" clearable placeholder="订单、客户、问题" :prefix-icon="SearchIcon" />
        <el-select v-model="priority" placeholder="优先级">
          <el-option label="全部" value="all" />
          <el-option label="P0/P1" value="urgent" />
          <el-option label="高优先级" value="high" />
          <el-option label="普通" value="medium" />
        </el-select>
        <el-select v-model="status" placeholder="状态">
          <el-option label="全部" value="all" />
          <el-option label="待初诊" value="new" />
          <el-option label="已初诊" value="diagnosed" />
          <el-option label="待确认" value="pending_confirmation" />
          <el-option label="已升级" value="escalated" />
        </el-select>
      </div>

      <div class="ticket-list">
        <button
          v-for="ticket in filteredTickets"
          :key="ticket.id"
          type="button"
          class="ticket-row"
          :class="{ 'is-active': selectedId === ticket.id }"
          @click="$emit('select', ticket.id)"
        >
          <div class="ticket-row-top">
            <span class="pill" :class="priorityTone(ticket.priority)">{{ priorityLabel(ticket.priority) }}</span>
            <span class="pill">{{ ticket.channel }}</span>
          </div>
          <div class="ticket-title">{{ ticket.title }}</div>
          <div class="ticket-meta">
            <span class="pill">{{ ticket.customer.name }}</span>
            <span class="pill blue">{{ ticket.product.model }}</span>
            <span class="pill" :class="statusTone(ticket.status)">{{ statusLabel(ticket.status) }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ListFilter } from 'lucide-vue-next'
import { Search as SearchIcon } from '@element-plus/icons-vue'
import type { TicketPriority, TicketStatus, TicketWithRelations } from '../types/serviceops.ts'

defineEmits<{
  select: [id: string]
}>()

const props = defineProps<{
  tickets: TicketWithRelations[]
  selectedId?: string
}>()

const keyword = ref('')
const priority = ref<TicketPriority | 'all'>('all')
const status = ref<TicketStatus | 'all'>('all')

const filteredTickets = computed(() => {
  const normalized = keyword.value.trim().toLowerCase()

  return props.tickets.filter((ticket) => {
    const matchesKeyword = !normalized || [
      ticket.orderNo,
      ticket.title,
      ticket.customer.name,
      ticket.product.name,
      ticket.issue
    ].some((value) => value.toLowerCase().includes(normalized))
    const matchesPriority = priority.value === 'all' || ticket.priority === priority.value
    const matchesStatus = status.value === 'all' || ticket.status === status.value

    return matchesKeyword && matchesPriority && matchesStatus
  })
})

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
</script>
