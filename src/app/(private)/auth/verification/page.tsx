'use client'

import VerificationForm from '@/components/auth/verification-form'
import { useSearchParams } from 'next/navigation'

const EmailVerification = () => {
  const searchParams = useSearchParams()

  const email = searchParams.get('email')

  return <VerificationForm email={email} />
}

export default EmailVerification
