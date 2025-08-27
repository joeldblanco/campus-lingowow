import { useShopStore } from '@/stores/useShopStore'
import { useEffect, useState } from 'react'
import { getProducts, getPlans } from '@/lib/actions/commercial'
import { Course } from '@/types/shop'

export function useFilterCourses() {
  const filters = useShopStore((state) => state.filters)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const [products, plans] = await Promise.all([getProducts(), getPlans()])
        
        // Transform database products to Course format
        const transformedCourses: Course[] = products.map((product) => ({
          id: product.id,
          title: product.name,
          description: product.description || '',
          levels: ['Principiante', 'Intermedio', 'Avanzado'], // Default levels
          language: product.category?.name || 'General',
          category: product.category?.name || 'General',
          image: product.image || '/media/images/default-course.png',
          plans: plans
            .filter((plan) => plan.isActive)
            .slice(0, 3) // Take first 3 active plans as default
            .map((plan) => ({
              id: plan.id,
              name: plan.name,
              price: plan.price,
              features: [], // Will be populated when plan features are loaded
            })),
        }))
        
        setCourses(transformedCourses)
      } catch (error) {
        console.error('Error loading courses:', error)
        setCourses([])
      } finally {
        setLoading(false)
      }
    }

    loadCourses()
  }, [])

  const filteredCourses = courses.filter((course) => {
    if (filters.levels.length > 0 && !filters.levels.some((level) => course.levels.includes(level)))
      return false
    if (filters.languages.length > 0 && !filters.languages.includes(course.language)) return false
    if (filters.categories.length > 0 && !filters.categories.includes(course.category)) return false
    return true
  })

  return { courses: filteredCourses, loading }
}
