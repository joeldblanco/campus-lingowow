'use client'

import { useState } from 'react'
import { CreditPackageCard } from './credit-package-card'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface CreditPackage {
  id: string
  name: string
  description: string | null
  credits: number
  price: number
  bonusCredits: number
  isPopular: boolean
}

interface CreditPackagePurchaseButtonProps {
  package: CreditPackage
}

export function CreditPackagePurchaseButton({
  package: pkg,
}: CreditPackagePurchaseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handlePurchase = async (packageId: string) => {
    setIsLoading(true)
    try {
      // Redirigir al checkout con el paquete de créditos
      router.push(`/credits/checkout?packageId=${packageId}`)
    } catch (error) {
      console.error('Error initiating purchase:', error)
      toast.error('Error al iniciar la compra')
      setIsLoading(false)
    }
  }

  return <CreditPackageCard package={pkg} onPurchase={handlePurchase} isLoading={isLoading} />
}
