import { notFound } from 'next/navigation'
import { getProductById } from '@/lib/actions/commercial'
import { ProductCheckout } from '@/components/checkout/product-checkout'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'

interface CheckoutPageProps {
  params: Promise<{
    productId: string
  }>
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { productId } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/checkout/' + productId)
  }

  const product = await getProductById(productId)
  
  if (!product) {
    notFound()
  }

  // Course details will be fetched on the client side if needed
  // We only pass the courseId and let the client handle the rest
  const courseData = product.courseId ? {
    id: product.courseId,
    title: 'Curso Asociado',
    description: 'Descripción del curso disponible después de la compra',
    level: 'Nivel del curso'
  } : undefined

  // Transformar el producto para el componente
  const productData = {
    id: product.id,
    name: product.name,
    description: product.description || '',
    price: product.price,
    requiresScheduling: product.requiresScheduling || false,
    courseId: product.courseId,
    maxScheduleSlots: product.maxScheduleSlots || 1,
    scheduleDuration: product.scheduleDuration || 60,
    course: courseData
  }

  interface PurchaseCompleteData {
    purchase: {
      id: string;
      status: string;
      scheduledDate: Date | null;
    };
    scheduled: boolean;
    enrolled: boolean;
  }

  const handlePurchaseComplete = (result: PurchaseCompleteData) => {
    console.log('Purchase completed:', result);
    // Aquí puedes agregar lógica adicional como analytics, notificaciones, etc.
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ProductCheckout
        product={productData}
        userId={session.user.id}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  )
}
