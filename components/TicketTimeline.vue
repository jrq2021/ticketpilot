<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2>处理时间线</h2>
        <p class="muted">从建单到关闭的完整节点追溯</p>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="sorted.length === 0" class="timeline-empty muted">
        暂无时间线记录
      </div>
      <ol v-else class="timeline-list">
        <li
          v-for="(event, index) in sorted"
          :key="event.id"
          class="timeline-item"
          :class="{ 'is-last': index === sorted.length - 1 }"
        >
          <div class="timeline-marker">
            <div class="timeline-dot" :class="dotClass(event.type)">
              <component :is="iconFor(event.type)" :size="14" />
            </div>
            <div v-if="index < sorted.length - 1" class="timeline-line" />
          </div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="timeline-title">{{ event.title }}</span>
              <span class="timeline-type-pill" :class="dotClass(event.type)">
                {{ typeLabel(event.type) }}
              </span>
            </div>
            <p class="timeline-detail">{{ event.detail }}</p>
            <div class="timeline-meta">
              <span v-if="event.actor" class="timeline-actor">
                <UserRound :size="12" />
                {{ event.actor }}
              </span>
              <span class="timeline-time">{{ formatTime(event.at) }}</span>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Bot,
  ClipboardCheck,
  Cog,
  FileSignature,
  UserRound,
  Wrench
} from 'lucide-vue-next'
import type { TicketTimelineEvent, TimelineEventType } from '../types/serviceops.ts'

const props = defineProps<{
  events: TicketTimelineEvent[]
}>()

const sorted = computed(() =>
  [...props.events].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  )
)

function dotClass(type: TimelineEventType) {
  return {
    system: 'dot-system',
    ai: 'dot-ai',
    agent: 'dot-agent',
    field: 'dot-field',
    approval: 'dot-approval'
  }[type]
}

function iconFor(type: TimelineEventType) {
  return {
    system: Cog,
    ai: Bot,
    agent: ClipboardCheck,
    field: Wrench,
    approval: FileSignature
  }[type]
}

function typeLabel(type: TimelineEventType) {
  return {
    system: '系统',
    ai: 'AI 诊断',
    agent: '坐席',
    field: '现场',
    approval: '审批'
  }[type]
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}
</script>

<style scoped>
.timeline-empty {
  text-align: center;
  padding: 32px 0;
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
}

.timeline-item {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 14px;
}

.timeline-item.is-last {
  min-height: auto;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 2px;
}

.timeline-dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-dot.dot-system {
  background: #eef3f8;
  color: #64748b;
}

.timeline-dot.dot-ai {
  background: #dbeafe;
  color: #2563eb;
}

.timeline-dot.dot-agent {
  background: #e8f7ee;
  color: #15803d;
}

.timeline-dot.dot-field {
  background: #fff3dc;
  color: #b45309;
}

.timeline-dot.dot-approval {
  background: #fdecea;
  color: #b42318;
}

.timeline-line {
  flex: 1;
  width: 2px;
  min-height: 24px;
  margin: 4px 0;
  background: var(--line);
}

.timeline-item.is-last .timeline-line {
  display: none;
}

.timeline-card {
  padding-bottom: 18px;
}

.timeline-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.timeline-title {
  font-weight: 700;
  font-size: 14px;
  color: var(--text);
}

.timeline-type-pill {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.timeline-type-pill.dot-system {
  color: #64748b;
  background: #eef3f8;
}

.timeline-type-pill.dot-ai {
  color: #2563eb;
  background: #dbeafe;
}

.timeline-type-pill.dot-agent {
  color: #15803d;
  background: #e8f7ee;
}

.timeline-type-pill.dot-field {
  color: #b45309;
  background: #fff3dc;
}

.timeline-type-pill.dot-approval {
  color: #b42318;
  background: #fdecea;
}

.timeline-detail {
  margin: 0 0 6px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.5;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--muted);
  font-size: 12px;
}

.timeline-actor {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.timeline-time {
  font-variant-numeric: tabular-nums;
}
</style>
