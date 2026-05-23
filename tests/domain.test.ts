import assert from 'node:assert/strict'
import test from 'node:test'
import { getStore } from '../server/data/seed.ts'
import {
  buildActionDraft,
  buildMockRecommendation,
  calculateRoiMetrics,
  evaluateWarranty,
  findPolicyForProduct,
  searchKnowledge
} from '../server/utils/domain.ts'

test('evaluateWarranty marks in-warranty normal defects as valid', () => {
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === 'tkt-24001')
  assert.ok(ticket)

  const product = store.products.find((item) => item.id === ticket.productId)
  assert.ok(product)

  const policy = findPolicyForProduct(product, store.policies)
  const result = evaluateWarranty(ticket, product, policy)

  assert.equal(result.status, 'valid')
})

test('evaluateWarranty detects void-risk wording before approving warranty', () => {
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === 'tkt-24005')
  assert.ok(ticket)

  const product = store.products.find((item) => item.id === ticket.productId)
  assert.ok(product)

  const policy = findPolicyForProduct(product, store.policies)
  const result = evaluateWarranty(ticket, product, policy)

  assert.equal(result.status, 'void_risk')
})

test('mock AI recommendation includes audit-safe required fields', () => {
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === 'tkt-24002')
  assert.ok(ticket)

  const product = store.products.find((item) => item.id === ticket.productId)
  assert.ok(product)

  const policy = findPolicyForProduct(product, store.policies)
  const evidence = searchKnowledge(ticket, product, store.knowledgeDocs)
  const recommendation = buildMockRecommendation(ticket, product, policy, evidence)

  assert.ok(recommendation.conclusion.length > 20)
  assert.ok(recommendation.confidence > 0 && recommendation.confidence <= 1)
  assert.ok(recommendation.evidence.length > 0)
  assert.ok(recommendation.suggestedActions.length > 0)
  assert.ok(recommendation.riskFlags.some((flag) => flag.includes('人工确认')))
})

test('low confidence or high risk actions remain human-confirmed in drafts', () => {
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === 'tkt-24005')
  assert.ok(ticket)

  const product = store.products.find((item) => item.id === ticket.productId)
  assert.ok(product)

  const policy = findPolicyForProduct(product, store.policies)
  const evidence = searchKnowledge(ticket, product, store.knowledgeDocs)
  const recommendation = buildMockRecommendation(ticket, product, policy, evidence)
  const draft = buildActionDraft(ticket, recommendation)

  assert.equal(draft.requiredHumanConfirmation, true)
  assert.equal(draft.actionType, 'escalate')
  assert.ok(draft.checklist.length >= 3)
})

test('ROI metrics quantify saved minutes and money', () => {
  const metrics = calculateRoiMetrics(getStore())

  assert.equal(metrics.totalTickets, 5)
  assert.ok(metrics.savedMinutes > 0)
  assert.ok(metrics.estimatedSavingCny > 0)
  assert.ok(metrics.avgHandleTimeBefore > metrics.avgHandleTimeAfter)
  assert.ok(metrics.priorityMix.some((item) => item.name === 'P0/P1'))
})
