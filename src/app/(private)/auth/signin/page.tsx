'use client'

import { LoginForm } from '@/components/auth/login-form'
import { useCheckoutRedirect } from '@/hooks/use-checkout-redirect'

export default function SignInPage() {
  useCheckoutRedirect()

  return <LoginForm />
}
