import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getCreditPackages, getUserCreditBalance } from '@/lib/actions/credits'
import { CreditBalanceCard } from '@/components/credits/credit-balance-card'
import { CreditPackagePurchaseButton } from '@/components/credits/credit-package-purchase-button'

export default async function BuyCreditsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const [balanceResult, packagesResult] = await Promise.all([
    getUserCreditBalance(session.user.id),
    getCreditPackages(),
  ])

  const balance = balanceResult.data || {
    availableCredits: 0,
    totalCredits: 0,
    spentCredits: 0,
    bonusCredits: 0,
  }

  const packages = packagesResult.data || []

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Comprar Créditos</h1>
          <p className="text-muted-foreground mt-2">
            Compra créditos para acceder a cursos, planes y contenido premium
          </p>
        </div>

        {/* Balance Card */}
        <div className="max-w-md">
          <CreditBalanceCard balance={balance} />
        </div>

        {/* Packages Grid */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Paquetes Disponibles</h2>
          {packages.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground">
                No hay paquetes de créditos disponibles en este momento
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <CreditPackagePurchaseButton key={pkg.id} package={pkg} />
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="bg-muted p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold">¿Cómo funcionan los créditos?</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Compra créditos una vez y úsalos cuando quieras en cualquier curso, plan o producto
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Los créditos no expiran y puedes acumularlos sin límite</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>
                Obtén créditos bonus en paquetes especiales y promociones
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Gana créditos adicionales completando actividades y manteniendo rachas</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
