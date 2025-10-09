'use client'

import { FilterSection } from '@/components/filters/filter-section'
import { PriceRangeFilter } from '@/components/filters/price-range-filter'
import { Separator } from '@/components/ui/separator'
import { useEffect, useState } from 'react'
import { getCategories, getAllProductTags } from '@/lib/actions/commercial'
import { Skeleton } from '@/components/ui/skeleton'

export function FilterSidebar() {
  const [categories, setCategories] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [categoriesData, tagsData] = await Promise.all([
          getCategories(),
          getAllProductTags(),
        ])
        
        setCategories(categoriesData.filter(c => c.isActive).map(c => c.name))
        setTags(tagsData)
      } catch (error) {
        console.error('Error loading filters:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFilters()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PriceRangeFilter />

      <Separator />

      <FilterSection
        title="Nivel"
        icon="graduation-cap"
        options={['Principiante', 'Intermedio', 'Avanzado']}
        type="levels"
      />

      <Separator />

      {categories.length > 0 && (
        <>
          <FilterSection
            title="Categoría"
            icon="book"
            options={categories}
            type="categories"
          />
          <Separator />
        </>
      )}

      {tags.length > 0 && (
        <FilterSection
          title="Etiquetas"
          icon="tag"
          options={tags}
          type="tags"
        />
      )}
    </div>
  )
}
