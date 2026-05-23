import { getStore } from '../../../data/seed.ts'
import { createAiProvider } from '../../../utils/ai.ts'
import { findPolicyForProduct, searchKnowledge, upsertRecommendation } from '../../../utils/domain.ts'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === id)

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket not found' })
  }

  const product = store.products.find((item) => item.id === ticket.productId)
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Product not found' })
  }

  const policy = findPolicyForProduct(product, store.policies)
  const evidence = searchKnowledge(ticket, product, store.knowledgeDocs)
  const runtimeConfig = useRuntimeConfig()
  const provider = createAiProvider({
    provider: runtimeConfig.public.aiProvider,
    apiKey: runtimeConfig.openaiApiKey,
    baseUrl: runtimeConfig.openaiBaseUrl,
    model: runtimeConfig.openaiModel
  })
  const recommendation = await provider.diagnose({ ticket, product, policy, evidence })

  upsertRecommendation(store, recommendation)

  return recommendation
})
