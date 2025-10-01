'use client'

import { FilterSection } from '@/components/filters/filter-section'
import { Separator } from '@/components/ui/separator'

export function FilterSidebar() {
  return (
    <div className="space-y-6">
      <FilterSection
        title="Nivel"
        icon="graduation-cap"
        options={['Principiante', 'Intermedio', 'Avanzado']}
        type="levels"
      />

      <Separator />

      <FilterSection
        title="Idioma"
        icon="globe"
        options={['Inglés', 'Español']}
        type="languages"
      />

      <Separator />

      <FilterSection
        title="Categoría"
        icon="book"
        options={['Idiomas', 'Negocios', 'Viajes', 'Académico']}
        type="categories"
      />
    </div>
  )
}
