export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  css: [
    'element-plus/dist/index.css',
    '~/assets/css/main.css'
  ],
  runtimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    public: {
      aiProvider: process.env.NUXT_PUBLIC_AI_PROVIDER || 'mock'
    }
  },
  typescript: {
    strict: true,
    typeCheck: false
  }
})
