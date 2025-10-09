import { redirect } from 'next/navigation'

export default function PreciosPage() {
  // Redirigir a /shop (la tienda con los productos/planes)
  redirect('/shop')
}
