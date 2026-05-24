import { createRepository } from "../../repositories/factory.ts";
import { calculateAiQualityMetrics } from "../../utils/domain.ts";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: config.dataProvider,
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  });
  return calculateAiQualityMetrics(await repo.getStoreSnapshot());
});
