import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics | Admin',
  description: 'Módulo de análisis y proyecciones financieras',
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
