export interface ActivityCompletion {
  completed: boolean
}

/**
 * Sequential prerequisite gating for a level's activities (ordered).
 *
 * Rule: the first activity is always unlocked; every subsequent activity
 * unlocks only once the immediately previous one (by order) is completed.
 *
 * Pure function so the gating rule can be unit-tested independently of the DB.
 * Trello card "Implementar los TODOs" — activity.ts:360.
 */
export function computeActivityLocks(activities: ActivityCompletion[]): boolean[] {
  return activities.map((_, index) => {
    if (index === 0) return false
    return !activities[index - 1].completed
  })
}
