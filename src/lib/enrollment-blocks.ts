/**
 * Shared logic for card #140: an admin must not be able to create an enrollment
 * without selecting the number of schedule "blocks" (time slots) the purchased
 * plan includes.
 *
 * The required count comes from the matched Plan:
 *  - recurring weekly schedules  -> classesPerWeek
 *  - one-off (non-recurring)      -> classesPerPeriod
 *
 * Returns null when there is no enforceable requirement (plan unknown, plan does
 * not include classes, or no positive count is configured), so callers simply
 * skip validation in those cases.
 */
export interface EnrollmentPlanBlocks {
  includesClasses?: boolean | null
  classesPerWeek?: number | null
  classesPerPeriod?: number | null
}

export function getRequiredScheduleBlocks(
  plan: EnrollmentPlanBlocks | null | undefined,
  isRecurring: boolean
): number | null {
  if (!plan || !plan.includesClasses) return null

  const primary = isRecurring ? plan.classesPerWeek : plan.classesPerPeriod
  const fallback = isRecurring ? plan.classesPerPeriod : plan.classesPerWeek
  const required = primary ?? fallback

  return typeof required === 'number' && required > 0 ? required : null
}

/**
 * Returns an error message when the selected block count does not meet the
 * plan's requirement, or null when the selection is acceptable (or there is no
 * requirement to enforce).
 */
export function validateScheduleBlocks(
  selectedCount: number,
  plan: EnrollmentPlanBlocks | null | undefined,
  isRecurring: boolean
): string | null {
  const required = getRequiredScheduleBlocks(plan, isRecurring)
  if (required === null) return null
  if (selectedCount >= required) return null

  const unit = isRecurring ? 'bloques semanales' : 'bloques'
  return `El plan requiere ${required} ${unit} de horario, pero solo seleccionaste ${selectedCount}. Selecciona los ${required} bloques requeridos para crear la inscripción.`
}
