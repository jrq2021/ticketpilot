import { getStore } from '../../data/seed.ts'

export default defineEventHandler(() => {
  const store = getStore()

  return store.tickets.map((ticket) => ({
    ...ticket,
    customer: store.customers.find((customer) => customer.id === ticket.customerId),
    product: store.products.find((product) => product.id === ticket.productId),
    recommendation: store.recommendations.find((recommendation) => recommendation.ticketId === ticket.id),
    actionDraft: store.actionDrafts.find((draft) => draft.ticketId === ticket.id)
  }))
})
