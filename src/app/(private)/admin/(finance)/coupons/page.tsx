import { getCoupons } from '@/lib/actions/commercial'
import { CouponsTable } from '@/components/admin/coupons/coupons-table'
import { CreateCouponDialog } from '@/components/admin/coupons/create-coupon-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

const CouponsAdminPage = async () => {
  const coupons = await getCoupons()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Cupones</h1>
        <CreateCouponDialog>
          <Button>
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
