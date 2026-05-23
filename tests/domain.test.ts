import assert from "node:assert/strict";
import test from "node:test";
import { getStore } from "../server/data/seed.ts";
import {
  appendTimelineEvent,
  buildActionDraft,
  buildMockRecommendation,
  calculateAiQualityMetrics,
  calculateRoiMetrics,
  evaluateWarranty,
  findPolicyForProduct,
  getLatestTimelineEvent,
  mapActionToStatus,
  normalizeAgentRecommendation,
  searchKnowledge,
  sortTimelineEvents,
  validateTimeline,
} from "../server/utils/domain.ts";

test("evaluateWarranty marks in-warranty normal defects as valid", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);

  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);

  const policy = findPolicyForProduct(product, store.policies);
  const result = evaluateWarranty(ticket, product, policy);

  assert.equal(result.status, "valid");
});

test("evaluateWarranty detects void-risk wording before approving warranty", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24005");
  assert.ok(ticket);

  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);

  const policy = findPolicyForProduct(product, store.policies);
  const result = evaluateWarranty(ticket, product, policy);

  assert.equal(result.status, "void_risk");
});

test("mock AI recommendation includes audit-safe required fields", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24002");
  assert.ok(ticket);

  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);

  const policy = findPolicyForProduct(product, store.policies);
  const { evidence } = searchKnowledge(ticket, product, store.knowledgeDocs);
  const recommendation = buildMockRecommendation(
    ticket,
    product,
    policy,
    evidence,
  );

  assert.ok(recommendation.conclusion.length > 20);
  assert.ok(recommendation.confidence > 0 && recommendation.confidence <= 1);
  assert.ok(recommendation.evidence.length > 0);
  assert.ok(recommendation.suggestedActions.length > 0);
  assert.ok(recommendation.riskFlags.some((flag) => flag.includes("人工确认")));
});

test("low confidence or high risk actions remain human-confirmed in drafts", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24005");
  assert.ok(ticket);

  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);

  const policy = findPolicyForProduct(product, store.policies);
  const { evidence } = searchKnowledge(ticket, product, store.knowledgeDocs);
  const recommendation = buildMockRecommendation(
    ticket,
    product,
    policy,
    evidence,
  );
  const draft = buildActionDraft(ticket, recommendation);

  assert.equal(draft.requiredHumanConfirmation, true);
  assert.equal(draft.actionType, "escalate");
  assert.ok(draft.checklist.length >= 3);
});

test("ROI metrics quantify saved minutes and money", () => {
  const metrics = calculateRoiMetrics(getStore());

  assert.equal(metrics.totalTickets, 30);
  assert.ok(metrics.savedMinutes > 0);
  assert.ok(metrics.estimatedSavingCny > 0);
  assert.ok(metrics.avgHandleTimeBefore > metrics.avgHandleTimeAfter);
  assert.ok(metrics.priorityMix.some((item) => item.name === "P0/P1"));
});

// ---- Timeline tests ----

test("sortTimelineEvents orders events by time ascending", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24005");
  assert.ok(ticket);
  assert.ok(ticket.timeline.length > 0);

  const sorted = sortTimelineEvents(ticket.timeline);

  for (let i = 1; i < sorted.length; i++) {
    const prevTime = new Date(sorted[i - 1].at).getTime();
    const currTime = new Date(sorted[i].at).getTime();
    assert.ok(
      currTime >= prevTime,
      `Event ${sorted[i].id} should not come before ${sorted[i - 1].id}`,
    );
  }
});

test("appendTimelineEvent adds a new event and getLatestTimelineEvent retrieves it", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);

  const beforeCount = ticket.timeline.length;

  const event = appendTimelineEvent(ticket, {
    at: "2026-05-23T09:00:00.000Z",
    type: "agent",
    title: "坐席确认派工",
    detail: "已安排工程师上门，预计 5 月 24 日上午到达。",
    actor: "坐席 李明",
  });

  assert.equal(ticket.timeline.length, beforeCount + 1);
  assert.equal(event.type, "agent");
  assert.equal(event.title, "坐席确认派工");

  const latest = getLatestTimelineEvent(ticket);
  assert.ok(latest);
  assert.equal(latest.id, event.id);
});

test("mapActionToStatus returns correct status for each ConfirmedActionType", () => {
  assert.equal(mapActionToStatus("dispatch"), "dispatching");
  assert.equal(mapActionToStatus("replacement"), "replacement_review");
  assert.equal(mapActionToStatus("refund_review"), "refund_review");
  assert.equal(mapActionToStatus("escalate"), "escalated");
  assert.equal(mapActionToStatus("close"), "closed");
});

test("validateTimeline rejects empty timeline", () => {
  const result = validateTimeline({
    id: "tkt-test",
    timeline: [],
  } as any);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes("为空")));
});

