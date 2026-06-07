import type { Metadata } from 'next'
import { Geist, Geist_Mono, Fredoka } from 'next/font/google'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// Playful display face (rounded). Replaces Lexend; `font-lexend` is aliased to
// this variable in tailwind.config.ts for back-compat.
const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Lingowow',
  description: 'Go wow with us!',
  icons: {
    icon: '/branding/lw_logo_favicon.ico',
    shortcut: '/branding/lw_logo_favicon.ico',
    apple: '/branding/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} antialiased`}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
