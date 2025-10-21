'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Gift,
  ShoppingBag,
  Award,
  RefreshCw,
  Settings,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface CreditTransaction {
  id: string
  transactionType: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: Date
  relatedEntityType: string | null
}

interface CreditTransactionListProps {
  transactions: CreditTransaction[]
}

const transactionIcons: Record<string, React.ReactNode> = {
  PURCHASE: <ArrowUpCircle className="h-5 w-5 text-green-500" />,
  SPEND_PRODUCT: <ShoppingBag className="h-5 w-5 text-red-500" />,
  SPEND_PLAN: <ShoppingBag className="h-5 w-5 text-red-500" />,
  SPEND_COURSE: <ShoppingBag className="h-5 w-5 text-red-500" />,
  BONUS: <Gift className="h-5 w-5 text-purple-500" />,
  REWARD: <Award className="h-5 w-5 text-yellow-500" />,
  REFUND: <RefreshCw className="h-5 w-5 text-blue-500" />,
  ADMIN_ADJUSTMENT: <Settings className="h-5 w-5 text-gray-500" />,
  EXPIRED: <ArrowDownCircle className="h-5 w-5 text-gray-400" />,
}

const transactionLabels: Record<string, string> = {
  PURCHASE: 'Compra',
  SPEND_PRODUCT: 'Compra de Producto',
  SPEND_PLAN: 'Compra de Plan',
  SPEND_COURSE: 'Compra de Curso',
  BONUS: 'Bonificación',
  REWARD: 'Recompensa',
  REFUND: 'Reembolso',
  ADMIN_ADJUSTMENT: 'Ajuste',
  EXPIRED: 'Expirado',
}

export function CreditTransactionList({ transactions }: CreditTransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay transacciones aún</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Transacciones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                {transactionIcons[transaction.transactionType] || (
                  <ArrowUpCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-medium">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {transactionLabels[transaction.transactionType] || transaction.transactionType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(transaction.createdAt), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p
                className={`text-lg font-bold ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {transaction.amount > 0 ? '+' : ''}
                {transaction.amount}
              </p>
              <p className="text-xs text-muted-foreground">
                Balance: {transaction.balanceAfter}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
