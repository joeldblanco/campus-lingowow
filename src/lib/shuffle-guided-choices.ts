/** Stable per-question ordering prevents predictable answer positions and
 * avoids moving options while feedback or a retained response is displayed. */
export function shuffleGuidedChoices<T>(choices: readonly T[], questionId: string): T[] {
  let seed = 2166136261
  for (const character of questionId) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619)
  seed = seed >>> 0 || 1
  const ordered = [...choices]
  for (let index = ordered.length - 1; index > 0; index--) {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    const target = (seed >>> 0) % (index + 1)
    ;[ordered[index], ordered[target]] = [ordered[target], ordered[index]]
  }
  return ordered
}
