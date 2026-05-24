import type { ConfirmedActionType } from "../../../../types/serviceops.ts";
import { createRepository } from "../../../repositories/factory.ts";
import {
  appendTimelineEvent,
  mapActionToStatus,
} from "../../../utils/domain.ts";

const actionTypes: ConfirmedActionType[] = [
  "dispatch",
  "replacement",
  "refund_review",
  "escalate",
  "close",
];

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const body = await readBody<{
    actionType?: ConfirmedActionType;
    note?: string;
  }>(event);
  const config = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: config.dataProvider,
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey
  });
  const ticket = await repo.getTicketById(id);

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: "Ticket not found" });
  }

  const actionType =
    body.actionType && actionTypes.includes(body.actionType)
      ? body.actionType
      : "escalate";

  const now = new Date().toISOString();

  // 根据 actionType 更新工单状态
  ticket.status = mapActionToStatus(actionType);
  ticket.confirmedAction = {
    type: actionType,
    note: body.note || "Human reviewer confirmed the AI action draft.",
    confirmedAt: now,
  };

  // 追加时间线事件
  const actionLabels: Record<ConfirmedActionType, string> = {
    dispatch: "坐席确认派工",
    replacement: "坐席确认换新审批",
    refund_review: "坐席确认退款复核",
    escalate: "坐席确认升级主管",
    close: "坐席关闭工单",
  };

  appendTimelineEvent(ticket, {
    at: now,
    type: "agent",
    title: actionLabels[actionType],
    detail: body.note || "人工确认执行动作，保留 AI 建议与证据引用。",
    actor: "坐席",
  });

  await repo.updateTicket(ticket);

  return ticket;
});
