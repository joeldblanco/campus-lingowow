import { describe, it, expect, beforeEach } from 'vitest'
import { useShopStore } from './useShopStore'
import type { CartItem } from '@/types/shop'

// Helper function to create mock products with all required fields for CartItem and Course compatibility
const createMockProduct = (id: string) => ({
  id,
  name: `Product ${id}`,
  title: `Product ${id}`, // Required for CartItem compatibility
  slug: `product-${id}`,
  description: 'Test product description',
  shortDesc: 'Test short description',
  price: 100,
  comparePrice: null,
  sku: `SKU-${id}`,
  image: 'test.jpg',
  images: ['test.jpg'],
  isActive: true,
  isDigital: true,
  stock: 999,
  categoryId: 'test-category-id',
  tags: ['test'],
  requiresScheduling: false,
  courseId: null,
  maxScheduleSlots: null,
  scheduleDuration: null,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  // Course fields for compatibility
  levels: ['BEGINNER'],
  language: 'es',
  category: 'test',
  // Payment fields
  pricingType: 'SINGLE_PRICE' as const,
  paymentType: 'ONE_TIME' as const,
  creditPrice: null,
  acceptsCredits: false,
  acceptsRealMoney: true,
})

const createMockPlan = (id: string, price: number = 100) => ({
  id,
  name: `Plan ${id}`,
  price,
  duration: 30,
  features: [],
})

const createMockCartItem = (productId: string, planId: string): CartItem => ({
  product: createMockProduct(productId),
  plan: createMockPlan(planId),
})

describe('useShopStore - Cart Management', () => {
  beforeEach(() => {
    // Reset store before each test
    useShopStore.setState({
      cart: [],
      filters: {
        levels: [],
        languages: [],
        categories: [],
        tags: [],
      },
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      currentPage: 1,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: {
        requiresAuth: false,
        redirectAfterAuth: false,
      },
    })
  })

  describe('addToCart', () => {
    it('should add item to empty cart', () => {
      const store = useShopStore.getState()
      const item = createMockCartItem('product-1', 'plan-1')

      store.addToCart(item)

      const state = useShopStore.getState()
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0].product.id).toBe('product-1')
      expect(state.cart[0].plan.id).toBe('plan-1')
    })

    it('should remove duplicate item when adding same product and plan', () => {
      const store = useShopStore.getState()
      const item = createMockCartItem('product-1', 'plan-1')

      store.addToCart(item)
      expect(useShopStore.getState().cart).toHaveLength(1)

      store.addToCart(item)
      expect(useShopStore.getState().cart).toHaveLength(0) // Removed duplicate
    })

    it('should replace plan when adding same product with different plan', () => {
      const store = useShopStore.getState()
      const item1 = createMockCartItem('product-1', 'plan-1')
      const item2 = createMockCartItem('product-1', 'plan-2')

      store.addToCart(item1)
      expect(useShopStore.getState().cart).toHaveLength(1)
      expect(useShopStore.getState().cart[0].plan.id).toBe('plan-1')

      store.addToCart(item2)
      const state = useShopStore.getState()
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0].plan.id).toBe('plan-2') // Replaced with new plan
    })

    it('should allow multiple different products in cart', () => {
      const store = useShopStore.getState()
      const item1 = createMockCartItem('product-1', 'plan-1')
      const item2 = createMockCartItem('product-2', 'plan-1')

      store.addToCart(item1)
      store.addToCart(item2)

      const state = useShopStore.getState()
      expect(state.cart).toHaveLength(2)
    })
  })

  describe('removeFromCart', () => {
    it('should remove specific item from cart', () => {
      const store = useShopStore.getState()
      const item = createMockCartItem('product-1', 'plan-1')

      store.addToCart(item)
      expect(useShopStore.getState().cart).toHaveLength(1)

      store.removeFromCart('product-1', 'plan-1')
      expect(useShopStore.getState().cart).toHaveLength(0)
    })

    it('should only remove matching product and plan combination', () => {
      const store = useShopStore.getState()
      const item1 = createMockCartItem('product-1', 'plan-1')
      const item2 = createMockCartItem('product-2', 'plan-1')

      store.addToCart(item1)
      store.addToCart(item2)
      expect(useShopStore.getState().cart).toHaveLength(2)

      store.removeFromCart('product-1', 'plan-1')
      const state = useShopStore.getState()
      expect(state.cart).toHaveLength(1)
      expect(state.cart[0].product.id).toBe('product-2')
    })

    it('should not affect cart when removing non-existent item', () => {
      const store = useShopStore.getState()
      const item = createMockCartItem('product-1', 'plan-1')

      store.addToCart(item)
      store.removeFromCart('product-999', 'plan-999')

      expect(useShopStore.getState().cart).toHaveLength(1)
    })
  })

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const store = useShopStore.getState()
      store.addToCart(createMockCartItem('product-1', 'plan-1'))
      store.addToCart(createMockCartItem('product-2', 'plan-1'))
      store.addToCart(createMockCartItem('product-3', 'plan-1'))

      expect(useShopStore.getState().cart).toHaveLength(3)

      store.clearCart()
      expect(useShopStore.getState().cart).toHaveLength(0)
    })

    it('should work on already empty cart', () => {
      const store = useShopStore.getState()
      expect(useShopStore.getState().cart).toHaveLength(0)

      store.clearCart()
      expect(useShopStore.getState().cart).toHaveLength(0)
    })
  })
})

