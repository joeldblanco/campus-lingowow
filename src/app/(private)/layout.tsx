import { auth } from '@/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { ImpersonationBanner } from '@/components/impersonation-banner'
import { GuestExamBanner } from '@/components/guest-exam-banner'
import { NotificationDropdown } from '@/components/notifications/notification-dropdown'
import { TourHeaderButton } from '@/components/tour'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/providers/providers'
import { CurrentClassProvider } from '@/context/current-class'
import { PageTracker } from '@/components/page-tracker'
// import { FloatingChat } from '@/components/floating-chat/FloatingChat'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { Flame } from 'lucide-react'

export default async function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  let streakDays = 0
  const isStudent = session?.user?.roles?.includes('STUDENT')
  if (isStudent && session?.user?.id) {
    try {
      const userStreak = await db.userStreak.findUnique({
        where: { userId: session.user.id },
        select: { currentStreak: true },
      })
      streakDays = userStreak?.currentStreak || 0
    } catch (err) {
      console.error('Error fetching user streak in layout:', err)
    }
  }

  const daysData = []
  if (isStudent && session?.user?.id) {
    const now = new Date()
    const daysOfWeekAbbrev = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    for (let i = -3; i <= 3; i++) {
      const d = new Date()
      d.setDate(now.getDate() + i)
      const dayIndex = d.getDay()
      const label = daysOfWeekAbbrev[dayIndex]
      const isToday = i === 0
      const hasStreak = i <= 0 && streakDays >= Math.abs(i) + 1
      daysData.push({
        label,
        isToday,
        hasStreak,
        dateStr: d.toDateString()
      })
    }
  }

  return (
    <>
      <Providers defaultOpen={defaultOpen}>
        <ImpersonationBanner />
        <CurrentClassProvider>
          {session && (
            <>
              <AppSidebar />
              <PageTracker />
              <SidebarInset>
                {session?.user?.id && <GuestExamBanner userId={session.user.id} />}
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                  </div>
                  <div className="flex items-center gap-3 px-4">
                    <TourHeaderButton />
                    {isStudent && (
                      <div className="relative group">
                        <div className="flex items-center gap-1.5 bg-orange-50/50 dark:bg-orange-950/10 border border-orange-200/50 dark:border-orange-900/10 px-3 py-1 rounded-full text-orange-600 dark:text-orange-400 font-bold text-sm cursor-pointer select-none">
                          <Flame className={`w-4 h-4 ${streakDays > 0 ? 'fill-orange-500 text-orange-500 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`} />
                          <span className={streakDays > 0 ? '' : 'text-slate-500 dark:text-slate-400'}>{streakDays}</span>
                        </div>
                        
                        <div className="absolute right-0 top-full mt-2 w-72 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5 font-lexend">
                            <Flame className="w-4 h-4 text-orange-500 fill-current" />
                            Tu racha de aprendizaje
                          </h4>
                          <div className="grid grid-cols-7 gap-1 mb-4 text-center">
                            {daysData.map((d) => (
                              <div key={d.dateStr} className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">{d.label}</span>
                                <div className={`size-7 rounded-full flex items-center justify-center ${
                                  d.isToday 
                                    ? 'ring-2 ring-orange-500 bg-orange-500/10' 
                                    : ''
                                }`}>
                                  {d.hasStreak ? (
                                    <Flame className="w-4 h-4 text-orange-500 fill-current" />
                                  ) : (
                                    <div className="size-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                                  )}
                                </div>
                                {d.isToday && <span className="text-[8px] font-bold text-orange-500">hoy</span>}
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-medium font-lexend">
                            Realiza actividades diarias para mantener tu racha.
                          </div>
                        </div>
                      </div>
                    )}
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
