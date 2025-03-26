'use client'

import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { LucideIcon } from 'lucide-react'
import { GraduationCap, Globe, Book } from 'lucide-react'
import { useShopStore } from '@/stores/useShopStore'

const iconMap: Record<string, LucideIcon> = {
  'graduation-cap': GraduationCap,
  globe: Globe,
  book: Book,
}

interface FilterSectionProps {
  title: string
  icon: keyof typeof iconMap
  options: string[]
  type: 'levels' | 'languages' | 'categories'
}

export function FilterSection({ title, icon, options, type }: FilterSectionProps) {
  const IconComponent = iconMap[icon]
  const filters = useShopStore((state) => state.filters[type])
  const toggleFilter = useShopStore((state) => state.toggleFilter)

  return (
    <div>
      <h3 className="font-medium mb-3 flex items-center">
        <IconComponent className="h-4 w-4 mr-2" />
        {title}
      </h3>
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${type}-${option.toLowerCase()}`}
              checked={filters.includes(option)}
              onCheckedChange={() => toggleFilter(type, option)}
            />
            <Label
              htmlFor={`${type}-${option.toLowerCase()}`}
              className="text-sm font-normal cursor-pointer hover:text-primary transition-colors"
            >
              {option}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}
