import { auth } from '@/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/providers/providers'
import { CurrentClassProvider } from '@/context/current-class'
// import { FloatingChat } from '@/components/floating-chat/FloatingChat'
import { cookies } from 'next/headers'

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <>
      <Providers defaultOpen={defaultOpen}>
        <ImpersonationBanner />
        <CurrentClassProvider>
          {session && (
            <>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                  </div>
                  <div className="flex items-center gap-2 px-4">
                    <NotificationDropdown />
                  </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
              </SidebarInset>
              {/* <FloatingChat userId={session.user.id || ''} /> */}
            </>
          )}

          {!session && <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>}
        </CurrentClassProvider>
      </Providers>
      <Toaster richColors theme="light" />
    </>
  )
}
