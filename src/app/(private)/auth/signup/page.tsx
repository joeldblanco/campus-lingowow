'use client'

import { RegisterForm } from '@/components/auth/register-form'
import { ReCaptchaProvider } from '@/components/providers/recaptcha-provider'

const SignUpPage = () => {
  return (
    <ReCaptchaProvider>
      <RegisterForm />
    </ReCaptchaProvider>
  )
}

export default SignUpPage
