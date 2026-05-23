import { getStore } from '../../data/seed.ts'
import { calculateRoiMetrics } from '../../utils/domain.ts'

export default defineEventHandler(() => {
  return calculateRoiMetrics(getStore())
})
