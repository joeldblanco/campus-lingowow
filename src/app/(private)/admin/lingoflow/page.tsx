import { redirect } from 'next/navigation'
import { Target, Users } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { auth } from '@/auth'
import { LingoFlowDrafts } from '@/components/admin/lingoflow/lingoflow-drafts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getLingoFlowReadModel } from '@/lib/lingoflow/read-model'

export default async function LingoFlowPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/signin?callbackUrl=/admin/lingoflow')
  if (!session.user.roles?.includes(UserRole.ADMIN)) redirect('/not-authorized')

  let model = null
  try {
    model = await getLingoFlowReadModel()
  } catch {
    // The dashboard remains available even when the read connection is unavailable.
  }

  return (
    <main className="mx-auto w-full max-w-6xl min-w-0 space-y-6 py-4" data-testid="lingoflow-dashboard">
      <header className="min-w-0 space-y-2">
        <p className="text-sm font-medium text-primary">Lingowow · herramienta interna</p>
        <h1 className="break-words font-display text-3xl font-semibold tracking-tight">LingoFlow</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Seguimiento de la meta de alumnos activos y borradores seguros para revisión administrativa.</p>
      </header>

      {model ? (
        <section className="grid min-w-0 gap-4 md:grid-cols-2" aria-label="Progreso hacia la meta">
          <Card className="min-w-0 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-display"><Users className="size-5 text-primary" />Alumnos activos</CardTitle>
              <CardDescription>Usuarios activos con rol STUDENT y al menos una inscripción ACTIVE.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold tabular-nums">{model.activeStudents}<span className="text-lg font-medium text-muted-foreground"> / {model.targetStudents}</span></p>
              <Progress value={model.progressPercent} className="mt-4" aria-label={`${model.progressPercent}% de la meta`} />
              <p className="mt-2 text-sm text-muted-foreground">{model.progressPercent}% de la meta · faltan {model.gap} alumnos</p>
            </CardContent>
          </Card>
          <Card className="min-w-0">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 font-display"><Target className="size-5 text-teal-700 dark:text-teal-300" />Contexto de adquisición</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p><strong>Canal principal declarado:</strong> referidos por WhatsApp.</p>
              <p><strong>Canal secundario declarado:</strong> Instagram.</p>
              <p className="text-muted-foreground">Newsletter es un opt-in separado; no se atribuyen números de adquisición en este panel.</p>
            </CardContent>
          </Card>
        </section>
      ) : (
        <Card><CardHeader><CardTitle>Lectura temporalmente no disponible</CardTitle><CardDescription>La pantalla sigue disponible. Reintenta cuando la conexión de solo lectura esté disponible.</CardDescription></CardHeader></Card>
      )}

      <LingoFlowDrafts />
      <p className="text-xs text-muted-foreground">Vista de solo lectura. No modifica datos operativos ni sincroniza información.</p>
    </main>
  )
}
