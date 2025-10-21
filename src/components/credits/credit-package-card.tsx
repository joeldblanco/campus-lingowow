'use client'

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, Gift, Star } from 'lucide-react'

interface CreditPackage {
  id: string
  name: string
  description: string | null
  credits: number
  price: number
  bonusCredits: number
  isPopular: boolean
}

interface CreditPackageCardProps {
  package: CreditPackage
  onPurchase: (packageId: string) => void
  isLoading?: boolean
}

export function CreditPackageCard({ package: pkg, onPurchase, isLoading }: CreditPackageCardProps) {
  const totalCredits = pkg.credits + pkg.bonusCredits
  const creditsPerDollar = (totalCredits / pkg.price).toFixed(1)

  return (
    <Card className={`relative ${pkg.isPopular ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
      {pkg.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-blue-500 text-white">
            <Star className="h-3 w-3 mr-1" />
            Más Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">{pkg.name}</CardTitle>
        {pkg.description && (
          <p className="text-sm text-muted-foreground mt-2">{pkg.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold">{pkg.credits}</span>
            <Coins className="h-6 w-6 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground mt-1">créditos base</p>
        </div>

        {pkg.bonusCredits > 0 && (
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
              <Gift className="h-5 w-5" />
              <span className="font-semibold">+{pkg.bonusCredits} créditos bonus</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">¡Regalo especial!</p>
          </div>
        )}

        <div className="border-t pt-4">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-3xl font-bold">${pkg.price}</span>
            <span className="text-sm text-muted-foreground">USD</span>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {creditsPerDollar} créditos por dólar
          </p>
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total de créditos:</span>
            <span className="font-bold text-lg">{totalCredits}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="lg"
          onClick={() => onPurchase(pkg.id)}
          disabled={isLoading}
        >
          {isLoading ? 'Procesando...' : 'Comprar Ahora'}
        </Button>
      </CardFooter>
    </Card>
  )
}
