'use client'

import { useState } from 'react'
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Eye, CreditCard, Building, DollarSign, Smartphone, Mail, CheckCircle, Clock } from 'lucide-react'
import { getUserAvatarUrl } from '@/lib/utils'
import type { TeacherPaymentDetail } from '@/lib/actions/teacher-payments'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Input } from '@/components/ui/input'

interface PaymentDetailsProps {
  paymentMethod?: string
  paymentDetails?: string
}

function PaymentDetailsDisplay({ paymentMethod, paymentDetails }: PaymentDetailsProps) {
  if (!paymentMethod || paymentMethod === 'No configurado') {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-4 w-4" />
        <span className="text-sm">No configurado</span>
      </div>
    )
  }

  // Parsear los detalles para mostrarlos estructuradamente
  const parsePaymentDetails = (method: string, details: string) => {
    switch (method) {
      case 'Transferencia Bancaria':
        const bankParts = details.split(' - ')
        return {
          icon: Building,
          fields: [
            { label: 'Banco', value: bankParts[0] || '' },
            { label: 'Titular', value: bankParts.find(p => p.startsWith('Titular:'))?.replace('Titular: ', '') || '' },
            { label: 'Cuenta', value: bankParts.find(p => p.startsWith('Cta:'))?.replace('Cta: ', '') || '' },
            { label: 'CCI', value: bankParts.find(p => p.startsWith('CCI:'))?.replace('CCI: ', '') || '' },
          ]
        }
      case 'PayPal':
        return {
          icon: Mail,
          fields: [
            { label: 'Email PayPal', value: details }
          ]
        }
      case 'Binance':
        const binanceParts = details.split(' - ')
        return {
          icon: DollarSign,
          fields: [
            { label: 'Email', value: binanceParts.find(p => p.startsWith('Email:'))?.replace('Email: ', '') || '' },
            { label: 'ID', value: binanceParts.find(p => p.startsWith('ID:'))?.replace('ID: ', '') || '' },
          ]
        }
      case 'Pago Móvil':
        const pmParts = details.split(' - ')
        return {
          icon: Smartphone,
          fields: [
            { label: 'Banco', value: pmParts[0] || '' },
            { label: 'Teléfono', value: pmParts.find(p => p.startsWith('Tel:'))?.replace('Tel: ', '') || '' },
            { label: 'CI', value: pmParts.find(p => p.startsWith('CI:'))?.replace('CI: ', '') || '' },
          ]
        }
      default:
        return {
          icon: CreditCard,
          fields: [
            { label: 'Método', value: method },
            { label: 'Detalles', value: details }
          ]
        }
    }
  }

  const { icon: Icon, fields } = parsePaymentDetails(paymentMethod, paymentDetails || '')

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium">{paymentMethod}</span>
      </div>
      <div className="grid gap-1">
        {fields.map((field, index) => (
          field.value && (
            <div key={index} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">{field.label}:</span>
              <Input 
                value={field.value} 
                disabled 
                className="h-6 text-xs bg-muted/50 border-0"
                readOnly
              />
            </div>
          )
        ))}
      </div>
    </div>
  )
}

interface TeacherPaymentsTableProps {
  data: TeacherPaymentDetail[]
  title?: string
  description?: string
}

