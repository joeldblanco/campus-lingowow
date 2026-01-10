import { CalendarSettingsView } from '@/components/admin/calendar/calendar-settings-view'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Configuración de Calendario | Admin | Lingowow',
  description: 'Configura los ajustes del calendario académico',
}

export default function CalendarSettingsPage() {
  return <CalendarSettingsView />
}
