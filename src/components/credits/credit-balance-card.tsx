'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Coins, Plus, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface CreditBalanceCardProps {
  balance: {
    availableCredits: number
    totalCredits: number
    spentCredits: number
    bonusCredits: number
  }
}

export function CreditBalanceCard({ balance }: CreditBalanceCardProps) {
  return (
    <Card className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Coins className="h-5 w-5" />
          Balance de Créditos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-bold">{balance.availableCredits}</span>
            <span className="text-xl opacity-90">créditos</span>
          </div>
          <p className="text-sm opacity-90">disponibles para usar</p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs opacity-75">Total</p>
            <p className="text-lg font-semibold">{balance.totalCredits}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Gastados</p>
            <p className="text-lg font-semibold">{balance.spentCredits}</p>
          </div>
          <div>
            <p className="text-xs opacity-75">Bonus</p>
            <p className="text-lg font-semibold">{balance.bonusCredits}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button asChild className="flex-1 bg-white text-blue-600 hover:bg-gray-100">
            <Link href="/credits/buy">
              <Plus className="h-4 w-4 mr-2" />
              Comprar Créditos
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="flex-1 border-white text-white hover:bg-white/10"
          >
            <Link href="/credits/history">
              <TrendingUp className="h-4 w-4 mr-2" />
              Historial
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
