'use client'

import { FilterSection } from '@/components/filters/filter-section'
import { Separator } from '@/components/ui/separator'

export function FilterSidebar() {
  return (
    <div className="space-y-6">
      <FilterSection
        title="Level"
        icon="graduation-cap"
        options={['Beginner', 'Intermediate', 'Advanced']}
        type="levels"
      />

      <Separator />

      <FilterSection
        title="Language"
        icon="globe"
        options={['Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Italian']}
        type="languages"
      />

      <Separator />

      <FilterSection
        title="Category"
        icon="book"
        options={['Language', 'Business', 'Travel', 'Academic']}
        type="categories"
      />
    </div>
  )
}
