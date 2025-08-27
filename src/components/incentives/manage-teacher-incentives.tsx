import React, { useState } from 'react'
import {
  AreaChart,
  BadgeDollarSign,
  Check,
  ChevronDown,
  Filter,
  Search,
  User,
  X,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IncentiveType } from '@/types/academic-period'
import { toast } from 'sonner'

interface TeacherIncentive {
  id: string
  teacherId: string
  teacherName: string
  periodId: string
  periodName: string
  type: IncentiveType
  percentage: number
  baseAmount: number
  bonusAmount: number
  paid: boolean
  paidAt?: Date
}

interface ManageTeacherIncentivesProps {
  incentives: TeacherIncentive[]
  periods: { id: string; name: string }[]
  onProcessIncentives: (incentiveIds: string[]) => Promise<void>
}

const ManageTeacherIncentives: React.FC<ManageTeacherIncentivesProps> = ({
  incentives,
  periods,
  onProcessIncentives,
}) => {
  const [selectedIncentives, setSelectedIncentives] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('pending')
  const [filterType, setFilterType] = useState<string>('all')
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState<boolean>(false)

  // Filtramos los incentivos
  const filteredIncentives = incentives.filter((incentive) => {
    const matchesSearch = incentive.teacherName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPeriod = filterPeriod === 'all' || incentive.periodId === filterPeriod
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && !incentive.paid) ||
      (filterStatus === 'paid' && incentive.paid)
    const matchesType = filterType === 'all' || incentive.type === filterType

    return matchesSearch && matchesPeriod && matchesStatus && matchesType
  })

  // Calculamos totales
  const totalSelected = selectedIncentives.reduce((sum, id) => {
    const incentive = incentives.find((i) => i.id === id)
    return sum + (incentive ? incentive.bonusAmount : 0)
  }, 0)

  const totalPending = incentives.filter((i) => !i.paid).reduce((sum, i) => sum + i.bonusAmount, 0)

  // Función para manejar la selección de todos los incentivos
  const handleSelectAll = () => {
    if (selectedIncentives.length === filteredIncentives.length) {
      setSelectedIncentives([])
    } else {
      setSelectedIncentives(filteredIncentives.map((i) => i.id))
    }
  }

  // Función para procesar los incentivos seleccionados
  const handleProcessIncentives = async () => {
    try {
      await onProcessIncentives(selectedIncentives)
      toast.success(`Se han procesado ${selectedIncentives.length} incentivos correctamente.`)
      setSelectedIncentives([])
      setIsProcessDialogOpen(false)
    } catch (error: unknown) {
      console.error('Error al procesar los incentivos:', error)
      toast.error('Error al procesar los incentivos. Inténtalo nuevamente.')
    }
  }

  // Función para obtener el nombre del tipo de incentivo
  const getIncentiveTypeName = (type: IncentiveType): string => {
    const typeNames: Record<IncentiveType, string> = {
      [IncentiveType.RETENTION]: 'Retención',
      [IncentiveType.PERFECT_ATTENDANCE]: 'Asistencia perfecta',
      [IncentiveType.SPECIAL_ACTIVITIES]: 'Actividades especiales',
      [IncentiveType.RANK_BONUS]: 'Bono por rango',
      [IncentiveType.GROWTH]: 'Crecimiento',
    }

    return typeNames[type] || type
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Gestión de Incentivos</CardTitle>
          <CardDescription>Administra y procesa los incentivos para profesores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Total Seleccionado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${totalSelected.toFixed(2)}</div>
                  <Badge>{selectedIncentives.length} incentivos</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
                  <Badge variant="outline">
                    {incentives.filter((i) => !i.paid).length} incentivos
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-4">
                <CardTitle className="text-sm font-medium">Acciones</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setIsProcessDialogOpen(true)}
                  disabled={selectedIncentives.length === 0}
                  className="w-full"
                >
                  <BadgeDollarSign className="mr-2 h-4 w-4" />
                  Procesar Seleccionados
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative grow">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de profesor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Período" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los períodos</SelectItem>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-[150px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Estado" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="paid">Pagados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <div className="flex items-center">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tipo" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value={IncentiveType.RETENTION}>Retención</SelectItem>
                <SelectItem value={IncentiveType.PERFECT_ATTENDANCE}>
                  Asistencia perfecta
                </SelectItem>
                <SelectItem value={IncentiveType.SPECIAL_ACTIVITIES}>
                  Actividades especiales
                </SelectItem>
                <SelectItem value={IncentiveType.RANK_BONUS}>Bono por rango</SelectItem>
                <SelectItem value={IncentiveType.GROWTH}>Crecimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          selectedIncentives.length === filteredIncentives.length &&
                          filteredIncentives.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Bonificación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIncentives.length > 0 ? (
                  filteredIncentives.map((incentive) => (
                    <TableRow key={incentive.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIncentives.includes(incentive.id)}
                          onChange={() => {
                            if (selectedIncentives.includes(incentive.id)) {
                              setSelectedIncentives(
                                selectedIncentives.filter((id) => id !== incentive.id)
                              )
                            } else {
                              setSelectedIncentives([...selectedIncentives, incentive.id])
                            }
                          }}
                          disabled={incentive.paid}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell className="font-medium flex items-center gap-2">
                        <User size={16} className="text-muted-foreground" />
                        {incentive.teacherName}
                      </TableCell>
                      <TableCell>{incentive.periodName}</TableCell>
                      <TableCell>{getIncentiveTypeName(incentive.type)}</TableCell>
                      <TableCell>{incentive.percentage}%</TableCell>
                      <TableCell>${incentive.baseAmount.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        ${incentive.bonusAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {incentive.paid ? (
                          <Badge className="bg-green-500 flex items-center gap-1">
                            <Check size={12} />
                            Pagado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <X size={12} />
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <ChevronDown size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {!incentive.paid && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedIncentives([incentive.id])
                                  setIsProcessDialogOpen(true)
                                }}
                              >
                                <BadgeDollarSign className="mr-2 h-4 w-4" />
                                Procesar Pago
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                // Mostrar detalles
                              }}
                            >
                              <AreaChart className="mr-2 h-4 w-4" />
                              Ver Detalles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                      No hay incentivos que coincidan con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="justify-between flex-wrap gap-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredIncentives.length} de {incentives.length} incentivos
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setFilterPeriod('all')
                setFilterStatus('pending')
                setFilterType('all')
              }}
              size="sm"
            >
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>

            <Button
              onClick={() => setIsProcessDialogOpen(true)}
              disabled={selectedIncentives.length === 0}
              size="sm"
            >
              <BadgeDollarSign className="mr-2 h-4 w-4" />
              Procesar ({selectedIncentives.length})
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Diálogo de confirmación para procesar incentivos */}
      <AlertDialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Procesar Incentivos</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de procesar {selectedIncentives.length} incentivos por un valor total de
              ${totalSelected.toFixed(2)}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcessIncentives}>
              Confirmar Proceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ManageTeacherIncentives
