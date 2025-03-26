import { useShopStore } from '@/stores/useShopStore'
import { courses } from '@/lib/data'

export function useFilterCourses() {
  const filters = useShopStore((state) => state.filters)

  const filteredCourses = courses.filter((course) => {
    if (filters.levels.length > 0 && !filters.levels.some((level) => course.levels.includes(level)))
      return false
    if (filters.languages.length > 0 && !filters.languages.includes(course.language)) return false
    if (filters.categories.length > 0 && !filters.categories.includes(course.category)) return false
    return true
  })

  return filteredCourses
}
