'use client'

import { useState } from 'react'
import { Book, ChevronUp, Globe, GraduationCap, Menu, ShoppingCart, X } from 'lucide-react'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

// Types
type Course = {
  id: string
  title: string
  description: string
  level: string
  language: string
  category: string
  image: string
  plans: Plan[]
}

type Plan = {
  id: string
  name: string
  price: number
  features: string[]
}

type CartItem = {
  courseId: string
  courseTitle: string
  planId: string
  planName: string
  price: number
}

// Sample data
const courses: Course[] = [
  {
    id: 'spanish-101',
    title: 'Spanish for Beginners',
    description: 'Learn the basics of Spanish with our comprehensive beginner course.',
    level: 'Beginner',
    language: 'Spanish',
    category: 'Language',
    image: '/placeholder.svg?height=200&width=300',
    plans: [
      {
        id: 'spanish-101-basic',
        name: 'Basic',
        price: 49.99,
        features: ['3-month access', '10 lessons', 'Basic exercises', 'Email support'],
      },
      {
        id: 'spanish-101-standard',
        name: 'Standard',
        price: 89.99,
        features: [
          '6-month access',
          '20 lessons',
          'Interactive exercises',
          'Email & chat support',
          '1 live session per month',
        ],
      },
      {
        id: 'spanish-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          '12-month access',
          'All lessons',
          'Advanced exercises',
          'Priority support',
          '4 live sessions per month',
          'Certificate of completion',
        ],
      },
    ],
  },
  {
    id: 'french-101',
    title: 'French Essentials',
    description: 'Master the essentials of French language and culture.',
    level: 'Beginner',
    language: 'French',
    category: 'Language',
    image: '/placeholder.svg?height=200&width=300',
    plans: [
      {
        id: 'french-101-basic',
        name: 'Basic',
        price: 49.99,
        features: ['3-month access', '10 lessons', 'Basic exercises', 'Email support'],
      },
      {
        id: 'french-101-standard',
        name: 'Standard',
        price: 89.99,
        features: [
          '6-month access',
          '20 lessons',
          'Interactive exercises',
          'Email & chat support',
          '1 live session per month',
        ],
      },
      {
        id: 'french-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          '12-month access',
          'All lessons',
          'Advanced exercises',
          'Priority support',
          '4 live sessions per month',
          'Certificate of completion',
        ],
      },
    ],
  },
  {
    id: 'german-101',
    title: 'German Foundations',
    description: 'Build a solid foundation in German language skills.',
    level: 'Beginner',
    language: 'German',
    category: 'Language',
    image: '/placeholder.svg?height=200&width=300',
    plans: [
      {
        id: 'german-101-basic',
        name: 'Basic',
        price: 49.99,
        features: ['3-month access', '10 lessons', 'Basic exercises', 'Email support'],
      },
      {
        id: 'german-101-standard',
        name: 'Standard',
        price: 89.99,
        features: [
          '6-month access',
          '20 lessons',
          'Interactive exercises',
          'Email & chat support',
          '1 live session per month',
        ],
      },
      {
        id: 'german-101-premium',
        name: 'Premium',
        price: 149.99,
        features: [
          '12-month access',
          'All lessons',
          'Advanced exercises',
          'Priority support',
          '4 live sessions per month',
          'Certificate of completion',
        ],
      },
    ],
  },
  {
    id: 'japanese-101',
    title: 'Japanese Fundamentals',
    description: 'Learn the fundamentals of Japanese language and writing systems.',
    level: 'Beginner',
    language: 'Japanese',
    category: 'Language',
    image: '/placeholder.svg?height=200&width=300',
    plans: [
      {
        id: 'japanese-101-basic',
        name: 'Basic',
        price: 59.99,
        features: ['3-month access', '10 lessons', 'Basic exercises', 'Email support'],
      },
      {
        id: 'japanese-101-standard',
        name: 'Standard',
        price: 99.99,
        features: [
          '6-month access',
          '20 lessons',
          'Interactive exercises',
          'Email & chat support',
          '1 live session per month',
        ],
      },
      {
        id: 'japanese-101-premium',
        name: 'Premium',
        price: 169.99,
        features: [
          '12-month access',
          'All lessons',
          'Advanced exercises',
          'Priority support',
          '4 live sessions per month',
          'Certificate of completion',
        ],
      },
    ],
  },
]

