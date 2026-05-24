import type { ServiceOpsRepository } from "./serviceops.repository.ts";
import { MemoryRepository } from "./memory.repository.ts";
import { SupabaseRepository } from "./supabase.repository.ts";

let cachedRepo: ServiceOpsRepository | null = null;

export interface RepositoryConfig {
  dataProvider?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
}

export function createRepository(
  config?: RepositoryConfig,
): ServiceOpsRepository {
  if (cachedRepo) return cachedRepo;

  // 优先使用传入的 config，fallback 到 process.env（兼容测试和本地开发）
  const provider = (
    config?.dataProvider ||
    process.env.DATA_PROVIDER ||
    "memory"
  ).toLowerCase();

  if (provider === "supabase") {
    const url = config?.supabaseUrl || process.env.SUPABASE_URL || "";
    const key =
      config?.supabaseServiceRoleKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "";

    if (!url || !key) {
      console.warn(
        "[ServiceOps] DATA_PROVIDER=supabase but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Falling back to memory.",
      );
      cachedRepo = new MemoryRepository();
      return cachedRepo;
    }

    console.log("[ServiceOps] Using Supabase repository");
    cachedRepo = new SupabaseRepository({ url, serviceRoleKey: key });
    return cachedRepo;
  }

  console.log("[ServiceOps] Using Memory repository");
  cachedRepo = new MemoryRepository();
  return cachedRepo;
}
