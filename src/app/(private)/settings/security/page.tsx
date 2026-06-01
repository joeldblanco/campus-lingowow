import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { TwoFactorSettings } from '@/components/account/two-factor-settings'

export const metadata = {
  title: 'Seguridad | Lingowow',
}

export default async function SecuritySettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin')

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Seguridad</h1>
        <p className="text-muted-foreground">Gestiona la seguridad de tu cuenta.</p>
      </div>
      <TwoFactorSettings />
    </div>
  )
}
