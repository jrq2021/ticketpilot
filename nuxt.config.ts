export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: true },
  css: ["element-plus/dist/index.css", "~/assets/css/main.css"],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
    // Supabase (optional — falls back to memory if not configured)
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    // Data provider: "memory" | "supabase"
    dataProvider: process.env.DATA_PROVIDER || "memory",
    public: {
      aiProvider: process.env.NUXT_PUBLIC_AI_PROVIDER || "mock",
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});