export function TeacherPaymentsTable({
  data,
  title = 'Pagos por Profesor',
  description = 'Desglose detallado de pagos del período seleccionado',
}: TeacherPaymentsTableProps) {
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherPaymentDetail | null>(null)

  const toggleExpand = (teacherId: string) => {
    setExpandedTeacher(expandedTeacher === teacherId ? null : teacherId)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Rango</TableHead>
                <TableHead>Método de Pago</TableHead>
                <TableHead className="text-right">Clases</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Pago Total</TableHead>
                <TableHead className="text-right">Promedio/Clase</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((teacher) => (
                <React.Fragment key={teacher.teacherId}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      {expandedTeacher === teacher.teacherId ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={getUserAvatarUrl(teacher.teacherId, teacher.teacherImage)}
                            alt={teacher.teacherName}
                          />
                          <AvatarFallback>
                            {teacher.teacherName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{teacher.teacherName}</p>
                          <p className="text-xs text-muted-foreground">{teacher.teacherEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.rankName ? (
                        <Badge variant="outline">{teacher.rankName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleExpand(teacher.teacherId)}>
                      <div className="flex items-center gap-2">
                        {teacher.paymentMethod === 'Transferencia Bancaria' && <Building className="h-4 w-4" />}
                        {teacher.paymentMethod === 'PayPal' && <Mail className="h-4 w-4" />}
                        {teacher.paymentMethod === 'Binance' && <DollarSign className="h-4 w-4" />}
                        {teacher.paymentMethod === 'Pago Móvil' && <Smartphone className="h-4 w-4" />}
                        {(!teacher.paymentMethod || teacher.paymentMethod === 'No configurado') && <CreditCard className="h-4 w-4" />}
                        <span className="text-sm">{teacher.paymentMethod || 'No configurado'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.totalClasses}
                    </TableCell>
                    <TableCell className="text-right" onClick={() => toggleExpand(teacher.teacherId)}>
                      {teacher.totalHours.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-right font-medium" onClick={() => toggleExpand(teacher.teacherId)}>
                      <div className="flex items-center justify-end gap-2">
                        <span className={teacher.paymentConfirmed ? 'text-green-600' : ''}>
                          ${teacher.totalPayment.toFixed(2)}
                        </span>
                        {teacher.paymentConfirmed && (
                          <div title="Pago confirmado por el profesor">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </div>
                        )}
                        {!teacher.paymentConfirmed && (
                          <div title="Pendiente de confirmación">
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground" onClick={() => toggleExpand(teacher.teacherId)}>
                      ${teacher.averagePerClass.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTeacher === teacher.teacherId && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <h4 className="font-semibold mb-3 text-sm">Clases del período</h4>
                          <div className="space-y-2">
                            {teacher.classes.map((classItem) => (
                              <div
                                key={classItem.id}
                                className="flex items-center justify-between p-3 bg-background rounded-lg border text-sm"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{classItem.courseName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Estudiante: {classItem.studentName}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {format(new Date(classItem.day), 'dd MMM yyyy', { locale: es })}
                                    </p>
                                    <p className="text-muted-foreground">{classItem.timeSlot}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-muted-foreground">{classItem.duration} min</p>
                                  </div>
                                  <div className="text-right min-w-[80px]">
                                    <p className="font-bold">${classItem.payment.toFixed(2)}</p>
                                  </div>
                                  {classItem.isPayable && (
                                    <Badge variant="default" className="text-xs">
                                      Pagable
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No hay datos de pagos para este período
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTeacher} onOpenChange={() => setSelectedTeacher(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Pagos - {selectedTeacher?.teacherName}</DialogTitle>
            <DialogDescription>
              Resumen completo de clases y pagos del período
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Clases</p>
                  <p className="text-2xl font-bold">{selectedTeacher.totalClasses}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total Horas</p>
                  <p className="text-2xl font-bold">{selectedTeacher.totalHours.toFixed(1)}h</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Pago Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${selectedTeacher.totalPayment.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Promedio/Clase</p>
                  <p className="text-2xl font-bold">${selectedTeacher.averagePerClass.toFixed(2)}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-3">Información de Pago</h4>
                <div className="space-y-3">
                  <PaymentDetailsDisplay 
                    paymentMethod={selectedTeacher.paymentMethod}
                    paymentDetails={selectedTeacher.paymentDetails}
                  />
                  {selectedTeacher.paymentConfirmed && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">Pago confirmado por el profesor</p>
                        {selectedTeacher.paymentConfirmedAt && (
                          <p className="text-xs text-green-700">
                            {format(new Date(selectedTeacher.paymentConfirmedAt), 'dd MMM yyyy HH:mm', { locale: es })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {!selectedTeacher.paymentConfirmed && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">Pendiente de confirmación</p>
                        <p className="text-xs text-amber-700">El profesor aún no ha confirmado este pago</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Clases Impartidas</h4>
                <div className="space-y-2">
                  {selectedTeacher.classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{classItem.courseName}</p>
                        <p className="text-sm text-muted-foreground">
                          Estudiante: {classItem.studentName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(classItem.day), "dd 'de' MMMM yyyy", { locale: es })} •{' '}
                          {classItem.timeSlot}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${classItem.payment.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{classItem.duration} minutos</p>
                        {classItem.isPayable && (
                          <Badge variant="default" className="text-xs mt-1">
                            Pagable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
