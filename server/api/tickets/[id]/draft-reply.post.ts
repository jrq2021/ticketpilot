import { getStore } from '../../../data/seed.ts'
import { buildActionDraft, upsertActionDraft } from '../../../utils/domain.ts'

export default defineEventHandler((event) => {
  const store = getStore()
  const id = getRouterParam(event, 'id')
  const ticket = store.tickets.find((item) => item.id === id)

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket not found' })
  }

  const recommendation = store.recommendations.find((item) => item.ticketId === ticket.id)

  if (!recommendation) {
    throw createError({ statusCode: 409, statusMessage: 'Run diagnose before drafting reply' })
  }

  const draft = buildActionDraft(ticket, recommendation)
  upsertActionDraft(store, draft)

  return draft
})
