import { createRepository } from "../../../repositories/factory.ts";
import { createAiProvider } from "../../../utils/ai.ts";
import {
  findPolicyForProduct,
  searchKnowledge,
  upsertRecommendation,
} from "../../../utils/domain.ts";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  const runtimeConfig = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: runtimeConfig.dataProvider,
    supabaseUrl: runtimeConfig.supabaseUrl,
    supabaseServiceRoleKey: runtimeConfig.supabaseServiceRoleKey,
  });
  const store = await repo.getStoreSnapshot();
  const ticket = store.tickets.find((item) => item.id === id);

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: "Ticket not found" });
  }

  const product = store.products.find((item) => item.id === ticket.productId);
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: "Product not found" });
  }

  const policy = findPolicyForProduct(product, store.policies);
  const { evidence, retrievalTrace } = searchKnowledge(
    ticket,
    product,
    store.knowledgeDocs,
  );

  const result = await createAiProvider({
    provider: runtimeConfig.public.aiProvider,
    apiKey: runtimeConfig.openaiApiKey,
    baseUrl: runtimeConfig.openaiBaseUrl,
    model: runtimeConfig.openaiModel,
  }).diagnose({ ticket, product, policy, evidence, retrievalTrace });

  await upsertRecommendation(repo, result.recommendation);

  return result;
});
