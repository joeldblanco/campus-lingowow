'use client'

import { Badge } from '@/components/ui/badge'
import { Coins, DollarSign } from 'lucide-react'

interface ProductPriceDisplayProps {
  price: number
  creditPrice?: number | null
  acceptsCredits?: boolean
  acceptsRealMoney?: boolean
  comparePrice?: number | null
  size?: 'sm' | 'md' | 'lg'
}

export function ProductPriceDisplay({
  price,
  creditPrice,
  acceptsCredits = false,
  acceptsRealMoney = true,
  comparePrice,
  size = 'md',
}: ProductPriceDisplayProps) {
  const sizeClasses = {
    sm: {
      price: 'text-xl',
      credit: 'text-lg',
      compare: 'text-sm',
      icon: 'h-4 w-4',
    },
    md: {
      price: 'text-2xl',
      credit: 'text-xl',
      compare: 'text-base',
      icon: 'h-5 w-5',
    },
    lg: {
      price: 'text-3xl',
      credit: 'text-2xl',
      compare: 'text-lg',
      icon: 'h-6 w-6',
    },
  }

  const classes = sizeClasses[size]

  return (
    <div className="space-y-2">
      {/* Precio en dinero real */}
      {acceptsRealMoney && (
        <div className="flex items-baseline gap-2">
          <DollarSign className={classes.icon} />
          <div className="flex items-baseline gap-2">
            <span className={`font-bold ${classes.price}`}>${price}</span>
            {comparePrice && comparePrice > price && (
              <span className={`line-through text-muted-foreground ${classes.compare}`}>
                ${comparePrice}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Precio en créditos */}
      {acceptsCredits && creditPrice && (
        <div className="flex items-baseline gap-2">
          <Coins className={`${classes.icon} text-yellow-500`} />
          <div className="flex items-baseline gap-2">
            <span className={`font-bold text-yellow-600 dark:text-yellow-500 ${classes.credit}`}>
              {creditPrice} créditos
            </span>
          </div>
        </div>
      )}

      {/* Badge de opciones de pago */}
      {acceptsCredits && acceptsRealMoney && (
        <Badge variant="secondary" className="text-xs">
          Acepta dinero y créditos
        </Badge>
      )}
      {acceptsCredits && !acceptsRealMoney && (
        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
          Solo créditos
        </Badge>
      )}
    </div>
  )
}
