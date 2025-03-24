'use client'

import { useEffect } from 'react'
import { handleLogoutAction } from '../actions'

const SignOutPage = () => {
  useEffect(() => {
    handleLogoutAction()
  }, [])
  return <div className="flex w-full items-center justify-center h-full">Cerrando sesión...</div>
}

export default SignOutPage
