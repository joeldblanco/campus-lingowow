import type { Metadata } from 'next'
import { Geist_Mono, Nunito } from 'next/font/google'
import { HostingTelemetry } from '@/components/hosting-telemetry'
import Script from 'next/script'
import './globals.css'

const nunito = Nunito({
  variable: '--font-nunito',
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
      <body className={`${nunito.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
        <HostingTelemetry />
        <Script
          src="https://analytics.lingowow.com/script.js"
          data-website-id="f65fd393-39ca-4684-8ed7-c46f02971646"
          data-domains="lingowow.com,www.lingowow.com,nj6w4redxpt9l33334vmqrgg.137.184.8.53.sslip.io"
          data-exclude-search="true"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
