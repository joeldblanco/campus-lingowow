import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/providers/providers'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Lingowow',
  description: 'Go wow with us!',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers defaultOpen={defaultOpen}>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">{children}</div>
        </Providers>
        <Toaster richColors theme="light" />
      </body>
    </html>
  )
}
