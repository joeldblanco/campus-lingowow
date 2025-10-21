import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getCreditTransactions, getUserCreditBalance } from '@/lib/actions/credits'
import { CreditBalanceCard } from '@/components/credits/credit-balance-card'
import { CreditTransactionList } from '@/components/credits/credit-transaction-list'

export default async function CreditHistoryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const [balanceResult, transactionsResult] = await Promise.all([
    getUserCreditBalance(session.user.id),
    getCreditTransactions(session.user.id, { limit: 50 }),
  ])

  const balance = balanceResult.data || {
    availableCredits: 0,
    totalCredits: 0,
    spentCredits: 0,
    bonusCredits: 0,
  }

  const transactions = transactionsResult.data?.transactions || []

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Historial de Créditos</h1>
          <p className="text-muted-foreground mt-2">
            Revisa todas tus transacciones de créditos
          </p>
        </div>

        {/* Balance Card */}
        <div className="max-w-md">
          <CreditBalanceCard balance={balance} />
        </div>

        {/* Transactions List */}
        <CreditTransactionList transactions={transactions} />
      </div>
    </div>
  )
}
