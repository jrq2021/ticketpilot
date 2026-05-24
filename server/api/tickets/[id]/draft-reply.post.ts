import { createRepository } from "../../../repositories/factory.ts";
import { buildActionDraft, upsertActionDraft } from "../../../utils/domain.ts";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: config.dataProvider,
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey
  });
  const store = await repo.getStoreSnapshot();
  const id = getRouterParam(event, "id");
  const ticket = store.tickets.find((item) => item.id === id);

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: "Ticket not found" });
  }

  const recommendation = store.recommendations.find(
    (item) => item.ticketId === ticket.id,
  );

  if (!recommendation) {
    throw createError({
      statusCode: 409,
      statusMessage: "Run diagnose before drafting reply",
    });
  }

  const draft = buildActionDraft(ticket, recommendation);
  await upsertActionDraft(repo, draft);

  return draft;
});
