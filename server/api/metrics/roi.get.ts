import { createRepository } from "../../repositories/factory.ts";
import { calculateRoiMetrics } from "../../utils/domain.ts";

export default defineEventHandler(async () => {
  const config = useRuntimeConfig();
  const repo = createRepository({
    dataProvider: config.dataProvider,
    supabaseUrl: config.supabaseUrl,
    supabaseServiceRoleKey: config.supabaseServiceRoleKey,
  });
  return calculateRoiMetrics(await repo.getStoreSnapshot());
});
