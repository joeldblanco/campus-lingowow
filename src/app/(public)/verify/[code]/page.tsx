import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Verificación de Resultados - Lingowow',
    description: 'Verifica la autenticidad de los resultados del examen',
  }
}

export default function VerifyRedirectPage() {
  // Redirigir automáticamente a la página principal de verificación
  redirect('/verify')
}
