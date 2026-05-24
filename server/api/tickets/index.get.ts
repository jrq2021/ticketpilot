import { createRepository } from "../../repositories/factory.ts";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: config.dataProvider,
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  });
  const store = await repo.getStoreSnapshot();

  return store.tickets.map((ticket) => ({
    ...ticket,
    customer: store.customers.find(
      (customer) => customer.id === ticket.customerId,
    ),
    product: store.products.find((product) => product.id === ticket.productId),
    recommendation: store.recommendations.find(
      (recommendation) => recommendation.ticketId === ticket.id,
    ),
    actionDraft: store.actionDrafts.find(
      (draft) => draft.ticketId === ticket.id,
    ),
  }));
});