export default function ShopPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [filters, setFilters] = useState({
    levels: [] as string[],
    languages: [] as string[],
    categories: [] as string[],
  })
  const [comparePlans, setComparePlans] = useState<{ course: Course | null }>({ course: null })
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  // Filter courses based on selected filters
  const filteredCourses = courses.filter((course) => {
    if (filters.levels.length > 0 && !filters.levels.includes(course.level)) return false
    if (filters.languages.length > 0 && !filters.languages.includes(course.language)) return false
    if (filters.categories.length > 0 && !filters.categories.includes(course.category)) return false
    return true
  })

  // Toggle filter selection
  const toggleFilter = (type: 'levels' | 'languages' | 'categories', value: string) => {
    setFilters((prev) => {
      const current = [...prev[type]]
      if (current.includes(value)) {
        return { ...prev, [type]: current.filter((item) => item !== value) }
      } else {
        return { ...prev, [type]: [...current, value] }
      }
    })
  }

  // Add item to cart
  const addToCart = (course: Course, plan: Plan) => {
    const newItem: CartItem = {
      courseId: course.id,
      courseTitle: course.title,
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(
      (item) => item.courseId === course.id && item.planId === plan.id
    )

    if (existingItemIndex >= 0) {
      // Item already in cart, remove it
      setCart((prev) => prev.filter((_, index) => index !== existingItemIndex))
    } else {
      // Add new item to cart
      setCart((prev) => [...prev, newItem])
    }
  }

  // Remove item from cart
  const removeFromCart = (courseId: string, planId: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.courseId === courseId && item.planId === planId))
    )
  }

  // Check if item is in cart
  const isInCart = (courseId: string, planId: string) => {
    return cart.some((item) => item.courseId === courseId && item.planId === planId)
  }

  // Calculate total price
  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="py-4">
                  <FilterSidebar filters={filters} toggleFilter={toggleFilter} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold">Language Academy</h1>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                    {cart.length}
                  </Badge>
                )}
                <span className="sr-only">Open cart</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[350px] sm:w-[450px]">
              <SheetHeader>
                <SheetTitle>Your Cart</SheetTitle>
              </SheetHeader>
              <div className="mt-8">
                {cart.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">Your cart is empty</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add courses to your cart to get started.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={`${item.courseId}-${item.planId}`}
                        className="flex justify-between items-start border-b pb-4"
                      >
                        <div>
                          <h3 className="font-medium">{item.courseTitle}</h3>
                          <p className="text-sm text-muted-foreground">{item.planName} Plan</p>
                          <p className="font-medium mt-1">${item.price.toFixed(2)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.courseId, item.planId)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    ))}

                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-lg mt-4">
                        <span>Total</span>
                        <span>${totalPrice.toFixed(2)}</span>
                      </div>
                      <Button className="w-full mt-6">Checkout</Button>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="container py-6 grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar - Hidden on mobile */}
        <aside className="hidden md:block">
          <FilterSidebar filters={filters} toggleFilter={toggleFilter} />
        </aside>

        {/* Main content */}
        <main>
          <h2 className="text-2xl font-bold mb-6">Available Courses</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative h-48">
                    <Image
                      src={course.image || '/placeholder.svg'}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{course.title}</CardTitle>
                      <CardDescription className="mt-2">{course.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {course.level}
                    </Badge>
                  </div>

                  <div className="flex items-center mt-4 text-sm text-muted-foreground">
                    <Globe className="h-4 w-4 mr-1" />
                    <span>{course.language}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col p-0">
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedCourse === course.id ? course.id : undefined}
                    onValueChange={(value) => setExpandedCourse(value)}
                    className="w-full"
                  >
                    <AccordionItem value={course.id} className="border-t border-b-0">
                      <AccordionTrigger className="py-4 px-6">
                        <span>View Plans</span>
                      </AccordionTrigger>
                      <AccordionContent className="px-6 pb-4">
                        <div className="grid grid-cols-1 gap-4">
                          {course.plans.map((plan) => (
                            <div key={plan.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-center">
                                <h4 className="font-medium">{plan.name}</h4>
                                <span className="font-bold">${plan.price.toFixed(2)}</span>
                              </div>
                              <ul className="mt-2 space-y-1">
                                {plan.features.slice(0, 3).map((feature, index) => (
                                  <li key={index} className="text-sm flex items-start">
                                    <ChevronUp className="h-4 w-4 mr-1 text-primary shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                  </li>
                                ))}
                                {plan.features.length > 3 && (
                                  <li className="text-sm text-muted-foreground">
                                    +{plan.features.length - 3} more features
                                  </li>
                                )}
                              </ul>
                              <div className="mt-4 flex justify-between items-center">
                                <Button
                                  variant={isInCart(course.id, plan.id) ? 'destructive' : 'default'}
                                  onClick={() => addToCart(course, plan)}
                                >
                                  {isInCart(course.id, plan.id)
                                    ? 'Remove from Cart'
                                    : 'Add to Cart'}
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            className="mt-2"
                            onClick={() => setComparePlans({ course })}
                          >
                            Compare Plans
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Coming Soon Section */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Coming Soon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {[1, 2].map((_, index) => (
                <Card key={index} className="overflow-hidden">
                  <CardHeader className="p-0">
                    <Skeleton className="h-48 w-full rounded-none" />
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex items-center mt-4">
                      <Skeleton className="h-4 w-24 mr-2" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Compare Plans Sheet */}
      <Sheet
        open={comparePlans.course !== null}
        onOpenChange={(open) => !open && setComparePlans({ course: null })}
      >
        <SheetContent side="right" className="w-[90vw] sm:w-[600px] max-w-full">
          <SheetHeader>
            <SheetTitle>Compare Plans</SheetTitle>
          </SheetHeader>
          {comparePlans.course && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">{comparePlans.course.title}</h3>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b"></th>
                      {comparePlans.course.plans.map((plan) => (
                        <th key={plan.id} className="text-left p-2 border-b font-medium">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border-b font-medium">Price</td>
                      {comparePlans.course.plans.map((plan) => (
                        <td key={plan.id} className="p-2 border-b">
                          ${plan.price.toFixed(2)}
                        </td>
                      ))}
                    </tr>

                    {/* Combine all features from all plans */}
                    {Array.from(
                      new Set(comparePlans.course.plans.flatMap((plan) => plan.features))
                    ).map(
                      (feature, index) =>
                        comparePlans.course && (
                          <tr key={index}>
                            <td className="p-2 border-b font-medium">{feature}</td>
                            {comparePlans.course.plans.map((plan) => (
                              <td key={plan.id} className="p-2 border-b">
                                {plan.features.includes(feature) ? (
                                  <ChevronUp className="h-5 w-5 text-primary" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground" />
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                    )}

                    <tr>
                      <td className="p-2 pt-4"></td>
                      {comparePlans.course.plans.map((plan) => (
                        <td key={plan.id} className="p-2 pt-4">
                          <Button
                            variant={
                              isInCart(comparePlans.course!.id, plan.id) ? 'destructive' : 'default'
                            }
                            onClick={() => addToCart(comparePlans.course!, plan)}
                            className="w-full"
                          >
                            {isInCart(comparePlans.course!.id, plan.id) ? 'Remove' : 'Add to Cart'}
                          </Button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Filter Sidebar Component
function FilterSidebar({
  filters,
  toggleFilter,
}: {
  filters: {
    levels: string[]
    languages: string[]
    categories: string[]
  }
  toggleFilter: (type: 'levels' | 'languages' | 'categories', value: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3 flex items-center">
          <GraduationCap className="h-4 w-4 mr-2" />
          Level
        </h3>
        <div className="space-y-2">
          {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
            <div key={level} className="flex items-center space-x-2">
              <Checkbox
                id={`level-${level}`}
                checked={filters.levels.includes(level)}
                onCheckedChange={() => toggleFilter('levels', level)}
              />
              <Label htmlFor={`level-${level}`} className="text-sm font-normal cursor-pointer">
                {level}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3 flex items-center">
          <Globe className="h-4 w-4 mr-2" />
          Language
        </h3>
        <div className="space-y-2">
          {['Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Italian'].map((language) => (
            <div key={language} className="flex items-center space-x-2">
              <Checkbox
                id={`language-${language}`}
                checked={filters.languages.includes(language)}
                onCheckedChange={() => toggleFilter('languages', language)}
              />
              <Label
                htmlFor={`language-${language}`}
                className="text-sm font-normal cursor-pointer"
              >
                {language}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="font-medium mb-3 flex items-center">
          <Book className="h-4 w-4 mr-2" />
          Category
        </h3>
        <div className="space-y-2">
          {['Language', 'Business', 'Travel', 'Academic'].map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category}`}
                checked={filters.categories.includes(category)}
                onCheckedChange={() => toggleFilter('categories', category)}
              />
              <Label
                htmlFor={`category-${category}`}
                className="text-sm font-normal cursor-pointer"
              >
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
