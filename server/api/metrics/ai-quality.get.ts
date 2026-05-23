import { getStore } from '../../data/seed.ts'
import { calculateAiQualityMetrics } from '../../utils/domain.ts'

export default defineEventHandler(() => {
  return calculateAiQualityMetrics(getStore())
})
