import { auth } from '@/auth'
import { Toaster } from '@/components/ui/sonner'
import { CurrentClassProvider } from '@/context/current-class'
import { ClassroomProviders } from './providers'

export default async function ClassroomLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  return (
    <ClassroomProviders>
      <CurrentClassProvider>
        {session ? (
          <div className="h-screen w-screen overflow-hidden">{children}</div>
        ) : (
          <div className="flex flex-1 flex-col">{children}</div>
        )}
      </CurrentClassProvider>
      <Toaster richColors theme="light" />
    </ClassroomProviders>
  )
}
