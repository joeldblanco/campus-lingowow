'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { KPIData } from '@/types/analytics'

interface KPICardProps {
  title: string
  data: KPIData
  format?: 'number' | 'currency' | 'percentage'
  icon?: React.ReactNode
  description?: string
  className?: string
}

export function KPICard({
  title,
  data,
  format = 'number',
  icon,
  description,
  className,
}: KPICardProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(value)
      case 'percentage':
        return `${value.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('es-PE').format(value)
    }
  }

  const TrendIcon = data.changeType === 'increase' 
    ? TrendingUp 
    : data.changeType === 'decrease' 
      ? TrendingDown 
      : Minus

  const trendColor = data.changeType === 'increase'
    ? 'text-green-600'
    : data.changeType === 'decrease'
      ? 'text-red-600'
      : 'text-gray-500'

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(data.value)}</div>
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm font-medium', trendColor)}>
            {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground ml-1">
            vs mes anterior
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface SimpleKPICardProps {
  title: string
  value: number | string
  format?: 'number' | 'currency' | 'percentage'
  icon?: React.ReactNode
  description?: string
  className?: string
  trend?: {
    value: number
    label?: string
  }
}

export function SimpleKPICard({
  title,
  value,
  format = 'number',
  icon,
  description,
  className,
  trend,
}: SimpleKPICardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-PE', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      default:
        return new Intl.NumberFormat('es-PE').format(val)
    }
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {trend.value >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={cn(
              'text-sm font-medium',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
            {trend.label && (
              <span className="text-xs text-muted-foreground ml-1">
                {trend.label}
              </span>
            )}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