describe('useShopStore - Filters', () => {
  beforeEach(() => {
    useShopStore.setState({
      cart: [],
      filters: {
        levels: [],
        languages: [],
        categories: [],
        tags: [],
      },
      currentPage: 1,
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: { requiresAuth: false, redirectAfterAuth: false },
    })
  })

  describe('toggleFilter', () => {
    it('should add filter when not present', () => {
      const store = useShopStore.getState()
      store.toggleFilter('levels', 'Beginner')

      const state = useShopStore.getState()
      expect(state.filters.levels).toContain('Beginner')
    })

    it('should remove filter when already present', () => {
      const store = useShopStore.getState()
      store.toggleFilter('levels', 'Beginner')
      expect(useShopStore.getState().filters.levels).toContain('Beginner')

      store.toggleFilter('levels', 'Beginner')
      expect(useShopStore.getState().filters.levels).not.toContain('Beginner')
    })

    it('should handle multiple filters of same type', () => {
      const store = useShopStore.getState()
      store.toggleFilter('languages', 'English')
      store.toggleFilter('languages', 'Spanish')

      const state = useShopStore.getState()
      expect(state.filters.languages).toHaveLength(2)
      expect(state.filters.languages).toContain('English')
      expect(state.filters.languages).toContain('Spanish')
    })

    it('should reset current page to 1 when toggling filter', () => {
      useShopStore.setState({ currentPage: 5 })

      const store = useShopStore.getState()
      store.toggleFilter('categories', 'Courses')

      expect(useShopStore.getState().currentPage).toBe(1)
    })

    it('should not affect other filter types', () => {
      const store = useShopStore.getState()
      store.toggleFilter('levels', 'Beginner')
      store.toggleFilter('languages', 'English')

      const state = useShopStore.getState()
      expect(state.filters.levels).toHaveLength(1)
      expect(state.filters.languages).toHaveLength(1)
      expect(state.filters.categories).toHaveLength(0)
    })
  })

  describe('clearFilters', () => {
    it('should clear all filters and reset search', () => {
      const store = useShopStore.getState()
      store.toggleFilter('levels', 'Beginner')
      store.toggleFilter('languages', 'English')
      store.setSearchQuery('test search')
      store.setPriceRange([100, 500])

      store.clearFilters()

      const state = useShopStore.getState()
      expect(state.filters.levels).toHaveLength(0)
      expect(state.filters.languages).toHaveLength(0)
      expect(state.filters.categories).toHaveLength(0)
      expect(state.filters.tags).toHaveLength(0)
      expect(state.searchQuery).toBe('')
      expect(state.priceRange).toEqual([0, 1000])
      expect(state.currentPage).toBe(1)
    })
  })
})

describe('useShopStore - Search and Sort', () => {
  beforeEach(() => {
    useShopStore.setState({
      cart: [],
      filters: { levels: [], languages: [], categories: [], tags: [] },
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      currentPage: 5,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: { requiresAuth: false, redirectAfterAuth: false },
    })
  })

  describe('setSearchQuery', () => {
    it('should update search query', () => {
      const store = useShopStore.getState()
      store.setSearchQuery('javascript course')

      expect(useShopStore.getState().searchQuery).toBe('javascript course')
    })

    it('should reset current page to 1', () => {
      useShopStore.setState({ currentPage: 5 })

      const store = useShopStore.getState()
      store.setSearchQuery('test')

      expect(useShopStore.getState().currentPage).toBe(1)
    })
  })

  describe('setSortBy', () => {
    it('should update sort option', () => {
      const store = useShopStore.getState()
      store.setSortBy('price-asc')

      expect(useShopStore.getState().sortBy).toBe('price-asc')
    })

    it('should handle all sort options', () => {
      const store = useShopStore.getState()
      const sortOptions = ['name-asc', 'name-desc', 'price-asc', 'price-desc', 'date-asc', 'date-desc'] as const

      sortOptions.forEach((option) => {
        store.setSortBy(option)
        expect(useShopStore.getState().sortBy).toBe(option)
      })
    })
  })

  describe('setPriceRange', () => {
    it('should update price range', () => {
      const store = useShopStore.getState()
      store.setPriceRange([50, 500])

      expect(useShopStore.getState().priceRange).toEqual([50, 500])
    })

    it('should reset current page to 1', () => {
      useShopStore.setState({ currentPage: 5 })

      const store = useShopStore.getState()
      store.setPriceRange([100, 300])

      expect(useShopStore.getState().currentPage).toBe(1)
    })
  })
})

