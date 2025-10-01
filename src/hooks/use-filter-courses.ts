import { useShopStore } from '@/stores/useShopStore'
import { useEffect, useState } from 'react'
import { getProducts, getPlans } from '@/lib/actions/commercial'
import { Course, Merge, Product } from '@/types/shop'

export function useFilterCourses() {
  const filters = useShopStore((state) => state.filters)
  const [courses, setCourses] = useState<Array<Merge<Product, Course>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const [products, plans] = await Promise.all([getProducts(), getPlans()])
        
        // Transform database products to merged Product & Course format
        const transformedCourses: Array<Merge<Product, Course>> = products.map((product) => ({
          // Product fields
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || '',
          shortDesc: product.shortDesc,
          price: product.price,
          comparePrice: product.comparePrice,
          sku: product.sku,
          image: product.image || '/media/images/default-course.png',
          images: product.images,
          isActive: product.isActive,
          isDigital: product.isDigital,
          stock: product.stock,
          categoryId: product.categoryId,
          requiresScheduling: product.requiresScheduling,
          courseId: product.courseId,
          maxScheduleSlots: product.maxScheduleSlots,
          scheduleDuration: product.scheduleDuration,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          // Course fields
          title: product.name,
          levels: ['Principiante', 'Intermedio', 'Avanzado'],
          language: product.category?.name || 'General',
          category: product.category?.name || 'General',
          plans: plans
            .filter((plan) => plan.isActive && plan.productId === product.id)
            .map((plan) => ({
              id: plan.id,
              name: plan.name,
              slug: plan.slug,
              description: plan.description,
              price: plan.price,
              comparePrice: plan.comparePrice,
              duration: plan.duration,
              isActive: plan.isActive,
              isPopular: plan.isPopular,
              sortOrder: plan.sortOrder,
              productId: plan.productId,
              createdAt: plan.createdAt,
              updatedAt: plan.updatedAt,
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
