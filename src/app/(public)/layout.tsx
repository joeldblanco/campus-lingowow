import { ImpersonationBanner } from '@/components/impersonation-banner'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/providers/providers'
import { cookies } from 'next/headers'

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <>
      <Providers defaultOpen={defaultOpen}>
        <ImpersonationBanner />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
      </Providers>
      <Toaster richColors theme="light" />
    </>
  )
}