describe('useShopStore - View and Pagination', () => {
  beforeEach(() => {
    useShopStore.setState({
      cart: [],
      filters: { levels: [], languages: [], categories: [], tags: [] },
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      currentPage: 1,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: { requiresAuth: false, redirectAfterAuth: false },
    })
  })

  describe('setViewMode', () => {
    it('should switch between grid and list view', () => {
      const store = useShopStore.getState()

      store.setViewMode('list')
      expect(useShopStore.getState().viewMode).toBe('list')

      store.setViewMode('grid')
      expect(useShopStore.getState().viewMode).toBe('grid')
    })
  })

  describe('setCurrentPage', () => {
    it('should update current page', () => {
      const store = useShopStore.getState()
      store.setCurrentPage(3)

      expect(useShopStore.getState().currentPage).toBe(3)
    })
  })
})

describe('useShopStore - Checkout and Compare', () => {
  beforeEach(() => {
    useShopStore.setState({
      cart: [],
      filters: { levels: [], languages: [], categories: [], tags: [] },
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      currentPage: 1,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: { requiresAuth: false, redirectAfterAuth: false },
    })
  })

  describe('setCheckoutInfo', () => {
    it('should update checkout info', () => {
      const store = useShopStore.getState()
      store.setCheckoutInfo({ requiresAuth: true })

      expect(useShopStore.getState().checkoutInfo.requiresAuth).toBe(true)
    })

    it('should merge with existing checkout info', () => {
      const store = useShopStore.getState()
      store.setCheckoutInfo({ requiresAuth: true })
      store.setCheckoutInfo({ redirectAfterAuth: true })

      const state = useShopStore.getState()
      expect(state.checkoutInfo.requiresAuth).toBe(true)
      expect(state.checkoutInfo.redirectAfterAuth).toBe(true)
    })
  })

  describe('setComparePlans', () => {
    it('should set product for plan comparison', () => {
      const store = useShopStore.getState()
      const product = {
        ...createMockProduct('product-1'),
        plans: [],
      }

      store.setComparePlans(product)

      expect(useShopStore.getState().comparePlans.product).toBe(product)
    })

    it('should clear comparison when null', () => {
      const store = useShopStore.getState()
      const product = {
        ...createMockProduct('product-1'),
        plans: [],
      }

      store.setComparePlans(product)
      store.setComparePlans(null)

      expect(useShopStore.getState().comparePlans.product).toBeNull()
    })
  })
})

describe('useShopStore - Getters', () => {
  beforeEach(() => {
    useShopStore.setState({
      cart: [],
      filters: { levels: [], languages: [], categories: [], tags: [] },
      searchQuery: '',
      sortBy: 'date-desc',
      viewMode: 'grid',
      priceRange: [0, 1000],
      currentPage: 1,
      itemsPerPage: 12,
      comparePlans: { product: null },
      checkoutInfo: { requiresAuth: false, redirectAfterAuth: false },
    })
  })

  describe('getRequiresAuth', () => {
    it('should return true when cart has a course', () => {
      const store = useShopStore.getState()
      const courseItem = createMockCartItem('product-1', 'plan-1')

      store.addToCart(courseItem)

      expect(store.getRequiresAuth()).toBe(true)
    })

    it('should return false when cart has only merchandise', () => {
      const store = useShopStore.getState()
      const merchItem = createMockCartItem('product-1', 'plan-1')

      store.addToCart(merchItem)

      expect(store.getRequiresAuth()).toBe(false)
    })

    it('should return false when cart is empty', () => {
      const store = useShopStore.getState()
      expect(store.getRequiresAuth()).toBe(false)
    })

    it('should return true when cart has mix of courses and merchandise', () => {
      const store = useShopStore.getState()
      const courseItem = createMockCartItem('product-1', 'plan-1')
      const merchItem = createMockCartItem('product-2', 'plan-1')

      store.addToCart(courseItem)
      store.addToCart(merchItem)

      expect(store.getRequiresAuth()).toBe(true)
    })
  })

  describe('getHasMerchandise', () => {
    it('should return true when cart has merchandise', () => {
      const store = useShopStore.getState()
      const merchItem = createMockCartItem('product-1', 'plan-1')

      store.addToCart(merchItem)

      expect(store.getHasMerchandise()).toBe(true)
    })

    it('should return false when cart has only courses', () => {
      const store = useShopStore.getState()
      const courseItem = createMockCartItem('product-1', 'plan-1')

      store.addToCart(courseItem)

      expect(store.getHasMerchandise()).toBe(false)
    })

    it('should return false when cart is empty', () => {
      const store = useShopStore.getState()
      expect(store.getHasMerchandise()).toBe(false)
    })

    it('should return true when cart has mix of courses and merchandise', () => {
      const store = useShopStore.getState()
      const courseItem = createMockCartItem('product-1', 'plan-1')
      const merchItem = createMockCartItem('product-2', 'plan-1')

      store.addToCart(courseItem)
      store.addToCart(merchItem)

      expect(store.getHasMerchandise()).toBe(true)
    })
  })
})
