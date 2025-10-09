import React from 'react'
import { CalendarDays, Clock, Gift, Award, Users, Repeat } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditSource, CreditUsage } from '@/types/academic-period'
import { toast } from 'sonner'
import { getCurrentDate, isBeforeDate } from '@/lib/utils/date'

interface StudentCredit {
  id: string
  amount: number
  source: CreditSource
  isUsed: boolean
  usedFor?: CreditUsage
  expiryDate: Date
  createdAt: Date
}

interface StudentCreditsProps {
  credits: StudentCredit[]
  onUseCredit: (creditId: string, usage: CreditUsage) => Promise<void>
  isLoading?: boolean
}

// Función para obtener el nombre amigable de la fuente de crédito
const getCreditSourceName = (source: CreditSource): string => {
  const sourceNames: Record<CreditSource, string> = {
    [CreditSource.ROLLOVER]: 'Clases no utilizadas',
    [CreditSource.PERFECT_ATTENDANCE]: 'Asistencia perfecta',
    [CreditSource.MODULES_COMPLETION]: 'Módulos completados',
    [CreditSource.REFERRAL]: 'Referidos',
    [CreditSource.SPECIAL_WEEK]: 'Semana especial',
    [CreditSource.RENEWAL]: 'Renovación consecutiva',
    [CreditSource.ADMIN_GRANT]: 'Otorgado por administrador',
  }

  return sourceNames[source] || source
}

// Función para obtener el ícono basado en la fuente
const getCreditSourceIcon = (source: CreditSource) => {
  const icons = {
    [CreditSource.ROLLOVER]: <CalendarDays size={16} />,
    [CreditSource.PERFECT_ATTENDANCE]: <Clock size={16} />,
    [CreditSource.MODULES_COMPLETION]: <Award size={16} />,
    [CreditSource.REFERRAL]: <Users size={16} />,
    [CreditSource.SPECIAL_WEEK]: <Gift size={16} />,
    [CreditSource.RENEWAL]: <Repeat size={16} />,
    [CreditSource.ADMIN_GRANT]: <Award size={16} />,
  }

  return icons[source] || <Gift size={16} />
}

// Función para obtener el nombre amigable del uso del crédito
const getCreditUsageName = (usage: CreditUsage): string => {
  const usageNames: Record<CreditUsage, string> = {
    [CreditUsage.CLASS]: 'Clase adicional',
    [CreditUsage.DISCOUNT]: 'Descuento en renovación',
    [CreditUsage.MATERIALS]: 'Materiales exclusivos',
    [CreditUsage.GROUP_SESSION]: 'Sesión grupal',
    [CreditUsage.PREMIUM_TEACHER]: 'Profesor premium',
  }

  return usageNames[usage] || usage
}

const StudentCredits: React.FC<StudentCreditsProps> = ({
  credits,
  onUseCredit,
  isLoading = false,
}) => {
  const now = getCurrentDate()
  const activeCredits = credits.filter((c) => !c.isUsed && !isBeforeDate(c.expiryDate, now))
  const usedCredits = credits.filter((c) => c.isUsed)
  const expiredCredits = credits.filter((c) => !c.isUsed && isBeforeDate(c.expiryDate, now))

  const handleUseCredit = async (creditId: string, usage: CreditUsage) => {
    try {
      await onUseCredit(creditId, usage)
      toast.success(`Crédito canjeado por: ${getCreditUsageName(usage)}`)
    } catch (error: unknown) {
      // Using error in the toast message or console.log to fix the unused variable warning
      console.error('Error al canjear el crédito:', error)
      toast.error('Error al canjear el crédito. Inténtalo nuevamente.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tus Créditos Disponibles</CardTitle>
          <CardDescription>
            Créditos activos que puedes utilizar para mejorar tu experiencia de aprendizaje
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-muted rounded-md p-4">
              <div className="text-3xl font-bold">{activeCredits.length}</div>
              <div className="text-sm text-muted-foreground">Créditos disponibles</div>
            </div>
            <div className="bg-muted rounded-md p-4">
              <div className="text-3xl font-bold">{usedCredits.length}</div>
              <div className="text-sm text-muted-foreground">Créditos utilizados</div>
            </div>
          </div>

          {activeCredits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeCredits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell className="flex items-center gap-2">
                      {getCreditSourceIcon(credit.source)}
                      {getCreditSourceName(credit.source)}
                    </TableCell>
                    <TableCell>{credit.amount}</TableCell>
                    <TableCell>{new Date(credit.expiryDate).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUseCredit(credit.id, CreditUsage.CLASS)}
                          disabled={isLoading}
                        >
                          Clase extra
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUseCredit(credit.id, CreditUsage.MATERIALS)}
                          disabled={isLoading}
                        >
                          Materiales
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No tienes créditos disponibles en este momento.
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-4">
          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium mb-2">Formas de ganar créditos:</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>Asiste a todas tus clases del período (2 créditos)</li>
              <li>Completa todos los módulos asignados (1 crédito)</li>
              <li>Invita amigos a Lingowow (2 créditos por referido)</li>
              <li>Participa en las semanas especiales (1 crédito)</li>
              <li>Renueva tu suscripción consecutivamente (2 créditos cada 3 períodos)</li>
            </ul>
          </div>
        </CardFooter>
      </Card>

      {(usedCredits.length > 0 || expiredCredits.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Créditos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...usedCredits, ...expiredCredits].map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell>{new Date(credit.createdAt).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell className="flex items-center gap-2">
                      {getCreditSourceIcon(credit.source)}
                      {getCreditSourceName(credit.source)}
                    </TableCell>
                    <TableCell>
                      {credit.isUsed ? (
                        <Badge variant="default">Utilizado</Badge>
                      ) : (
                        <Badge variant="destructive">Expirado</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {credit.isUsed && credit.usedFor
                        ? `Canjeado por: ${getCreditUsageName(credit.usedFor)}`
                        : 'No utilizado'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StudentCredits
