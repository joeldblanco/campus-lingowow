import { useShopStore } from '@/stores/useShopStore'
import { useEffect, useState, useMemo } from 'react'
import { getProducts, getPlans } from '@/lib/actions/commercial'
import { Course, Merge, Product } from '@/types/shop'

export function useFilterCourses() {
  const filters = useShopStore((state) => state.filters)
  const searchQuery = useShopStore((state) => state.searchQuery)
  const sortBy = useShopStore((state) => state.sortBy)
  const priceRange = useShopStore((state) => state.priceRange)
  const currentPage = useShopStore((state) => state.currentPage)
  const itemsPerPage = useShopStore((state) => state.itemsPerPage)
  const [courses, setCourses] = useState<Array<Merge<Product, Course>>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true)
        const [products, plans] = await Promise.all([
          getProducts({ isActive: true }),
          getPlans()
        ])
        
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
          tags: product.tags || [],
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

  // Filter, sort and paginate courses
  const { filteredCourses, paginatedCourses, totalPages } = useMemo(() => {
    // 1. Filter courses
    let filtered = courses.filter((course) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          course.name.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.shortDesc?.toLowerCase().includes(query)
        
        if (!matchesSearch) return false
      }

      // Price range filter
      if (course.price < priceRange[0] || course.price > priceRange[1]) {
        return false
      }

      // Level filter
      if (filters.levels.length > 0 && !filters.levels.some((level) => course.levels.includes(level)))
        return false
      
      // Language filter
      if (filters.languages.length > 0 && !filters.languages.includes(course.language)) 
        return false
      
      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(course.category)) 
        return false
      
      // Tags filter
      if (filters.tags.length > 0) {
        const courseTags = course.tags || []
        const hasMatchingTag = filters.tags.some((tag) => courseTags.includes(tag))
        if (!hasMatchingTag) return false
      }
      
      return true
    })

    // 2. Sort courses
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    // 3. Paginate courses
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginated = filtered.slice(startIndex, endIndex)

    return {
      filteredCourses: filtered,
      paginatedCourses: paginated,
      totalPages,
    }
  }, [courses, searchQuery, priceRange, filters, sortBy, currentPage, itemsPerPage])

  return { 
    courses: paginatedCourses, 
    allCourses: filteredCourses,
    totalPages,
    totalResults: filteredCourses.length,
    loading 
  }
}
