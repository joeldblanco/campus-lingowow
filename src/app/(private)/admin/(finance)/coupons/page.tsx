import { getCoupons } from '@/lib/actions/commercial'
import { CouponsTable } from '@/components/admin/coupons/coupons-table'
import { CreateCouponDialog } from '@/components/admin/coupons/create-coupon-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gestión de Cupones | Admin | Lingowow',
  description: 'Administra los cupones de descuento de la plataforma',
}

const CouponsAdminPage = async () => {
  const coupons = await getCoupons()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Cupones</h1>
          <p className="text-muted-foreground">
            Administra los cupones de descuento de la plataforma.
          </p>
        </div>
        <CreateCouponDialog>
          <Button className="bg-primary hover:bg-primary/80 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cupón
          </Button>
        </CreateCouponDialog>
      </div>
      
      <CouponsTable coupons={coupons} />
    </div>
  )
}

export default CouponsAdminPage
