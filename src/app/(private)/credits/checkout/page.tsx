import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getCreditPackageById } from '@/lib/actions/credits'
import { CreditCheckoutForm } from '@/components/credits/credit-checkout-form'

interface PageProps {
  searchParams: Promise<{ packageId?: string }>
}

export default async function CreditCheckoutPage({ searchParams }: PageProps) {
  const session = await auth()
  const params = await searchParams

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const packageId = params.packageId

  if (!packageId) {
    redirect('/credits/buy')
  }

  const packageResult = await getCreditPackageById(packageId)

  if (!packageResult.success || !packageResult.data) {
    redirect('/credits/buy')
  }

  const pkg = packageResult.data

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Finalizar Compra</h1>
          <p className="text-muted-foreground mt-2">Completa tu compra de créditos</p>
        </div>

        <CreditCheckoutForm package={pkg} />
      </div>
    </div>
  )
}
