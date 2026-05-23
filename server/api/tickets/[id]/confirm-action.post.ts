import type { ConfirmedActionType } from '../../../../types/serviceops.ts'
import { getStore } from '../../../data/seed.ts'

const actionTypes: ConfirmedActionType[] = ['dispatch', 'replacement', 'refund_review', 'escalate', 'close']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody<{ actionType?: ConfirmedActionType; note?: string }>(event)
  const store = getStore()
  const ticket = store.tickets.find((item) => item.id === id)

  if (!ticket) {
    throw createError({ statusCode: 404, statusMessage: 'Ticket not found' })
  }

  const actionType = body.actionType && actionTypes.includes(body.actionType)
    ? body.actionType
    : 'escalate'

  ticket.status = 'confirmed'
  ticket.confirmedAction = {
    type: actionType,
    note: body.note || 'Human reviewer confirmed the AI action draft.',
    confirmedAt: new Date().toISOString()
  }

  return ticket
})