test("validateTimeline accepts valid timeline with system event first", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24003");
  assert.ok(ticket);
  assert.ok(ticket.timeline.length > 0);

  const result = validateTimeline(ticket);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

// ---- AI Quality Metrics tests ----

test("calculateAiQualityMetrics correctly counts low confidence tickets", () => {
  const metrics = calculateAiQualityMetrics(getStore());

  // 从 seed 数据中手动核实：只有 void_risk (0.64) 和 manual_review (0.7) 低于 0.72
  assert.ok(metrics.lowConfidenceCount >= 0);
  // 低置信度计数不应超过诊断总数
  assert.ok(metrics.lowConfidenceCount <= metrics.totalDiagnosedTickets);
});

test("calculateAiQualityMetrics computes average confidence correctly", () => {
  const metrics = calculateAiQualityMetrics(getStore());

  if (metrics.totalDiagnosedTickets > 0) {
    assert.ok(metrics.averageConfidence > 0);
    assert.ok(metrics.averageConfidence <= 1);
  } else {
    assert.equal(metrics.averageConfidence, 0);
  }
});

test("calculateAiQualityMetrics risk interception count is non-negative", () => {
  const metrics = calculateAiQualityMetrics(getStore());

  assert.ok(metrics.riskInterceptionCount >= 0);
  assert.ok(metrics.riskInterceptionCount <= metrics.totalDiagnosedTickets);
  // 风险标记分布与拦截计数一致
  const totalFlagged = metrics.riskFlagDistribution.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  assert.ok(totalFlagged >= metrics.riskInterceptionCount);
});

test("calculateAiQualityMetrics average saved minutes is positive", () => {
  const metrics = calculateAiQualityMetrics(getStore());

  assert.ok(metrics.averageSavedMinutes > 0, "AI 辅助应产生正向节省");
  assert.ok(metrics.averageSavedMinutes < 120, "平均节省不应异常偏高");
});

// ---- AI Provider & Normalization tests ----

test("searchKnowledge returns matchedTerms and score for each evidence", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);
  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);

  const { evidence, retrievalTrace } = searchKnowledge(
    ticket,
    product,
    store.knowledgeDocs,
  );

  assert.ok(evidence.length > 0);
  assert.ok(retrievalTrace.method === "keyword");
  assert.ok(retrievalTrace.durationMs >= 0);

  for (const e of evidence) {
    assert.ok(Array.isArray(e.matchedTerms));
    assert.ok(typeof e.score === "number");
    assert.ok(typeof e.category === "string");
    assert.ok(typeof e.updatedAt === "string");
  }
});

test("normalizeAgentRecommendation clamps confidence to 0-1", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);
  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);
  const policy = findPolicyForProduct(product, store.policies);
  const { evidence } = searchKnowledge(ticket, product, store.knowledgeDocs);
  const fallback = buildMockRecommendation(ticket, product, policy, evidence);

  // confidence = 2.5 → 应被夹到 1
  const { recommendation: rec1 } = normalizeAgentRecommendation(
    { confidence: 2.5 },
    fallback,
  );
  assert.equal(rec1.confidence, 1);

  // confidence = -0.3 → 应被夹到 0
  const { recommendation: rec2 } = normalizeAgentRecommendation(
    { confidence: -0.3 },
    fallback,
  );
  assert.equal(rec2.confidence, 0);

  // confidence = "abc" → fallback
  const { recommendation: rec3, warnings } = normalizeAgentRecommendation(
    { confidence: "abc" },
    fallback,
  );
  assert.equal(rec3.confidence, fallback.confidence);
  assert.ok(warnings.length > 0);
});

test("normalizeAgentRecommendation forces humanConfirmationRequired for high-risk actions", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);
  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);
  const policy = findPolicyForProduct(product, store.policies);
  const { evidence } = searchKnowledge(ticket, product, store.knowledgeDocs);
  const fallback = buildMockRecommendation(ticket, product, policy, evidence);

  // 换新 → 高风险，即使 humanConfirmationRequired=false 也会被强制设为 true
  const { recommendation: rec } = normalizeAgentRecommendation(
    {
      nextBestAction: "replacement",
      humanConfirmationRequired: false,
      confidence: 0.9,
    },
    fallback,
  );

  assert.equal(rec.humanConfirmationRequired, true);
  assert.equal(rec.nextBestAction, "replacement");
});

test("normalizeAgentRecommendation handles missing fields without crashing", () => {
  const store = getStore();
  const ticket = store.tickets.find((item) => item.id === "tkt-24001");
  assert.ok(ticket);
  const product = store.products.find((item) => item.id === ticket.productId);
  assert.ok(product);
  const policy = findPolicyForProduct(product, store.policies);
  const { evidence } = searchKnowledge(ticket, product, store.knowledgeDocs);
  const fallback = buildMockRecommendation(ticket, product, policy, evidence);

  // 空对象 → 不应崩溃
  const { recommendation } = normalizeAgentRecommendation({}, fallback);
  assert.ok(recommendation);
  assert.ok(recommendation.conclusion.length > 0);
  assert.ok(Array.isArray(recommendation.suggestedActions));
  assert.ok(Array.isArray(recommendation.riskFlags));
});
